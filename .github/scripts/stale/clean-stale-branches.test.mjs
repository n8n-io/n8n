import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { globToRegExp, refMatches, protectingRuleset, classifyBranches } from './clean-stale-branches.mjs';

/**
 * Run these tests with:
 *
 * node --test ./.github/scripts/stale/clean-stale-branches.test.mjs
 * */

const DAY_MS = 86_400_000;

// Mirror of the repo's real deletion-protecting rulesets.
const RULESETS = [
	{ name: 'master', include: ['refs/heads/master', '~DEFAULT_BRANCH'], exclude: [] },
	{ name: '1.x Branch ruleset', include: ['refs/heads/1.x'], exclude: [] },
	{ name: 'Release branch Ruleset', include: ['refs/heads/release/*'], exclude: [] },
	{ name: 'Release Candidate branch Ruleset', include: ['refs/heads/release-candidate/*'], exclude: [] },
];

describe('globToRegExp', () => {
	it('matches a literal pattern exactly', () => {
		const re = globToRegExp('refs/heads/master');
		assert.equal(re.test('refs/heads/master'), true);
		assert.equal(re.test('refs/heads/master-2'), false);
		assert.equal(re.test('refs/heads/feature/master'), false);
	});

	it('treats * as within a single path segment', () => {
		const re = globToRegExp('refs/heads/release/*');
		assert.equal(re.test('refs/heads/release/1.50.1'), true);
		// * does not cross a slash
		assert.equal(re.test('refs/heads/release/team/1.50.1'), false);
		assert.equal(re.test('refs/heads/release'), false);
	});

	it('treats ** as crossing path segments', () => {
		const re = globToRegExp('refs/heads/release/**');
		assert.equal(re.test('refs/heads/release/team/1.50.1'), true);
		assert.equal(re.test('refs/heads/release/1.50.1'), true);
	});

	it('escapes regex metacharacters in the literal parts', () => {
		const re = globToRegExp('refs/heads/1.x');
		assert.equal(re.test('refs/heads/1.x'), true);
		// the dot must be literal, not "any char"
		assert.equal(re.test('refs/heads/1ax'), false);
	});
});

describe('refMatches', () => {
	it('matches the ~ALL wildcard against any ref', () => {
		assert.equal(refMatches('refs/heads/anything', '~ALL', 'master'), true);
	});

	it('resolves ~DEFAULT_BRANCH against the provided default branch', () => {
		assert.equal(refMatches('refs/heads/master', '~DEFAULT_BRANCH', 'master'), true);
		assert.equal(refMatches('refs/heads/develop', '~DEFAULT_BRANCH', 'master'), false);
	});

	it('falls back to glob matching for normal patterns', () => {
		assert.equal(refMatches('refs/heads/release/1.50.1', 'refs/heads/release/*', 'master'), true);
		assert.equal(refMatches('refs/heads/feature/x', 'refs/heads/release/*', 'master'), false);
	});
});

describe('protectingRuleset', () => {
	it('returns the ruleset name when an include pattern matches', () => {
		assert.equal(protectingRuleset('refs/heads/release/1.50.1', RULESETS, 'master'), 'Release branch Ruleset');
		assert.equal(protectingRuleset('refs/heads/1.x', RULESETS, 'master'), '1.x Branch ruleset');
		assert.equal(protectingRuleset('refs/heads/master', RULESETS, 'master'), 'master');
	});

	it('returns null when no ruleset matches', () => {
		assert.equal(protectingRuleset('refs/heads/some-old-feature', RULESETS, 'master'), null);
	});

	it('honors exclude patterns over include patterns', () => {
		const rulesets = [{ name: 'releases', include: ['refs/heads/release/*'], exclude: ['refs/heads/release/0.*'] }];
		assert.equal(protectingRuleset('refs/heads/release/1.50.1', rulesets, 'master'), 'releases');
		assert.equal(protectingRuleset('refs/heads/release/0.236.1', rulesets, 'master'), null);
	});
});

describe('classifyBranches', () => {
	// Fixed clock so age math is deterministic.
	const now = new Date('2026-06-04T00:00:00Z').getTime();
	const daysAgo = (n) => new Date(now - n * DAY_MS).toISOString();

	it('keeps ruleset-protected branches regardless of age', () => {
		const { keep, remove } = classifyBranches({
			branches: [{ name: 'release/1.50.1', committedDate: daysAgo(800) }],
			rulesets: RULESETS,
			defaultBranch: 'master',
			staleDays: 100,
			now,
		});
		assert.equal(remove.length, 0);
		assert.equal(keep.length, 1);
		assert.match(keep[0].reason, /protected: ruleset "Release branch Ruleset"/);
	});

	it('keeps the default branch even if no ruleset matched it', () => {
		const { keep, remove } = classifyBranches({
			branches: [{ name: 'develop', committedDate: daysAgo(900) }],
			rulesets: [],
			defaultBranch: 'develop',
			staleDays: 100,
			now,
		});
		assert.equal(remove.length, 0);
		assert.equal(keep[0].reason, 'protected: default branch');
	});

	it('keeps branches newer than the stale threshold', () => {
		const { keep, remove } = classifyBranches({
			branches: [{ name: 'recent-feature', committedDate: daysAgo(10) }],
			rulesets: RULESETS,
			defaultBranch: 'master',
			staleDays: 100,
			now,
		});
		assert.equal(remove.length, 0);
		assert.equal(keep[0].reason, 'active: last commit 10d ago (< 100d)');
	});

	it('deletes unprotected branches older than the threshold', () => {
		const { keep, remove } = classifyBranches({
			branches: [{ name: 'old-feature', committedDate: daysAgo(412) }],
			rulesets: RULESETS,
			defaultBranch: 'master',
			staleDays: 100,
			now,
		});
		assert.equal(keep.length, 0);
		assert.equal(remove.length, 1);
		assert.equal(remove[0].name, 'old-feature');
		assert.equal(remove[0].ageDays, 412);
		assert.match(remove[0].reason, /stale: last commit 412d ago \(>= 100d\)/);
	});

	it('keeps branches with an unknown last-commit date', () => {
		const { keep, remove } = classifyBranches({
			branches: [{ name: 'weird-branch', committedDate: null }],
			rulesets: RULESETS,
			defaultBranch: 'master',
			staleDays: 100,
			now,
		});
		assert.equal(remove.length, 0);
		assert.equal(keep[0].reason, 'kept: unknown last-commit date');
	});

	it('sorts deletions oldest-first and keeps alphabetically', () => {
		const { keep, remove } = classifyBranches({
			branches: [
				{ name: 'stale-newer', committedDate: daysAgo(150) },
				{ name: 'stale-older', committedDate: daysAgo(500) },
				{ name: 'zeta-active', committedDate: daysAgo(1) },
				{ name: 'alpha-active', committedDate: daysAgo(2) },
			],
			rulesets: RULESETS,
			defaultBranch: 'master',
			staleDays: 100,
			now,
		});
		assert.deepEqual(
			remove.map((b) => b.name),
			['stale-older', 'stale-newer'],
		);
		assert.deepEqual(
			keep.map((b) => b.name),
			['alpha-active', 'zeta-active'],
		);
	});

	it('treats a branch exactly at the threshold as stale', () => {
		const { keep, remove } = classifyBranches({
			branches: [{ name: 'edge', committedDate: daysAgo(100) }],
			rulesets: [],
			defaultBranch: 'master',
			staleDays: 100,
			now,
		});
		assert.equal(keep.length, 0);
		assert.equal(remove.length, 1);
	});
});
