/* eslint-disable import-x/order */
import { vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../data/workflows', () => ({
	loadWorkflowTestCasesWithFiles: vi.fn(),
}));

import type { Client } from 'langsmith';
import type { Example } from 'langsmith/schemas';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import { syncDataset } from '../langsmith/dataset-sync';

const mockedLoad = vi.mocked(loadWorkflowTestCasesWithFiles);

function scenarioFixture(testCaseFile: string, scenarioName: string) {
	return {
		testCase: {
			conversation: [{ role: 'user' as const, text: `prompt for ${testCaseFile}` }],
			complexity: 'medium' as const,
			tags: ['test'],
			triggerType: 'manual' as const,
			executionScenarios: [
				{
					name: scenarioName,
					description: `desc for ${scenarioName}`,
					dataSetup: `setup for ${scenarioName}`,
					successCriteria: `criteria for ${scenarioName}`,
				},
			],
			datasets: ['full'],
		},
		fileSlug: testCaseFile,
	};
}

function existingExample(id: string, testCaseFile: string, scenarioName: string): Example {
	return {
		id,
		dataset_id: 'dataset-1',
		created_at: '2024-01-01',
		modified_at: '2024-01-01',
		inputs: {
			testCaseFile,
			scenarioName,
			scenarioDescription: `desc for ${scenarioName}`,
			dataSetup: `setup for ${scenarioName}`,
			successCriteria: `criteria for ${scenarioName}`,
		},
		metadata: {
			testCaseFile,
			complexity: 'medium',
			tags: ['test'],
			triggerType: 'manual',
		},
		split: [testCaseFile, 'full'],
		outputs: {},
		runs: [],
	} as unknown as Example;
}

type UpsertArg = Array<{ id: string; inputs: Record<string, unknown> }>;

function buildClient(existing: Example[] = []): {
	client: Client;
	createExamples: Mock<(...args: [UpsertArg]) => Promise<void>>;
	updateExamples: Mock<(...args: [UpsertArg]) => Promise<void>>;
	deleteExamples: Mock<(...args: [string[]]) => Promise<void>>;
} {
	const createExamples = vi
		.fn<(...args: [UpsertArg]) => Promise<void>>()
		.mockResolvedValue(undefined);
	const updateExamples = vi
		.fn<(...args: [UpsertArg]) => Promise<void>>()
		.mockResolvedValue(undefined);
	const deleteExamples = vi
		.fn<(...args: [string[]]) => Promise<void>>()
		.mockResolvedValue(undefined);

	async function* listExamples() {
		await Promise.resolve();
		for (const ex of existing) yield ex;
	}

	const client = {
		hasDataset: vi.fn().mockResolvedValue(true),
		readDataset: vi.fn().mockResolvedValue({ id: 'dataset-1' }),
		createDataset: vi.fn(),
		listExamples: vi.fn().mockImplementation(listExamples),
		createExamples,
		updateExamples,
		deleteExamples,
	} as unknown as Client;

	return { client, createExamples, updateExamples, deleteExamples };
}

const logger: EvalLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	verbose: vi.fn(),
} as unknown as EvalLogger;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('syncDataset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates new examples with random UUIDs when they are not already in the dataset', async () => {
		mockedLoad.mockReturnValue([scenarioFixture('foo', 'happy-path')]);
		const { client, createExamples, updateExamples, deleteExamples } = buildClient([]);

		await syncDataset(client, 'ds', logger);

		expect(createExamples).toHaveBeenCalledTimes(1);
		expect(updateExamples).not.toHaveBeenCalled();
		expect(deleteExamples).not.toHaveBeenCalled();

		const created = createExamples.mock.calls[0][0];
		expect(created).toHaveLength(1);
		expect(created[0].id).toMatch(UUID_RE);
		expect(created[0].inputs).toMatchObject({ testCaseFile: 'foo', scenarioName: 'happy-path' });
	});

	it('updates existing examples in place when inputs change, preserving the existing UUID', async () => {
		const existingId = '11111111-2222-3333-4444-555555555555';
		const existing = existingExample(existingId, 'foo', 'happy-path');
		// Drift the existing inputs so diffing reports a change
		(existing.inputs as { successCriteria: string }).successCriteria = 'old criteria';

		mockedLoad.mockReturnValue([scenarioFixture('foo', 'happy-path')]);
		const { client, createExamples, updateExamples, deleteExamples } = buildClient([existing]);

		await syncDataset(client, 'ds', logger);

		expect(createExamples).not.toHaveBeenCalled();
		expect(deleteExamples).not.toHaveBeenCalled();
		expect(updateExamples).toHaveBeenCalledTimes(1);

		const updated = updateExamples.mock.calls[0][0];
		expect(updated[0].id).toBe(existingId);
	});

	it('never calls deleteExamples, even when a previously-synced scenario is no longer in the filesystem', async () => {
		const orphan = existingExample('orphan-uuid', 'gone-file', 'gone-scenario');
		mockedLoad.mockReturnValue([scenarioFixture('foo', 'happy-path')]);
		const { client, deleteExamples, createExamples } = buildClient([orphan]);

		await syncDataset(client, 'ds', logger);

		expect(deleteExamples).not.toHaveBeenCalled();
		// The present scenario should still be created
		expect(createExamples).toHaveBeenCalledTimes(1);
	});

	it('is a no-op when every current scenario matches an existing example', async () => {
		const existing = existingExample('stable-uuid', 'foo', 'happy-path');
		mockedLoad.mockReturnValue([scenarioFixture('foo', 'happy-path')]);
		const { client, createExamples, updateExamples, deleteExamples } = buildClient([existing]);

		await syncDataset(client, 'ds', logger);

		expect(createExamples).not.toHaveBeenCalled();
		expect(updateExamples).not.toHaveBeenCalled();
		expect(deleteExamples).not.toHaveBeenCalled();
	});

	it('writes datasets values into the example split alongside the file slug', async () => {
		const fixture = scenarioFixture('foo', 'happy-path');
		fixture.testCase.datasets = ['pr', 'full'];
		mockedLoad.mockReturnValue([fixture]);
		const { client, createExamples } = buildClient([]);

		await syncDataset(client, 'ds', logger);

		expect(createExamples).toHaveBeenCalledTimes(1);
		const created = createExamples.mock.calls[0][0];
		expect((created[0] as unknown as { split: string[] }).split).toEqual(['foo', 'pr', 'full']);
	});

	it('updates an existing example when only its split (tier membership) changed', async () => {
		const existing = existingExample('split-uuid', 'foo', 'happy-path'); // split: ['foo', 'full']
		const fixture = scenarioFixture('foo', 'happy-path');
		fixture.testCase.datasets = ['pr', 'full']; // now also tagged 'pr'
		mockedLoad.mockReturnValue([fixture]);
		const { client, createExamples, updateExamples } = buildClient([existing]);

		await syncDataset(client, 'ds', logger);

		expect(createExamples).not.toHaveBeenCalled();
		expect(updateExamples).toHaveBeenCalledTimes(1);
		expect((updateExamples.mock.calls[0][0][0] as unknown as { split: string[] }).split).toEqual([
			'foo',
			'pr',
			'full',
		]);
	});

	it('creates a fresh example when a previously-deleted scenario is re-added (resurrection path)', async () => {
		// Scenario was removed from the filesystem between earlier runs, so LangSmith
		// has no example for it now. Running the sync after re-adding the file must
		// create a fresh example with a new random UUID — no 409 possible.
		mockedLoad.mockReturnValue([scenarioFixture('foo', 'happy-path')]);
		const { client, createExamples } = buildClient([]);

		await syncDataset(client, 'ds', logger);

		expect(createExamples).toHaveBeenCalledTimes(1);
		const firstId = createExamples.mock.calls[0][0][0].id;
		expect(firstId).toMatch(UUID_RE);

		// A second pass (simulating the next run after the example persists) should
		// find-by-inputs and not re-create.
		const survivor = existingExample(firstId, 'foo', 'happy-path');
		const second = buildClient([survivor]);
		await syncDataset(second.client, 'ds', logger);
		expect(second.createExamples).not.toHaveBeenCalled();
	});
});
