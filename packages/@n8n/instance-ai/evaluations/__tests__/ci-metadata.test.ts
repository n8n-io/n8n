import { buildCIMetadata, computeExperimentPrefix } from '../cli/ci-metadata';

const CI_ENV_VARS = [
	'GITHUB_ACTIONS',
	'GITHUB_HEAD_REF',
	'GITHUB_REF_NAME',
	'GITHUB_SHA',
	'GITHUB_EVENT_NAME',
	'GITHUB_RUN_ID',
	'LANGSMITH_BRANCH',
] as const;

describe('computeExperimentPrefix', () => {
	const originalEnv: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const key of CI_ENV_VARS) {
			originalEnv[key] = process.env[key];
			delete process.env[key];
		}
	});

	afterEach(() => {
		for (const key of CI_ENV_VARS) {
			if (originalEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalEnv[key];
			}
		}
	});

	describe('CI mode', () => {
		beforeEach(() => {
			process.env.GITHUB_ACTIONS = 'true';
			process.env.GITHUB_SHA = '357e949547671e2cd1c017eb4e7c809cd55bd121';
		});

		it('prefers LANGSMITH_BRANCH over GITHUB_HEAD_REF and GITHUB_REF_NAME', () => {
			process.env.LANGSMITH_BRANCH = 'feature-branch';
			process.env.GITHUB_HEAD_REF = 'should-not-be-used';
			process.env.GITHUB_REF_NAME = '30711/merge';

			expect(computeExperimentPrefix()).toBe('ci-feature-branch-357e949');
		});

		it('falls back to GITHUB_HEAD_REF when LANGSMITH_BRANCH is unset', () => {
			process.env.GITHUB_HEAD_REF = 'feature-x';
			process.env.GITHUB_REF_NAME = '30711/merge';

			expect(computeExperimentPrefix()).toBe('ci-feature-x-357e949');
		});

		it('falls back to GITHUB_REF_NAME when LANGSMITH_BRANCH and GITHUB_HEAD_REF are unset', () => {
			process.env.GITHUB_REF_NAME = 'master';

			expect(computeExperimentPrefix()).toBe('ci-master-357e949');
		});

		it('sanitizes special characters in the branch name', () => {
			process.env.LANGSMITH_BRANCH = '30711/merge';

			expect(computeExperimentPrefix()).toBe('ci-30711_merge-357e949');
		});

		it('collapses consecutive sanitized underscores', () => {
			process.env.LANGSMITH_BRANCH = 'feature//thing';

			expect(computeExperimentPrefix()).toBe('ci-feature_thing-357e949');
		});

		it('returns local fallback when GITHUB_SHA is missing', () => {
			delete process.env.GITHUB_SHA;
			process.env.LANGSMITH_BRANCH = 'feature-x';

			// In CI without SHA, computeCIExperimentName returns undefined; the
			// local computation also fails outside a git context, so we land
			// on the generic fallback.
			const result = computeExperimentPrefix();
			expect(result).not.toMatch(/^ci-/);
		});
	});

	describe('local mode', () => {
		it('does not use LANGSMITH_BRANCH when GITHUB_ACTIONS is unset', () => {
			process.env.LANGSMITH_BRANCH = 'should-not-be-used';

			expect(computeExperimentPrefix()).not.toContain('should-not-be-used');
		});
	});
});

describe('buildCIMetadata', () => {
	const ENV_VARS = [
		'GITHUB_ACTIONS',
		'GITHUB_EVENT_NAME',
		'GITHUB_RUN_ID',
		'GITHUB_SHA',
		'GITHUB_HEAD_REF',
		'GITHUB_REF_NAME',
		'GITHUB_REF',
		'LANGSMITH_BRANCH',
		'LANGSMITH_REVISION_ID',
	] as const;
	const originalEnv: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const key of ENV_VARS) {
			originalEnv[key] = process.env[key];
			delete process.env[key];
		}
	});

	afterEach(() => {
		for (const key of ENV_VARS) {
			if (originalEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalEnv[key];
			}
		}
	});

	it('returns local source when not in CI', () => {
		expect(buildCIMetadata()).toEqual({ source: 'local' });
	});

	it('returns ci source with trigger and runId when in CI', () => {
		process.env.GITHUB_ACTIONS = 'true';
		process.env.GITHUB_EVENT_NAME = 'pull_request_review';
		process.env.GITHUB_RUN_ID = '12345';

		expect(buildCIMetadata()).toEqual({
			source: 'ci',
			trigger: 'pull_request_review',
			runId: '12345',
		});
	});

	it('records branch, commit SHA, and PR number in CI', () => {
		process.env.GITHUB_ACTIONS = 'true';
		process.env.LANGSMITH_BRANCH = 'feature-x';
		process.env.LANGSMITH_REVISION_ID = '357e949547671e2cd1c017eb4e7c809cd55bd121';
		process.env.GITHUB_REF = 'refs/pull/30711/merge';

		expect(buildCIMetadata()).toMatchObject({
			source: 'ci',
			branch: 'feature-x',
			commitSha: '357e949547671e2cd1c017eb4e7c809cd55bd121',
			prNumber: '30711',
		});
	});
});
