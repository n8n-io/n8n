/* eslint-disable import-x/order */
import { vi } from 'vitest';

vi.mock('fs', () => ({
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
}));

import { readdirSync, readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';

import { loadAgentEvalTestCasesWithFiles } from '../data/agents';

const mockedReaddir = vi.mocked(readdirSync);
const mockedReadFile = vi.mocked(readFileSync);

const FAKE_FILES = [
	'scheduled-weather-workflow.json',
	'agent-chatbot.json',
	'execute-now.json',
	'README.md',
];

const STUB_TEST_CASE = JSON.stringify({
	conversation: [{ role: 'user', text: 'stub' }],
	complexity: 'simple',
	tags: [],
	executionScenarios: [
		{
			name: 'happy-path',
			description: 'stub',
			dataSetup: 'stub',
			successCriteria: 'stub',
		},
	],
});

beforeEach(() => {
	vi.clearAllMocks();
	mockedReaddir.mockReturnValue(FAKE_FILES as unknown as ReturnType<typeof readdirSync>);
	mockedReadFile.mockReturnValue(STUB_TEST_CASE);
});

function slugs(filter?: string, exclude?: string): string[] {
	return loadAgentEvalTestCasesWithFiles(filter, exclude)
		.map((tc) => tc.fileSlug)
		.sort();
}

describe('loadAgentEvalTestCasesWithFiles', () => {
	it('returns every .json slug from agents/ when no filter or exclude is given', () => {
		expect(slugs()).toEqual(['agent-chatbot', 'execute-now', 'scheduled-weather-workflow']);
	});

	it('drops non-json files even without filtering', () => {
		expect(slugs()).not.toContain('README');
	});

	it('matches comma-separated filter tokens case-insensitively', () => {
		expect(slugs('Weather,CHATBOT')).toEqual(['agent-chatbot', 'scheduled-weather-workflow']);
	});

	it('applies exclude after filter', () => {
		expect(slugs('weather,execute', 'execute')).toEqual(['scheduled-weather-workflow']);
	});

	it('defaults datasets to ["full"] through the shared workflow schema', () => {
		const cases = loadAgentEvalTestCasesWithFiles();
		expect(cases.every((c) => c.testCase.datasets.includes('full'))).toBe(true);
	});

	it('filters to cases whose datasets array contains the tier', () => {
		mockedReadFile.mockImplementation((p) => {
			const filename = String(p);
			if (filename.includes('agent-chatbot')) {
				return JSON.stringify({
					...jsonParse(STUB_TEST_CASE),
					datasets: ['agents', 'full'],
				});
			}
			return STUB_TEST_CASE;
		});

		const result = loadAgentEvalTestCasesWithFiles(undefined, undefined, 'agents').map(
			(c) => c.fileSlug,
		);

		expect(result).toEqual(['agent-chatbot']);
	});

	it('throws when --tier matches no agent eval test cases', () => {
		expect(() => loadAgentEvalTestCasesWithFiles(undefined, undefined, 'missing')).toThrow(
			/No agent eval test cases match --tier "missing"/,
		);
	});

	it('rejects an invalid workflow-shaped case with the offending file name', () => {
		mockedReadFile.mockImplementation(() =>
			JSON.stringify({ ...jsonParse(STUB_TEST_CASE), executionScenarios: [] }),
		);

		expect(() => loadAgentEvalTestCasesWithFiles()).toThrow(
			/Invalid agent eval test case .*scheduled-weather-workflow\.json/,
		);
	});

	it('rejects unknown extra fields because the shared schema is strict', () => {
		mockedReadFile.mockImplementation(() =>
			JSON.stringify({ ...jsonParse(STUB_TEST_CASE), unexpectedField: true }),
		);

		expect(() => loadAgentEvalTestCasesWithFiles()).toThrow(/unexpectedField/);
	});
});
