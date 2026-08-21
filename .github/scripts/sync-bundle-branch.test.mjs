import assert from 'node:assert/strict';
import { test } from 'node:test';

import { annotation, syncBundleBranch } from './sync-bundle-branch.mjs';

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
const REMOTE = 'https://x-access-token:tok@github.com/n8n-io/n8n-private.git';

const env = {
	BUNDLE_BRANCH: 'bundle/2.x',
	BASE_BRANCH: 'master',
	GH_TOKEN: 'tok',
	GITHUB_REPOSITORY: 'n8n-io/n8n-private',
};

const isMerge = (a) => a[0] === 'merge';
const isPush = (a) => a[0] === 'push';

// What `git merge-tree --write-tree --name-only` emits on a conflict: the (marker-carrying)
// tree OID, the conflicted paths, a blank line, then informational messages.
const conflictedMergeTree = (...paths) =>
	fail(`${MERGE_TREE}\n${paths.join('\n')}\n\nCONFLICT (content): Merge conflict in ${paths[0]}`);

// Routes shared by every path: base fetched, the bundle branch hasn't absorbed it yet, the
// merge tree is computable, and the merge lands on exactly that tree. git grep exits
// non-zero => no markers.
const baseGitRoutes = [
	[(a) => a[0] === 'ls-remote', `${PRE_HEAD}\trefs/heads/bundle/2.x`],
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
	assert.throws(() => syncBundleBranch({ git, env: { ...env, BUNDLE_BRANCH: '' }, log: silent }), {
		message: /BUNDLE_BRANCH env var is required/,
	});
	assert.equal(git.calls.length, 0);
});

test('a clean sync merges the base in and pushes without forcing', () => {
	const git = makeStub(baseGitRoutes);
	const result = syncBundleBranch({ git, env, log: silent });

	assert.deepEqual(result, { status: 'merged' });
	assert.deepEqual(
		git.calls.find((a) => a[0] === 'checkout'),
		['checkout', '--force', '-B', 'bundle/2.x', 'FETCH_HEAD'],
	);
	assert.deepEqual(git.calls.find(isMerge), [
		'merge',
		'--no-edit',
		'-m',
		'Merge master into bundle/2.x',
		BASE,
	]);
	// No lease and no --force: the branch is append-only, so a non-fast-forward must be
	// refused by git rather than resolved by overwriting whatever landed.
	assert.deepEqual(git.calls.find(isPush), ['push', REMOTE, 'HEAD:refs/heads/bundle/2.x']);
});

test('both fetches are authenticated — the private repo rejects an anonymous origin fetch', () => {
	const git = makeStub(baseGitRoutes);
	syncBundleBranch({ git, env, log: silent });

	assert.deepEqual(
		git.calls.filter((a) => a[0] === 'fetch'),
		[
			['fetch', REMOTE, 'master'],
			['fetch', REMOTE, 'bundle/2.x'],
		],
	);
});

test('a bundle branch that already contains its base is left alone', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge-base', ''], // --is-ancestor succeeds
		...baseGitRoutes,
	]);
	const result = syncBundleBranch({ git, env, log: silent });

	assert.deepEqual(result, { status: 'current' });
	assert.equal(git.calls.some(isMerge), false);
	assert.equal(git.calls.some(isPush), false);
});

test('a conflicting base fails without touching the branch', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge-tree', conflictedMergeTree('packages/cli/src/a.ts')],
		...baseGitRoutes,
	]);
	const logs = [];

	assert.throws(() => syncBundleBranch({ git, env, log: (m) => logs.push(m) }), {
		message: /master conflicts with bundle\/2\.x/,
	});
	// The conflict is detected from the merge tree alone: no merge, no push.
	assert.equal(git.calls.some(isMerge), false);
	assert.equal(git.calls.some(isPush), false);
	assert.match(logs.join('\n'), /::error title=bundle\/2\.x is out of sync::/);
	assert.match(logs.join('\n'), /packages\/cli\/src\/a\.ts/);
});

test('a merged tree that is not the merge tree refuses to push', () => {
	const git = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'SOMEOTHERTREE'],
		...baseGitRoutes,
	]);

	assert.throws(() => syncBundleBranch({ git, env, log: silent }), {
		message: /does not match the merge tree MERGETREEOID; refusing to push/,
	});
	assert.equal(git.calls.some(isPush), false);
});

test('conflict markers in the merged tree refuse to push', () => {
	const git = makeStub([
		[(a) => a[0] === 'grep', 'packages/cli/src/a.ts'], // git grep found markers
		...baseGitRoutes,
	]);

	assert.throws(() => syncBundleBranch({ git, env, log: silent }), {
		message: /conflict markers present in HEAD/,
	});
	assert.equal(git.calls.some(isPush), false);
});

test('a fix landing mid-run is retried from a fresh fetch, never forced', () => {
	let pushes = 0;
	const git = makeStub([
		[
			isPush,
			() => {
				pushes += 1;
				if (pushes === 1) throw Object.assign(new Error('rejected'), { status: 1 });
				return '';
			},
		],
		...baseGitRoutes,
	]);
	const result = syncBundleBranch({ git, env, log: silent });

	assert.deepEqual(result, { status: 'merged' });
	assert.equal(pushes, 2);
	// The retry re-fetches rather than reusing the tip it already merged onto.
	assert.equal(git.calls.filter((a) => a[0] === 'fetch').length, 4);
	assert.equal(
		git.calls.every((a) => !a.some((arg) => String(arg).includes('force-with-lease'))),
		true,
	);
});

test('a branch that keeps moving fails instead of forcing', () => {
	const git = makeStub([[isPush, fail('non-fast-forward')], ...baseGitRoutes]);

	assert.throws(() => syncBundleBranch({ git, env, log: silent }), {
		message: /bundle\/2\.x kept moving while syncing/,
	});
});

test('a bundle branch that does not exist yet is created at its base', () => {
	const git = makeStub([[(a) => a[0] === 'ls-remote', ''], ...baseGitRoutes]);
	const result = syncBundleBranch({ git, env, log: silent });

	assert.deepEqual(result, { status: 'created' });
	assert.deepEqual(
		git.calls.find((a) => a[0] === 'checkout'),
		['checkout', '--force', '-B', 'bundle/2.x', BASE],
	);
	assert.equal(git.calls.some(isMerge), false);
	assert.deepEqual(
		git.calls.filter((a) => a[0] === 'fetch'),
		[['fetch', REMOTE, 'master']],
	);
	assert.deepEqual(git.calls.find(isPush), ['push', REMOTE, 'HEAD:refs/heads/bundle/2.x']);
});

test('a remote that cannot be listed fails instead of re-creating the branch', () => {
	const git = makeStub([[(a) => a[0] === 'ls-remote', fail()], ...baseGitRoutes]);

	assert.throws(() => syncBundleBranch({ git, env, log: silent }), {
		message: /Could not check whether bundle\/2\.x exists on the remote/,
	});
	assert.equal(git.calls.some(isPush), false);
});

test('a branch created under us mid-run is merged into on the retry', () => {
	let lsRemotes = 0;
	let pushes = 0;
	const git = makeStub([
		[
			(a) => a[0] === 'ls-remote',
			() => (++lsRemotes === 1 ? '' : `${PRE_HEAD}\trefs/heads/bundle/2.x`),
		],
		[
			isPush,
			() => {
				if (++pushes === 1) throw Object.assign(new Error('rejected'), { status: 1 });
				return '';
			},
		],
		...baseGitRoutes,
	]);
	const result = syncBundleBranch({ git, env, log: silent });

	assert.deepEqual(result, { status: 'merged' });
	assert.equal(pushes, 2);
	assert.equal(git.calls.filter(isMerge).length, 1);
});

test('annotation keeps a multi-line message on one line', () => {
	assert.equal(annotation('t', 'a\nb'), '::error title=t::a%0Ab');
});
