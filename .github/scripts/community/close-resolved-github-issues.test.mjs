import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	extractGithubIssueNumbers,
	extractFixPullRequests,
	selectClosureCandidates,
	buildCloseComment,
} from './close-resolved-github-issues.mjs';

/**
 * Run these tests with:
 *
 * node --test ./.github/scripts/community/close-resolved-github-issues.test.mjs
 * */

const TARGET = { owner: 'n8n-io', repo: 'n8n' };
const DAY_MS = 86_400_000;
const NOW = new Date('2026-08-17T00:00:00Z').getTime();

const daysAgo = (days) => new Date(NOW - days * DAY_MS).toISOString();

const completed = (overrides = {}) => ({
	identifier: 'AI-2422',
	url: 'https://linear.app/n8n/issue/AI-2422/community-issue',
	completedAt: daysAgo(1),
	state: { name: 'Released/Done', type: 'completed' },
	description: 'GH Link: https://github.com/n8n-io/n8n/issues/29119',
	attachments: [],
	...overrides,
});

describe('extractGithubIssueNumbers', () => {
	it('reads the GH Link line out of a mirrored issue description', () => {
		const issue = {
			description: 'GH Link: https://github.com/n8n-io/n8n/issues/29119\nUser: someone',
		};
		assert.deepEqual(extractGithubIssueNumbers(issue, TARGET), [29119]);
	});

	it('reads markdown links and attachment URLs', () => {
		const issue = {
			description: '[link](https://github.com/n8n-io/n8n/issues/100)',
			attachments: [{ url: 'https://github.com/n8n-io/n8n/issues/200' }, { url: null }],
		};
		assert.deepEqual(extractGithubIssueNumbers(issue, TARGET), [100, 200]);
	});

	it('deduplicates repeated references', () => {
		const issue = {
			description:
				'https://github.com/n8n-io/n8n/issues/42 and again https://github.com/n8n-io/n8n/issues/42',
		};
		assert.deepEqual(extractGithubIssueNumbers(issue, TARGET), [42]);
	});

	it('ignores pull requests, other repos and bare #references', () => {
		const issue = {
			description: [
				'https://github.com/n8n-io/n8n/pull/29141',
				'https://github.com/n8n-io/n8n-docs/issues/7',
				'https://github.com/someone/n8n/issues/8',
				'fixes #9',
			].join('\n'),
		};
		assert.deepEqual(extractGithubIssueNumbers(issue, TARGET), []);
	});

	it('tolerates a missing description and attachments', () => {
		assert.deepEqual(extractGithubIssueNumbers({}, TARGET), []);
		assert.deepEqual(extractGithubIssueNumbers({ description: null }, TARGET), []);
	});
});

describe('extractFixPullRequests', () => {
	it('collects PR attachments from this repo only', () => {
		const issue = {
			attachments: [
				{ url: 'https://github.com/n8n-io/n8n/pull/29141' },
				{ url: 'https://github.com/n8n-io/n8n-docs/pull/1' },
				{ url: 'https://app.plain.com/workspace/w_1/thread/th_1' },
			],
		};
		assert.deepEqual(extractFixPullRequests(issue, TARGET), [29141]);
	});

	it('returns an empty list when nothing is attached', () => {
		assert.deepEqual(extractFixPullRequests({}, TARGET), []);
	});
});

describe('selectClosureCandidates', () => {
	const select = (linearIssues, lookbackDays = 7) =>
		selectClosureCandidates({ linearIssues, ...TARGET, lookbackDays, now: NOW });

	it('turns a recently completed mirrored issue into a candidate', () => {
		const { candidates, skipped } = select([completed()]);

		assert.equal(skipped.length, 0);
		assert.deepEqual(candidates, [
			{
				number: 29119,
				linear: {
					identifier: 'AI-2422',
					url: 'https://linear.app/n8n/issue/AI-2422/community-issue',
					state: 'Released/Done',
					completedAt: daysAgo(1),
				},
				fixPullRequests: [],
			},
		]);
	});

	it('carries the fix PR through to the candidate', () => {
		const { candidates } = select([
			completed({ attachments: [{ url: 'https://github.com/n8n-io/n8n/pull/29141' }] }),
		]);

		assert.deepEqual(candidates[0].fixPullRequests, [29141]);
	});

	it('skips issues that are not in a completed state', () => {
		const { candidates, skipped } = select([
			completed({ state: { name: 'Canceled', type: 'canceled' } }),
			completed({ identifier: 'AI-1', state: { name: 'In Progress', type: 'started' } }),
		]);

		assert.equal(candidates.length, 0);
		assert.equal(skipped.length, 2);
		assert.match(skipped[0].reason, /not completed/);
	});

	it('skips issues completed before the lookback window', () => {
		const { candidates, skipped } = select([completed({ completedAt: daysAgo(30) })]);

		assert.equal(candidates.length, 0);
		assert.match(skipped[0].reason, /lookback window/);
	});

	it('skips issues without a completion timestamp', () => {
		const { candidates, skipped } = select([completed({ completedAt: null })]);

		assert.equal(candidates.length, 0);
		assert.match(skipped[0].reason, /completedAt/);
	});

	it('skips issues with no link to this repository', () => {
		const { candidates, skipped } = select([completed({ description: 'internal-only work' })]);

		assert.equal(candidates.length, 0);
		assert.match(skipped[0].reason, /issue link/);
	});

	it('claims a GitHub issue only once when several Linear issues point at it', () => {
		const { candidates, skipped } = select([completed(), completed({ identifier: 'AI-2423' })]);

		assert.deepEqual(
			candidates.map((c) => c.linear.identifier),
			['AI-2422'],
		);
		assert.equal(skipped.length, 1);
		assert.match(skipped[0].reason, /already claimed by AI-2422/);
	});

	it('returns candidates in ascending issue order', () => {
		const { candidates } = select([
			completed({ description: 'https://github.com/n8n-io/n8n/issues/300' }),
			completed({ identifier: 'AI-2', description: 'https://github.com/n8n-io/n8n/issues/100' }),
		]);

		assert.deepEqual(
			candidates.map((c) => c.number),
			[100, 300],
		);
	});
});

describe('buildCloseComment', () => {
	it('points at the fix PRs when they are known', () => {
		const comment = buildCloseComment({ fixPullRequests: [29141, 29200] });
		assert.match(comment, /The fix landed in #29141, #29200\./);
	});

	it('falls back to a generic message without a PR', () => {
		const comment = buildCloseComment({ fixPullRequests: [] });
		assert.match(comment, /upcoming release/);
	});

	it('never leaks internal references', () => {
		const comment = buildCloseComment({ fixPullRequests: [29141] });
		assert.doesNotMatch(comment, /linear/i);
	});
});
