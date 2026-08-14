import assert from 'node:assert/strict';
import { test } from 'node:test';

import { annotation, rebaseBundleBranch } from './rebase-bundle-branch.mjs';

// A git stub: routes calls by a matcher, records every invocation.
function makeStub(routes = []) {
	const calls = [];
	const fn = (args) => {
		calls.push(args);
		for (const [match, result] of routes) {
			if (match(args)) return typeof result === 'function' ? result(args) : result;
		}
		return '';
	};
	fn.calls = calls;
	return fn;
}

const fail =
	(stdout = '') =>
	() => {
		const err = new Error('command failed');
		err.status = 1;
		err.stdout = stdout;
		throw err;
	};

const PRE_HEAD = 'PREHEAD';
const BASE = 'BASESHA';
const MERGE_TREE = 'MERGETREEOID';

const env = {
	BUNDLE_BRANCH: 'bundle/2.x',
	BASE_BRANCH: 'master',
	GH_TOKEN: 'tok',
	GITHUB_REPOSITORY: 'n8n-io/n8n-private',
};

const isRebase = (a) => a[0] === 'rebase' && a[1] !== '--abort';
const isPush = (a) => a[0] === 'push';

// What `git merge-tree --write-tree --name-only` emits on a conflict: the (marker-carrying)
// tree OID, the conflicted paths, a blank line, then informational messages.
const conflictedMergeTree = (...paths) =>
	fail(`${MERGE_TREE}\n${paths.join('\n')}\n\nCONFLICT (content): Merge conflict in ${paths[0]}`);

// Routes shared by every path: base fetched, the bundle branch hasn't absorbed it yet, the
// merge tree is computable, and the replay lands on exactly that tree. git grep exits
// non-zero => no markers.
const baseGitRoutes = [
	[(a) => a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD', BASE],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', PRE_HEAD],
	[(a) => a[0] === 'merge-base', fail()],
	[(a) => a[0] === 'merge-tree', MERGE_TREE],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', MERGE_TREE],
	[(a) => a[0] === 'grep', fail()],
];

const silent = () => {};

test('a missing branch env var fails before any git command runs', () => {
	const git = makeStub();
	assert.throws(
		() => rebaseBundleBranch({ git, env: { ...env, BUNDLE_BRANCH: '' }, log: silent }),
		{
			message: /BUNDLE_BRANCH env var is required/,
		},
	);
	assert.equal(git.calls.length, 0);
});

test('a clean replay force-pushes with the pre-replay tip as the lease', () => {
	const git = makeStub(baseGitRoutes);
	const result = rebaseBundleBranch({ git, env, log: silent });

	assert.deepEqual(result, { status: 'replayed' });
	// Commits already on the base are dropped rather than stopping the replay.
	assert.deepEqual(git.calls.find(isRebase), ['rebase', '--empty=drop', BASE]);
	assert.deepEqual(git.calls.find(isPush), [
		'push',
		`--force-with-lease=refs/heads/bundle/2.x:${PRE_HEAD}`,
		'https://x-access-token:tok@github.com/n8n-io/n8n-private.git',
		'HEAD:refs/heads/bundle/2.x',
	]);
});

test('both fetches are authenticated — the private repo rejects an anonymous origin fetch', () => {
	const git = makeStub(baseGitRoutes);
	rebaseBundleBranch({ git, env, log: silent });

	const remote = 'https://x-access-token:tok@github.com/n8n-io/n8n-private.git';
	assert.deepEqual(
		git.calls.filter((a) => a[0] === 'fetch'),
		[
			['fetch', remote, 'master'],
			['fetch', remote, 'bundle/2.x'],
		],
	);
});

test('a bundle branch that already contains its base is left alone', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge-base', ''], // --is-ancestor succeeds
		...baseGitRoutes,
	]);
	const result = rebaseBundleBranch({ git, env, log: silent });

	assert.deepEqual(result, { status: 'current' });
	assert.equal(git.calls.some(isRebase), false);
	assert.equal(git.calls.some(isPush), false);
});

test('a conflicting base fails without touching the branch', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge-tree', conflictedMergeTree('packages/cli/src/a.ts')],
		...baseGitRoutes,
	]);
	const logs = [];

	assert.throws(() => rebaseBundleBranch({ git, env, log: (m) => logs.push(m) }), {
		message: /master conflicts with bundle\/2\.x/,
	});
	// The conflict is detected from the merge tree alone: no rebase, no push.
	assert.equal(git.calls.some(isRebase), false);
	assert.equal(git.calls.some(isPush), false);
	assert.match(logs.join('\n'), /::error title=bundle\/2\.x is out of sync::/);
	assert.match(logs.join('\n'), /packages\/cli\/src\/a\.ts/);
});

test('a replay that stalls aborts the rebase and refuses to push', () => {
	const git = makeStub([...baseGitRoutes, [isRebase, fail('could not apply')]]);
	const logs = [];

	assert.throws(() => rebaseBundleBranch({ git, env, log: (m) => logs.push(m) }), {
		message: /Could not replay bundle\/2\.x onto master/,
	});
	assert.deepEqual(git.calls.at(-1), ['rebase', '--abort']);
	assert.equal(git.calls.some(isPush), false);
	assert.match(logs.join('\n'), /::error title=bundle\/2\.x could not be replayed::/);
});

test('a replayed tree that is not the merge tree refuses to push', () => {
	const git = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'SOMEOTHERTREE'],
		...baseGitRoutes,
	]);

	assert.throws(() => rebaseBundleBranch({ git, env, log: silent }), {
		message: /does not match the merge tree MERGETREEOID; refusing to push/,
	});
	assert.equal(git.calls.some(isPush), false);
});

test('conflict markers in the replayed tree refuse to push', () => {
	const git = makeStub([
		[(a) => a[0] === 'grep', 'packages/cli/src/a.ts'], // git grep found markers
		...baseGitRoutes,
	]);

	assert.throws(() => rebaseBundleBranch({ git, env, log: silent }), {
		message: /conflict markers present in HEAD/,
	});
	assert.equal(git.calls.some(isPush), false);
});

test('annotation keeps a multi-line message on one line', () => {
	assert.equal(annotation('t', 'a\nb'), '::error title=t::a%0Ab');
});
