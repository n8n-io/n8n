jest.mock('fs', () => ({
	readdirSync: jest.fn(),
	readFileSync: jest.fn(),
}));

import { readdirSync, readFileSync } from 'fs';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';

const mockedReaddir = jest.mocked(readdirSync);
const mockedReadFile = jest.mocked(readFileSync);

function makeTestCaseJson(binaryChecks?: unknown): string {
	return JSON.stringify({
		prompt: 'build it',
		complexity: 'simple',
		tags: ['t'],
		scenarios: [
			{
				name: 'happy-path',
				description: 'normal',
				dataSetup: 'webhook gets a submission',
				successCriteria: 'all good',
				...(binaryChecks !== undefined ? { binaryChecks } : {}),
			},
		],
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	mockedReaddir.mockReturnValue(['contact.json'] as unknown as ReturnType<typeof readdirSync>);
});

describe('loadWorkflowTestCasesWithFiles binary-check validation', () => {
	it('loads a fixture with no binaryChecks unchanged', () => {
		mockedReadFile.mockReturnValue(makeTestCaseJson());
		const result = loadWorkflowTestCasesWithFiles();
		expect(result).toHaveLength(1);
		expect(result[0].testCase.scenarios[0].binaryChecks).toBeUndefined();
	});

	it('loads a fixture with known binaryChecks', () => {
		// Pick names that are definitely in the registry.
		mockedReadFile.mockReturnValue(makeTestCaseJson(['has_nodes', 'all_nodes_connected']));
		const result = loadWorkflowTestCasesWithFiles();
		expect(result[0].testCase.scenarios[0].binaryChecks).toEqual([
			'has_nodes',
			'all_nodes_connected',
		]);
	});

	it('throws with file slug and scenario name when an unknown binary check is requested', () => {
		mockedReadFile.mockReturnValue(makeTestCaseJson(['this_check_does_not_exist']));
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/contact\.json/);
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/happy-path/);
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/this_check_does_not_exist/);
	});

	it('throws when binaryChecks is not an array of strings', () => {
		mockedReadFile.mockReturnValue(makeTestCaseJson(42 as unknown));
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/Invalid test case/);
	});

	it('throws with the offending file path on malformed JSON', () => {
		mockedReadFile.mockReturnValue('{ not json');
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/contact\.json/);
	});
});
