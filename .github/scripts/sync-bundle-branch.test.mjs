import assert from 'node:assert/strict';
import { test } from 'node:test';

import { annotation, syncBundleBranch } from './sync-bundle-branch.mjs';

// A git stub: routes calls by a matcher, records every invocation. Route results also receive
// the calls so far, which is how FETCH_HEAD is modelled — see `fetchHead`.
function makeStub(routes = []) {
	const calls = [];
	const fn = (args) => {
		calls.push(args);
		for (const [match, result] of routes) {
			if (match(args)) return typeof result === 'function' ? result(args, calls) : result;
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
const PUBLIC = 'PUBLICSHA';
const MERGE_TREE = 'MERGETREEOID';
const REMOTE = 'https://x-access-token:tok@github.com/n8n-io/n8n-private.git';
// Spelled out rather than imported: a duplicated literal is what makes the "the private token
// never reaches the public repo" assertion below a real one.
const PUBLIC_REMOTE = 'https://github.com/n8n-io/n8n.git';

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

// FETCH_HEAD is one slot holding whatever the last fetch brought down, so the stub has to answer
// by looking back at that fetch. Resolving both fetches to the same SHA would let the
// convergence guard pass by accident and assert nothing.
const fetchHead = (_args, calls) => {
	const [, url, ref] = [...calls].reverse().find((a) => a[0] === 'fetch') ?? [];
	if (url === PUBLIC_REMOTE) return PUBLIC;
	if (ref?.startsWith('bundle/')) return PRE_HEAD;
	return BASE;
};

// Routes shared by every path: base fetched and already published, the bundle branch hasn't
// absorbed it yet, the merge tree is computable, and the merge lands on exactly that tree. git
// grep exits non-zero => no markers.
const baseGitRoutes = [
	[(a) => a[0] === 'ls-remote', `${PRE_HEAD}\trefs/heads/bundle/2.x`],
	[(a) => a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD', fetchHead],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', PRE_HEAD],
	// Split by descendant: the base has reached public, but the bundle branch has not absorbed
	// it. One `merge-base` matcher would answer both and decide convergence by accident.
	[(a) => a[0] === 'merge-base' && a[3] === PUBLIC, ''],
	[(a) => a[0] === 'merge-base' && a[3] === PRE_HEAD, fail()],
	[(a) => a[0] === 'merge-tree', MERGE_TREE],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', MERGE_TREE],
	[(a) => a[0] === 'grep', fail()],
];

// A base that is ahead of public by the commits given, so the guard trips.
const unpublishedRoutes = (...lines) => [
	[(a) => a[0] === 'merge-base' && a[3] === PUBLIC, fail()],
	[(a) => a[0] === 'log' && a[1] === '--format=%h %s', lines.join('\n')],
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

test('the private fetches are authenticated and the public one is not', () => {
	const git = makeStub(baseGitRoutes);
	syncBundleBranch({ git, env, log: silent });

	// The private repo rejects an anonymous fetch; the public repo needs no credential.
	assert.deepEqual(
		git.calls.filter((a) => a[0] === 'fetch'),
		[
			['fetch', REMOTE, 'master'],
			['fetch', PUBLIC_REMOTE, 'master'],
			['fetch', REMOTE, 'bundle/2.x'],
		],
	);

	// The token is scoped to the private repo, so it must never be sent to the public one.
	assert.equal(
		git.calls.some((a) =>
			a.some((arg) => String(arg).includes('x-access-token') && String(arg).includes('/n8n.git')),
		),
		false,
	);
});

test('the public tip is read straight after its own fetch', () => {
	const git = makeStub(baseGitRoutes);
	syncBundleBranch({ git, env, log: silent });

	// Separating a fetch from the read that consumes it would silently pin the wrong SHA.
	assert.deepEqual(
		git.calls.filter((a) => a[0] === 'fetch' || (a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD')),
		[
			['fetch', REMOTE, 'master'],
			['rev-parse', 'FETCH_HEAD'],
			['fetch', PUBLIC_REMOTE, 'master'],
			['rev-parse', 'FETCH_HEAD'],
			['fetch', REMOTE, 'bundle/2.x'],
		],
	);
});

test('a bundle branch that already contains its base is left alone', () => {
	const git = makeStub([
		// Only the bundle-branch ancestry is overridden; the convergence probe keeps its own
		// answer from baseGitRoutes, or this would pass without the guard being exercised.
		[(a) => a[0] === 'merge-base' && a[3] === PRE_HEAD, ''], // --is-ancestor succeeds
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
	// The retry re-fetches rather than reusing the tip it already merged onto — including the
	// public tip, so the convergence guard is re-evaluated instead of carried over.
	assert.equal(git.calls.filter((a) => a[0] === 'fetch').length, 6);
	assert.equal(git.calls.filter((a) => a[1] === PUBLIC_REMOTE).length, 2);
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
		[
			['fetch', REMOTE, 'master'],
			['fetch', PUBLIC_REMOTE, 'master'],
		],
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

test('a base that has not reached the public repo is left alone', () => {
	const git = makeStub([
		...unpublishedRoutes('abc1234 chore: Bundle 2.x (#123)'),
		...baseGitRoutes,
	]);
	const logs = [];

	const result = syncBundleBranch({ git, env, log: (m) => logs.push(m) });

	assert.deepEqual(result, { status: 'unconverged' });
	// Nothing about the bundle branch is even asked: no existence probe, no fetch, no checkout.
	assert.equal(
		git.calls.some((a) => a[0] === 'ls-remote'),
		false,
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'checkout'),
		false,
	);
	assert.equal(git.calls.some(isMerge), false);
	assert.equal(git.calls.some(isPush), false);
	assert.equal(git.calls.filter((a) => a[0] === 'fetch').length, 2);
	assert.match(logs.join('\n'), /has not reached public master/);
});

test('a missing bundle branch is not created from an unpublished base', () => {
	const git = makeStub([
		[(a) => a[0] === 'ls-remote', ''],
		...unpublishedRoutes('abc1234 chore: Bundle/1.x'),
		...baseGitRoutes,
	]);

	// One guard covers both paths: the branch must not be conjured onto a doomed commit either.
	assert.deepEqual(syncBundleBranch({ git, env, log: silent }), { status: 'unconverged' });
	assert.equal(
		git.calls.some((a) => a[0] === 'checkout'),
		false,
	);
	assert.equal(git.calls.some(isPush), false);
});

test('a base ahead of public by a non-bundle commit fails loudly', () => {
	const git = makeStub([
		...unpublishedRoutes('abc1234 fix(core): Something a human pushed directly'),
		...baseGitRoutes,
	]);
	const logs = [];

	assert.throws(() => syncBundleBranch({ git, env, log: (m) => logs.push(m) }), {
		message: /master is ahead of public by commits that are not bundle cuts/,
	});
	assert.equal(git.calls.some(isPush), false);

	// The annotation is the headline of a failed run: a count, never a subject.
	const annotations = logs.filter((m) => m.startsWith('::error'));
	assert.match(annotations.join('\n'), /carries 1 commit\(s\)/);
	assert.doesNotMatch(annotations.join('\n'), /Something a human pushed directly/);
});

test('one stray commit among bundle cuts still fails', () => {
	const git = makeStub([
		...unpublishedRoutes('abc1234 chore: Bundle 2.x (#123)', 'def5678 fix(core): Stray'),
		...baseGitRoutes,
	]);

	// All-or-nothing: a single unexplained commit means the mirror cannot clear the base.
	assert.throws(() => syncBundleBranch({ git, env, log: silent }), {
		message: /not bundle cuts/,
	});
});

test('an unrelated history skips rather than forcing anything', () => {
	const git = makeStub([...unpublishedRoutes(), ...baseGitRoutes]);

	// Ancestry fails but the range is empty, so there is nothing to classify. Skipping is the
	// only safe default here.
	assert.deepEqual(syncBundleBranch({ git, env, log: silent }), { status: 'unconverged' });
	assert.equal(git.calls.some(isPush), false);
});

test('an unconverged base is not retried as a push race', () => {
	const git = makeStub([...unpublishedRoutes('abc1234 chore: Bundle 2.x'), ...baseGitRoutes]);
	const logs = [];

	syncBundleBranch({ git, env, log: (m) => logs.push(m) });

	// Only 'rejected' earns a second attempt; the mirror runs hourly, not within this run.
	assert.equal(git.calls.filter((a) => a[0] === 'fetch').length, 2);
	assert.doesNotMatch(logs.join('\n'), /retrying/);
});

test('a public fetch that fails stops the run instead of guessing', () => {
	const git = makeStub([
		[(a) => a[0] === 'fetch' && a[1] === PUBLIC_REMOTE, fail('could not read from remote')],
		...baseGitRoutes,
	]);

	assert.throws(() => syncBundleBranch({ git, env, log: silent }), {
		message: /Could not fetch master from the public repo/,
	});
	assert.equal(
		git.calls.some((a) => a[0] === 'checkout'),
		false,
	);
	assert.equal(git.calls.some(isPush), false);
});

test('the 1.x bundle branch is checked against public 1.x', () => {
	const git = makeStub([
		[(a) => a[0] === 'ls-remote', `${PRE_HEAD}\trefs/heads/bundle/1.x`],
		...baseGitRoutes,
	]);
	syncBundleBranch({
		git,
		env: { ...env, BUNDLE_BRANCH: 'bundle/1.x', BASE_BRANCH: '1.x' },
		log: silent,
	});

	// The base branch name carries over to the public side unchanged.
	assert.deepEqual(
		git.calls.filter((a) => a[0] === 'fetch'),
		[
			['fetch', REMOTE, '1.x'],
			['fetch', PUBLIC_REMOTE, '1.x'],
			['fetch', REMOTE, 'bundle/1.x'],
		],
	);
});
