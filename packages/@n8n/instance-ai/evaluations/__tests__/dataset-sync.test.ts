jest.mock('../data/workflows', () => ({
	loadWorkflowTestCasesWithFiles: jest.fn(),
}));

import type { Client } from 'langsmith';
import type { Example } from 'langsmith/schemas';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import { syncDataset } from '../langsmith/dataset-sync';

const mockedLoad = jest.mocked(loadWorkflowTestCasesWithFiles);

function scenarioFixture(testCaseFile: string, scenarioName: string) {
	return {
		testCase: {
			prompt: `prompt for ${testCaseFile}`,
			complexity: 'medium' as const,
			tags: ['test'],
			triggerType: 'manual' as const,
			scenarios: [
				{
					name: scenarioName,
					description: `desc for ${scenarioName}`,
					dataSetup: `setup for ${scenarioName}`,
					successCriteria: `criteria for ${scenarioName}`,
				},
			],
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
			prompt: `prompt for ${testCaseFile}`,
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
		outputs: {},
		runs: [],
	} as unknown as Example;
}

type UpsertArg = Array<{ id: string; inputs: Record<string, unknown> }>;

function buildClient(existing: Example[] = []): {
	client: Client;
	createExamples: jest.Mock<Promise<void>, [UpsertArg]>;
	updateExamples: jest.Mock<Promise<void>, [UpsertArg]>;
	deleteExamples: jest.Mock<Promise<void>, [string[]]>;
} {
	const createExamples = jest.fn<Promise<void>, [UpsertArg]>().mockResolvedValue(undefined);
	const updateExamples = jest.fn<Promise<void>, [UpsertArg]>().mockResolvedValue(undefined);
	const deleteExamples = jest.fn<Promise<void>, [string[]]>().mockResolvedValue(undefined);

	async function* listExamples() {
		await Promise.resolve();
		for (const ex of existing) yield ex;
	}

	const client = {
		hasDataset: jest.fn().mockResolvedValue(true),
		readDataset: jest.fn().mockResolvedValue({ id: 'dataset-1' }),
		createDataset: jest.fn(),
		listExamples: jest.fn().mockImplementation(listExamples),
		createExamples,
		updateExamples,
		deleteExamples,
	} as unknown as Client;

	return { client, createExamples, updateExamples, deleteExamples };
}

const logger: EvalLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	verbose: jest.fn(),
} as unknown as EvalLogger;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('syncDataset', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
