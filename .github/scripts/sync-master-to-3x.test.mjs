import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	hasOpenConflictPr,
	mergeTree,
	tryRebase,
	assertTree,
	assertNoMarkers,
	buildConflictBranch,
	openConflictPr,
	sync,
	targetBranch,
	CONFLICT_LABEL,
	SYNC_BRANCH,
	TARGET_BRANCH,
} from './sync-master-to-3x.mjs';

// A git/gh stub: routes calls by a matcher, records every invocation.
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

const fail = (stdout = '') => () => {
	const err = new Error('command failed');
	err.status = 1;
	err.stdout = stdout;
	throw err;
};

const okFetch = (logins) => async () => ({
	ok: true,
	json: async () => ({ data: { repository: Object.fromEntries(logins.map((l, i) => [`c${i}`, { author: { user: { login: l } } }])) } }),
});

const PRE_HEAD = 'PREHEAD';
const MASTER = 'MASTERSHA';
const MERGE_TREE = 'MERGETREEOID';

const isRebase = (a) => a[0] === 'rebase' && a[1] !== '--abort';
const favouringOwnSide = (a) => a[0] === 'rebase' && a.includes('-X') && a.includes('theirs');

// Routes shared by every sync path: master fetched, 3.x hasn't absorbed it yet, and the
// merge tree is computable (no new conflict). git grep exits non-zero => no markers.
const baseGitRoutes = [
	[(a) => a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD', MASTER],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', PRE_HEAD],
	[(a) => a[0] === 'merge-base', fail()],
	[(a) => a[0] === 'merge-tree', MERGE_TREE],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', MERGE_TREE],
	[(a) => a[0] === 'grep', fail()],
];

const env = { GH_TOKEN: 'tok', GITHUB_REPOSITORY: 'n8n-io/n8n' };
const noOpenPr = [[(a) => a[0] === 'pr' && a[1] === 'list', '[]']];

test('targetBranch defaults to 3.x and honours the rehearsal override', () => {
	assert.equal(targetBranch({}), TARGET_BRANCH);
	assert.equal(targetBranch({ SYNC_TARGET_BRANCH: '3x-sync-test' }), '3x-sync-test');
});

test('hasOpenConflictPr reflects the open-PR count from gh', () => {
	const empty = makeStub([[() => true, '[]']]);
	assert.equal(hasOpenConflictPr(empty), false);
	assert.deepEqual(empty.calls[0], ['pr', 'list', '--state', 'open', '--label', CONFLICT_LABEL, '--json', 'number']);

	const one = makeStub([[() => true, JSON.stringify([{ number: 42 }])]]);
	assert.equal(hasOpenConflictPr(one), true);
});

test('mergeTree reports the tree when clean and not-ok when the sides conflict', () => {
	const clean = makeStub([[() => true, `${MERGE_TREE}\nsome extra output`]]);
	assert.deepEqual(mergeTree(clean, 'A', 'B'), { ok: true, tree: MERGE_TREE, out: `${MERGE_TREE}\nsome extra output` });
	assert.deepEqual(clean.calls[0], ['merge-tree', '--write-tree', 'A', 'B']);

	const conflicting = makeStub([[() => true, fail('CONFLICT (content): x.ts')]]);
	assert.equal(mergeTree(conflicting, 'A', 'B').ok, false);
});

test('tryRebase replays onto master and can favour a side', () => {
	const git = makeStub([[(a) => a[0] === 'rebase', '']]);
	assert.equal(tryRebase(git, MASTER, () => {}), true);
	assert.deepEqual(git.calls[0], ['rebase', MASTER]);

	assert.equal(tryRebase(git, MASTER, () => {}, ['-X', 'theirs']), true);
	assert.deepEqual(git.calls[1], ['rebase', '-X', 'theirs', MASTER]);
});

test('assertTree and assertNoMarkers are the push guards', () => {
	assert.doesNotThrow(() => assertTree(makeStub([[() => true, MERGE_TREE]]), MERGE_TREE));
	assert.throws(() => assertTree(makeStub([[() => true, 'OTHER']]), MERGE_TREE), /does not match the merge tree/);

	assert.doesNotThrow(() => assertNoMarkers(makeStub([[() => true, fail()]])));
	assert.throws(() => assertNoMarkers(makeStub([[() => true, 'packages/cli/x.ts']])), /conflict markers present/);
	// git grep failing for any other reason must not read as "clean".
	assert.throws(() => assertNoMarkers(makeStub([[() => true, fail('fatal: bad object')]])), /Could not scan/);
});

test('sync replays and force-pushes with a lease, creating no commit', async () => {
	const git = makeStub([...baseGitRoutes, [isRebase, '']]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, env, log: () => {} });

	const push = git.calls.find((a) => a[0] === 'push');
	assert.deepEqual(push, [
		'push',
		`--force-with-lease=refs/heads/${TARGET_BRANCH}:${PRE_HEAD}`,
		'https://x-access-token:tok@github.com/n8n-io/n8n.git',
		`HEAD:refs/heads/${TARGET_BRANCH}`,
	]);
	// The point of the change: no merge, no squash, no PR on the clean path.
	assert.equal(git.calls.some((a) => a[0] === 'merge'), false);
	assert.equal(git.calls.some((a) => a[0] === 'commit'), false);
	assert.equal(gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'), false);
});

test('sync targets the rehearsal branch when SYNC_TARGET_BRANCH is set', async () => {
	const git = makeStub([...baseGitRoutes, [isRebase, '']]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, env: { ...env, SYNC_TARGET_BRANCH: '3x-sync-test' }, log: () => {} });

	assert.equal(git.calls.find((a) => a[0] === 'push').at(-1), 'HEAD:refs/heads/3x-sync-test');
});

test('sync does nothing when 3.x already contains master', async () => {
	const git = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD', MASTER],
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', PRE_HEAD],
		[(a) => a[0] === 'merge-base', ''], // --is-ancestor succeeds
	]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, env, log: () => {} });

	assert.equal(git.calls.some((a) => a[0] === 'rebase'), false, 'must not rebase');
	assert.equal(git.calls.some((a) => a[0] === 'push'), false, 'must not push');
});

test('sync refuses to push when the replayed tree is not the merge tree', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['rev-parse', 'HEAD^{tree}'])),
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'OTHERTREE'],
		[isRebase, ''],
	]);
	const gh = makeStub(noOpenPr);

	await assert.rejects(() => sync({ git, gh, env, log: () => {} }), /does not match the merge tree/);
	assert.equal(git.calls.some((a) => a[0] === 'push'), false, 'must not push a suspect rewrite');
});

test('sync halts (no fetch/rebase) when a conflict PR is already open', async () => {
	const git = makeStub();
	const gh = makeStub([[(a) => a[0] === 'pr' && a[1] === 'list', JSON.stringify([{ number: 7 }])]]);

	await sync({ git, gh, env, log: () => {} });

	assert.equal(git.calls.length, 0, 'must not touch git while halted');
});

test('sync replays favouring 3.x when the patches no longer apply on their own', async () => {
	// A previous conflict was resolved in a merge: content reconciles (merge-tree is clean)
	// but the plain replay stalls.
	const git = makeStub([
		...baseGitRoutes,
		[favouringOwnSide, ''],
		[isRebase, fail('CONFLICT (content): packages/cli/x.ts')],
	]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, env, log: () => {} });

	assert.ok(git.calls.some((a) => a[0] === 'rebase' && a[1] === '--abort'), 'stalled rebase must be aborted');
	assert.ok(git.calls.some(favouringOwnSide), 'expected the second replay to favour 3.x');
	assert.ok(git.calls.some((a) => a[0] === 'push'), 'expected the replay to be pushed');
	// Still no new commit and no PR: the resolver's own fix commit is already in the queue.
	assert.equal(git.calls.some((a) => a[0] === 'commit'), false);
	assert.equal(gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'), false);
});

test('sync fails without pushing when even the favoured replay cannot finish', async () => {
	const git = makeStub([...baseGitRoutes, [isRebase, fail('CONFLICT')]]);
	const gh = makeStub(noOpenPr);

	await assert.rejects(() => sync({ git, gh, env, log: () => {} }), /needs a human/);
	assert.equal(git.calls.some((a) => a[0] === 'push'), false);
	assert.equal(git.calls.filter((a) => a[0] === 'rebase' && a[1] === '--abort').length, 2);
});

test('buildConflictBranch commits the conflicted state, markers and all', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge', fail('CONFLICT (content): packages/cli/x.ts')],
		[(a) => a[0] === 'diff', 'packages/cli/x.ts'],
	]);

	const files = buildConflictBranch({ git, masterSha: MASTER, log: () => {} });

	assert.deepEqual(files, ['packages/cli/x.ts']);
	assert.deepEqual(git.calls[0], ['merge', '--no-edit', MASTER]);
	assert.ok(git.calls.some((a) => a[0] === 'add' && a[1] === '-A'));
	assert.ok(git.calls.some((a) => a[0] === 'commit' && a.includes('--no-edit')));
	// The markers ARE the review surface here, so nothing may auto-resolve them.
	assert.equal(git.calls.some((a) => a.includes('-X')), false);
	assert.equal(git.calls.some((a) => a[0] === 'merge' && a[1] === '--abort'), false);
});

test('buildConflictBranch refuses to guess when the merge unexpectedly succeeds', () => {
	const git = makeStub([[(a) => a[0] === 'merge', '']]);

	assert.throws(() => buildConflictBranch({ git, masterSha: MASTER, log: () => {} }), /Expected a merge conflict/);
	assert.equal(git.calls.some((a) => a[0] === 'commit'), false);
});

test('sync opens a draft conflict PR and leaves 3.x untouched on a real conflict', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['merge-tree'])),
		[(a) => a[0] === 'merge-tree', fail('CONFLICT (content): packages/cli/x.ts')],
		[(a) => a[0] === 'merge', fail('CONFLICT (content): packages/cli/x.ts')],
		[(a) => a[0] === 'diff', 'packages/cli/x.ts'],
		[(a) => a[0] === 'log', 'breaking-sha'],
	]);
	const gh = makeStub([
		...noOpenPr,
		[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/99'],
	]);

	await sync({ git, gh, env, fetchFn: okFetch(['alice']), log: () => {} });

	const create = gh.calls.find((a) => a[0] === 'pr' && a[1] === 'create');
	assert.ok(create.includes('--draft'));
	assert.equal(create[create.indexOf('--base') + 1], TARGET_BRANCH);
	assert.equal(create[create.indexOf('--head') + 1], SYNC_BRANCH);
	const body = create[create.indexOf('--body') + 1];
	assert.match(body, /Merge this PR with the normal merge button/);
	assert.match(body, /nothing is squashed/);
	assert.match(body, /conflict markers committed/);

	// Owner requested as reviewer.
	const edit = gh.calls.find((a) => a[0] === 'pr' && a[1] === 'edit');
	assert.equal(edit[edit.indexOf('--add-reviewer') + 1], 'alice');

	// Only the sync branch is pushed — 3.x must not move.
	const pushes = git.calls.filter((a) => a[0] === 'push');
	assert.equal(pushes.length, 1);
	assert.equal(pushes[0].at(-1), `HEAD:refs/heads/${SYNC_BRANCH}`);
	assert.equal(git.calls.some((a) => a[0] === 'rebase'), false, 'no replay attempt while a conflict is unresolved');
});

test('openConflictPr degrades gracefully when owner resolution fails', async () => {
	const git = makeStub([[(a) => a[0] === 'log', 'sha1']]);
	const gh = makeStub([[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/1']]);
	const failingFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

	const { prUrl, ownersSlack } = await openConflictPr({
		git,
		gh,
		repo: 'n8n-io/n8n',
		token: 't',
		masterSha: MASTER,
		preHead: PRE_HEAD,
		pushUrl: 'https://push',
		files: ['x.ts'],
		fetchFn: failingFetch,
		log: () => {},
	});

	assert.equal(prUrl, 'https://github.com/n8n-io/n8n/pull/1');
	assert.equal(ownersSlack, 'Could not auto-attribute owners.');
	// No reviewer request when there are no owners.
	assert.equal(gh.calls.some((a) => a[0] === 'pr' && a[1] === 'edit'), false);
});
