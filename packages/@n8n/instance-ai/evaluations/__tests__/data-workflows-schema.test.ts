/* eslint-disable import-x/order */
import { vi } from 'vitest';

vi.mock('fs', () => ({
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
}));

import { readdirSync, readFileSync } from 'fs';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import { WorkflowTestCaseSchema } from '../data/workflows/schema';

const mockedReaddir = vi.mocked(readdirSync);
const mockedReadFile = vi.mocked(readFileSync);

const validFixture = () => ({
	conversation: [{ role: 'user' as const, text: 'Build a thing' }],
	complexity: 'simple' as const,
	tags: ['test'],
	executionScenarios: [
		{
			name: 'happy-path',
			description: 'Normal',
			dataSetup: 'Webhook receives data',
			successCriteria: 'Workflow runs',
		},
	],
});

beforeEach(() => {
	vi.clearAllMocks();
	mockedReaddir.mockReturnValue(['demo.json'] as unknown as ReturnType<typeof readdirSync>);
});

describe('WorkflowTestCaseSchema', () => {
	it('accepts a minimal valid fixture', () => {
		const parsed = WorkflowTestCaseSchema.parse(validFixture());
		expect(parsed.executionScenarios).toHaveLength(1);
		expect(parsed.conversation[0].role).toBe('user');
	});

	it('rejects an empty conversation', () => {
		expect(() => WorkflowTestCaseSchema.parse({ ...validFixture(), conversation: [] })).toThrow();
	});

	it('rejects an empty executionScenarios array', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...validFixture(), executionScenarios: [] }),
		).toThrow();
	});

	it('rejects an unknown complexity value', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...validFixture(), complexity: 'gigantic' }),
		).toThrow();
	});

	it('accepts the optional triggerType field', () => {
		const parsed = WorkflowTestCaseSchema.parse({ ...validFixture(), triggerType: 'webhook' });
		expect(parsed.triggerType).toBe('webhook');
	});

	it('accepts the optional requires hint on scenarios', () => {
		const fixture = validFixture();
		fixture.executionScenarios[0] = {
			...fixture.executionScenarios[0],
			requires: 'mock-server',
		} as (typeof fixture.executionScenarios)[number];
		const parsed = WorkflowTestCaseSchema.parse(fixture);
		expect(parsed.executionScenarios[0].requires).toBe('mock-server');
	});
});

describe('loadWorkflowTestCasesWithFiles · file-aware errors', () => {
	it('loads a valid fixture and exposes the fileSlug', () => {
		mockedReadFile.mockReturnValue(JSON.stringify(validFixture()));
		const result = loadWorkflowTestCasesWithFiles();
		expect(result).toHaveLength(1);
		expect(result[0].fileSlug).toBe('demo');
	});

	it('throws with the file path on malformed JSON', () => {
		mockedReadFile.mockReturnValue('{ not json');
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/demo\.json/);
	});

	it('throws with the file path on a schema validation failure', () => {
		mockedReadFile.mockReturnValue(JSON.stringify({ conversation: [] }));
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/demo\.json/);
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/executionScenarios/);
	});
});
