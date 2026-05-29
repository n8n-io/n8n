jest.mock('fs', () => ({
	readdirSync: jest.fn(),
	readFileSync: jest.fn(),
}));

import { readdirSync, readFileSync } from 'fs';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';

const mockedReaddir = jest.mocked(readdirSync);
const mockedReadFile = jest.mocked(readFileSync);

const FAKE_FILES = [
	'contact-form-automation.json',
	'cross-team-linear-report.json',
	'daily-slack-summary.json',
	'form-to-hubspot.json',
	'github-notion-sync.json',
	'weather-monitoring.json',
	'weather-alert.json',
	'workflow-builder-http-bearer-auth.json',
	'workflow-builder-schedule-to-email.json',
	'workflow-builder-switch-fallback-routing.json',
	'workflow-builder-webhook-to-slack.json',
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
	jest.clearAllMocks();
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
			'workflow-builder-http-bearer-auth',
			'workflow-builder-schedule-to-email',
			'workflow-builder-switch-fallback-routing',
			'workflow-builder-webhook-to-slack',
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
				'workflow-builder-http-bearer-auth',
				'workflow-builder-schedule-to-email',
				'workflow-builder-switch-fallback-routing',
				'workflow-builder-webhook-to-slack',
			]);
		});

		it('treats a comma-separated list as OR (any match excludes)', () => {
			expect(slugs(undefined, 'weather,form-to-hubspot')).toEqual([
				'contact-form-automation',
				'cross-team-linear-report',
				'daily-slack-summary',
				'github-notion-sync',
				'workflow-builder-http-bearer-auth',
				'workflow-builder-schedule-to-email',
				'workflow-builder-switch-fallback-routing',
				'workflow-builder-webhook-to-slack',
			]);
		});
	});

	describe('--filter combined with --exclude', () => {
		it('applies exclude after filter', () => {
			// filter narrows to weather-* and form-to-hubspot, then exclude
			// removes weather-monitoring
			expect(slugs('weather,form-to-hubspot', 'monitoring')).toEqual([
				'form-to-hubspot',
				'weather-alert',
			]);
		});

		it('returns empty when exclude removes every filtered slug', () => {
			expect(slugs('weather', 'weather')).toEqual([]);
		});
	});
});
