import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resetBundleAfterCut } from './reset-bundle-after-cut.mjs';

// A command stub: routes calls by a matcher, records every invocation.
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

const CUT = 'CUTSHA';
const PRE_HEAD = 'PREHEAD';
const BASE = 'BASESHA';
const PUBLISHED = 'PUBSHA';
const MERGE_TREE = 'MERGETREEOID';

const CUT_REF = 'refs/bundle-cut/2.x/pr-42';

const env = {
	BUNDLE_BRANCH: 'bundle/2.x',
	BASE_BRANCH: 'master',
	GH_TOKEN: 'tok',
	GITHUB_REPOSITORY: 'n8n-io/n8n-private',
};

const isPush = (a) => a[0] === 'push' && !deletesMarker(a);
const isRebase = (a) => a[0] === 'rebase';
const isAncestorOf = (a, ancestor, descendant) =>
	a[0] === 'merge-base' && a[2] === ancestor && a[3] === descendant;
const isFetch = (a) => a[0] === 'fetch';
const readsMarker = (a) => a[0] === 'ls-remote' && a.at(-1).startsWith('refs/bundle-cut/');
const deletesMarker = (a) => a[0] === 'push' && a.at(-1) === `:${CUT_REF}`;

// What `git merge-tree --write-tree --name-only` emits on a conflict: the (marker-carrying)
// tree OID, the conflicted paths, a blank line, then informational messages.
const conflictedMergeTree = (...paths) =>
	fail(`${MERGE_TREE}\n${paths.join('\n')}\n\nCONFLICT (content): Merge conflict in ${paths[0]}`);

// The happy path: a cut is recorded, its public PR is merged, the base carries the published
// commit, the bundle branch still sits exactly where the cut left it, and the replay is clean.
const baseGhRoutes = [
	[
		(a) => a[0] === 'pr' && a[1] === 'view',
		JSON.stringify({ state: 'MERGED', mergeCommit: { oid: PUBLISHED } }),
	],
];

const baseGitRoutes = [
	[readsMarker, `${CUT}\t${CUT_REF}`],
	[(a) => a[0] === 'ls-remote', `${PRE_HEAD}\trefs/heads/bundle/2.x`],
	[(a) => a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD', BASE],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', MERGE_TREE],
	[(a) => a[0] === 'rev-parse', PRE_HEAD],
	[(a) => isAncestorOf(a, PUBLISHED, BASE), ''], // the base carries the batch
	[(a) => isAncestorOf(a, BASE, PRE_HEAD), fail()], // the bundle does not carry the base
	[(a) => isAncestorOf(a, CUT, PRE_HEAD), ''], // the cut is where we left it
	[(a) => a[0] === 'merge-tree', MERGE_TREE],
	[(a) => a[0] === 'grep', fail()], // no conflict markers
];

const silent = () => {};

test('a missing branch env var fails before any command runs', () => {
	const git = makeStub();
	const gh = makeStub();
	assert.throws(
		() => resetBundleAfterCut({ git, gh, env: { ...env, BASE_BRANCH: '' }, log: silent }),
		{ message: /BASE_BRANCH env var is required/ },
	);
	assert.equal(git.calls.length, 0);
	assert.equal(gh.calls.length, 0);
});

test('no recorded cut leaves the branch alone', () => {
	const git = makeStub([[readsMarker, ''], ...baseGitRoutes]);
	const gh = makeStub(baseGhRoutes);

	assert.equal(resetBundleAfterCut({ git, gh, env, log: silent }).status, 'no-cut');
	assert.equal(git.calls.filter(isFetch).length, 0);
	assert.equal(gh.calls.length, 0);
});

test('two recorded cuts fail loud rather than guessing which one is live', () => {
	const git = makeStub([
		[readsMarker, `${CUT}\t${CUT_REF}\nOTHERSHA\trefs/bundle-cut/2.x/pr-41`],
		...baseGitRoutes,
	]);
	const gh = makeStub(baseGhRoutes);

	assert.throws(() => resetBundleAfterCut({ git, gh, env, log: silent }), {
		message: /a previous one was never retired/,
	});
	assert.equal(git.calls.filter(isFetch).length, 0);
});

test('an unmerged public PR leaves the branch alone', () => {
	const git = makeStub(baseGitRoutes);
	const gh = makeStub([
		[(a) => a[0] === 'pr', JSON.stringify({ state: 'OPEN', mergeCommit: null })],
	]);

	assert.equal(resetBundleAfterCut({ git, gh, env, log: silent }).status, 'awaiting-publish');
	assert.equal(git.calls.filter(isFetch).length, 0);
});

test('a base that has not received the published commit leaves the branch alone', () => {
	const git = makeStub([[(a) => isAncestorOf(a, PUBLISHED, BASE), fail()], ...baseGitRoutes]);
	const gh = makeStub(baseGhRoutes);

	assert.equal(resetBundleAfterCut({ git, gh, env, log: silent }).status, 'awaiting-sync');
	assert.equal(git.calls.filter(isPush).length, 0);
	assert.equal(git.calls.filter(deletesMarker).length, 0);
});

test('an untouched bundle branch is reset onto the base and the marker is cleared', () => {
	const git = makeStub(baseGitRoutes);
	const gh = makeStub(baseGhRoutes);

	assert.equal(resetBundleAfterCut({ git, gh, env, log: silent }).status, 'reset');

	const rebase = git.calls.find(isRebase);
	assert.deepEqual(rebase, ['rebase', '--empty=drop', '--onto', BASE, CUT, 'bundle/2.x']);
	const push = git.calls.find(isPush);
	assert.equal(push[1], `--force-with-lease=refs/heads/bundle/2.x:${PRE_HEAD}`);
	assert.equal(git.calls.filter(deletesMarker).length, 1);
});

test('a branch already sitting at the base only has its marker retired', () => {
	const git = makeStub([[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', BASE], ...baseGitRoutes]);
	const gh = makeStub(baseGhRoutes);

	assert.equal(resetBundleAfterCut({ git, gh, env, log: silent }).status, 'current');
	assert.equal(git.calls.filter(isPush).length, 0);
	assert.equal(git.calls.filter(deletesMarker).length, 1);
});

test('a base already merged into the branch does not stop the replay', () => {
	const git = makeStub([[(a) => isAncestorOf(a, BASE, PRE_HEAD), ''], ...baseGitRoutes]);
	const gh = makeStub(baseGhRoutes);

	assert.equal(resetBundleAfterCut({ git, gh, env, log: silent }).status, 'reset');
	assert.deepEqual(git.calls.find(isRebase), [
		'rebase',
		'--empty=drop',
		'--onto',
		BASE,
		CUT,
		'bundle/2.x',
	]);
});

test('a cut that is no longer an ancestor of the branch fails loud', () => {
	const git = makeStub([[(a) => isAncestorOf(a, CUT, PRE_HEAD), fail()], ...baseGitRoutes]);
	const gh = makeStub(baseGhRoutes);

	assert.throws(() => resetBundleAfterCut({ git, gh, env, log: silent }), {
		message: /was rewritten outside this flow/,
	});
	assert.equal(git.calls.filter(isPush).length, 0);
});

test('a deleted bundle branch fails loud instead of being re-created', () => {
	const git = makeStub([
		[(a) => a[0] === 'ls-remote' && a.at(-1).startsWith('refs/heads/'), ''],
		...baseGitRoutes,
	]);
	const gh = makeStub(baseGhRoutes);

	assert.throws(() => resetBundleAfterCut({ git, gh, env, log: silent }), {
		message: /must never be deleted/,
	});
	assert.equal(git.calls.filter(isPush).length, 0);
	assert.equal(git.calls.filter(deletesMarker).length, 0);
});

test('a conflict pushes nothing and keeps the marker', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge-tree', conflictedMergeTree('packages/cli/src/x.ts')],
		...baseGitRoutes,
	]);
	const gh = makeStub(baseGhRoutes);

	assert.throws(() => resetBundleAfterCut({ git, gh, env, log: silent }), {
		message: /Could not reset bundle\/2\.x onto master/,
	});
	assert.equal(git.calls.filter(isPush).length, 0);
	assert.equal(git.calls.filter(isRebase).length, 0);
	assert.equal(git.calls.filter(deletesMarker).length, 0);
});

test('a replay that stalls without conflict markers aborts the rebase', () => {
	const git = makeStub([[isRebase, fail('could not apply')], ...baseGitRoutes]);
	const gh = makeStub(baseGhRoutes);

	assert.throws(() => resetBundleAfterCut({ git, gh, env, log: silent }));
	assert.deepEqual(git.calls.filter(isRebase).at(-1), ['rebase', '--abort']);
	assert.equal(git.calls.filter(isPush).length, 0);
});

test('a lost lease keeps the marker so the next run retries', () => {
	const git = makeStub([[isPush, fail('non-fast-forward')], ...baseGitRoutes]);
	const gh = makeStub(baseGhRoutes);

	assert.equal(resetBundleAfterCut({ git, gh, env, log: silent }).status, 'rejected');
	assert.equal(git.calls.filter(deletesMarker).length, 0);
});
