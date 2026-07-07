/* eslint-disable import-x/order */
import { vi } from 'vitest';

vi.mock('fs', () => ({
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
}));

import { readdirSync, readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';

import { parseCliArgs } from '../cli/args';
import { loadTestCases } from '../data/source';
import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';

const mockedReaddir = vi.mocked(readdirSync);
const mockedReadFile = vi.mocked(readFileSync);

const logger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const FAKE_FILES = [
	'contact-form-automation.json',
	'cross-team-linear-report.json',
	'daily-slack-summary.json',
	'form-to-hubspot.json',
	'github-notion-sync.json',
	'weather-monitoring.json',
	'weather-alert.json',
	'README.md', // non-json filtered out
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
	return loadWorkflowTestCasesWithFiles(filter, exclude)
		.map((tc) => tc.fileSlug)
		.sort();
}

describe('loadWorkflowTestCasesWithFiles', () => {
	it('returns every .json slug from workflows/ when no filter or exclude is given', () => {
		expect(slugs()).toEqual([
			'contact-form-automation',
			'cross-team-linear-report',
			'daily-slack-summary',
			'form-to-hubspot',
			'github-notion-sync',
			'weather-alert',
			'weather-monitoring',
		]);
	});

	it('drops non-json files even without filtering', () => {
		expect(slugs()).not.toContain('README');
	});

	describe('--filter (substring include)', () => {
		it('matches a single substring case-insensitively', () => {
			expect(slugs('Weather')).toEqual(['weather-alert', 'weather-monitoring']);
		});

		it('treats a comma-separated list as OR semantics', () => {
			expect(slugs('contact-form,deduplication')).toEqual(['contact-form-automation']);
			expect(slugs('weather,form-to-hubspot')).toEqual([
				'form-to-hubspot',
				'weather-alert',
				'weather-monitoring',
			]);
		});

		it('trims whitespace around each token', () => {
			expect(slugs(' weather , form-to-hubspot ')).toEqual([
				'form-to-hubspot',
				'weather-alert',
				'weather-monitoring',
			]);
		});

		it('drops empty tokens from stray commas', () => {
			expect(slugs('weather,,form-to-hubspot')).toEqual([
				'form-to-hubspot',
				'weather-alert',
				'weather-monitoring',
			]);
		});

		it('returns no slugs when nothing matches', () => {
			expect(slugs('no-such-thing')).toEqual([]);
		});
	});

	describe('--exclude', () => {
		it('removes any slug matching a single token', () => {
			expect(slugs(undefined, 'weather')).toEqual([
				'contact-form-automation',
				'cross-team-linear-report',
				'daily-slack-summary',
				'form-to-hubspot',
				'github-notion-sync',
			]);
		});

		it('treats a comma-separated list as OR (any match excludes)', () => {
			expect(slugs(undefined, 'weather,form-to-hubspot')).toEqual([
				'contact-form-automation',
				'cross-team-linear-report',
				'daily-slack-summary',
				'github-notion-sync',
			]);
		});
	});

	describe('--filter combined with --exclude', () => {
		it('applies exclude after filter', () => {
			expect(slugs('weather,form-to-hubspot', 'monitoring')).toEqual([
				'form-to-hubspot',
				'weather-alert',
			]);
		});

		it('returns empty when exclude removes every filtered slug', () => {
			expect(slugs('weather', 'weather')).toEqual([]);
		});
	});

	describe('--tier (datasets-field filter)', () => {
		it('defaults to ["full"] when a test case omits the datasets field', () => {
			const cases = loadWorkflowTestCasesWithFiles();
			expect(cases.every((c) => c.testCase.datasets.includes('full'))).toBe(true);
		});

		it('filters to test cases whose datasets array contains the tier', async () => {
			mockedReaddir.mockImplementation((dir) =>
				String(dir).endsWith('/workflows')
					? (FAKE_FILES as unknown as ReturnType<typeof readdirSync>)
					: ([] as unknown as ReturnType<typeof readdirSync>),
			);
			mockedReadFile.mockImplementation((p) => {
				const filename = String(p);
				if (filename.includes('weather-alert')) {
					return JSON.stringify({
						...jsonParse(STUB_TEST_CASE),
						datasets: ['pr', 'full'],
					});
				}
				return STUB_TEST_CASE;
			});

			const inPr = (await loadTestCases(parseCliArgs(['--tier', 'pr']), logger))
				.map((c) => c.fileSlug)
				.sort();
			const inFull = (await loadTestCases(parseCliArgs(['--tier', 'full']), logger))
				.map((c) => c.fileSlug)
				.sort();

			expect(inPr).toEqual(['weather-alert']);
			const allSlugs = loadWorkflowTestCasesWithFiles()
				.map((c) => c.fileSlug)
				.sort();
			expect(inFull).toEqual(allSlugs);
		});

		it('composes with --filter: tier filter applies after substring filter', async () => {
			mockedReaddir.mockImplementation((dir) =>
				String(dir).endsWith('/workflows')
					? (FAKE_FILES as unknown as ReturnType<typeof readdirSync>)
					: ([] as unknown as ReturnType<typeof readdirSync>),
			);
			mockedReadFile.mockImplementation((p) => {
				const filename = String(p);
				if (filename.includes('weather-alert')) {
					return JSON.stringify({
						...jsonParse(STUB_TEST_CASE),
						datasets: ['pr', 'full'],
					});
				}
				return STUB_TEST_CASE;
			});

			const result = (
				await loadTestCases(parseCliArgs(['--filter', 'weather', '--tier', 'pr']), logger)
			)
				.map((c) => c.fileSlug)
				.sort();
			expect(result).toEqual(['weather-alert']);
		});

		it('throws when --tier matches no test cases (catches typos instead of silent green)', async () => {
			mockedReaddir.mockImplementation((dir) =>
				String(dir).endsWith('/workflows')
					? (FAKE_FILES as unknown as ReturnType<typeof readdirSync>)
					: ([] as unknown as ReturnType<typeof readdirSync>),
			);
			await expect(loadTestCases(parseCliArgs(['--tier', 'prr']), logger)).rejects.toThrow(
				/No test cases match --tier "prr"/,
			);
		});

		it('rejects a test case that declares an empty datasets array', () => {
			mockedReadFile.mockImplementation(() =>
				JSON.stringify({ ...jsonParse(STUB_TEST_CASE), datasets: [] }),
			);
			expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/datasets/i);
		});
	});

	describe('combined disk source', () => {
		it('selects agent-directory cases with --tier agents', async () => {
			mockedReaddir.mockImplementation((dir) => {
				const dirname = String(dir);
				if (dirname.endsWith('/agents')) {
					return ['agent-intent.json'] as unknown as ReturnType<typeof readdirSync>;
				}
				if (dirname.endsWith('/workflows')) {
					return ['workflow-full.json'] as unknown as ReturnType<typeof readdirSync>;
				}
				return [] as unknown as ReturnType<typeof readdirSync>;
			});
			mockedReadFile.mockImplementation((p) => {
				const filename = String(p);
				const parsed = jsonParse(STUB_TEST_CASE);
				if (filename.includes('agent-intent')) {
					return JSON.stringify({
						...parsed,
						datasets: ['agents'],
						executionScenarios: undefined,
						processExpectations: ['The agent classifies intent.'],
					});
				}
				return JSON.stringify({ ...parsed, datasets: ['full'] });
			});

			const cases = await loadTestCases(parseCliArgs(['--tier', 'agents']), logger);

			expect(cases.map((c) => c.fileSlug)).toEqual(['agent-intent']);
			expect(cases[0].testCase.datasets).toEqual(['agents']);
			expect(cases[0].testCase.executionScenarios).toBeUndefined();
		});
	});
});
