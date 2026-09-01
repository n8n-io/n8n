import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	hasOpenConflictPr,
	mergeTree,
	classifyPaths,
	blocksLockfileRegen,
	resolveMechanicalPath,
	resolveQueueSidePath,
	deleteModifyConflicts,
	rebaseResolvingMechanical,
	reconcileWithMergeTreeAtTip,
	reconcileLockfileAtTip,
	assertTreeMatches,
	assertNoMarkers,
	buildConflictBranch,
	openConflictPr,
	sync,
	targetBranch,
	CONFLICT_LABEL,
	SYNC_BRANCH,
	TARGET_BRANCH,
	LOCKFILE,
} from './sync-master-to-3x.mjs';

// A git/gh/pnpm stub: routes calls by a matcher, records every invocation.
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

const okFetch = (logins) => async () => ({
	ok: true,
	json: async () => ({
		data: {
			repository: Object.fromEntries(
				logins.map((l, i) => [`c${i}`, { author: { user: { login: l } } }]),
			),
		},
	}),
});

const PRE_HEAD = 'PREHEAD';
const MASTER = 'MASTERSHA';
const MERGE_TREE = 'MERGETREEOID';
const POPULARITY = 'packages/frontend/editor-ui/data/node-popularity.json';

const isRebase = (a) => a[0] === 'rebase' && a[1] !== '--abort';
const favouringOwnSide = (a) => a[0] === 'rebase' && a.includes('-X') && a.includes('theirs');
const isConflictedFiles = (a) => a[0] === 'diff' && a.includes('--diff-filter=U');

// What `git merge-tree --write-tree --name-only` emits on a conflict: the (marker-carrying)
// tree OID, the conflicted paths, a blank line, then informational messages.
const conflictedMergeTree = (...paths) =>
	fail(`${MERGE_TREE}\n${paths.join('\n')}\n\nCONFLICT (content): Merge conflict in ${paths[0]}`);

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
	assert.deepEqual(empty.calls[0], [
		'pr',
		'list',
		'--state',
		'open',
		'--label',
		CONFLICT_LABEL,
		'--json',
		'number',
	]);

	const one = makeStub([[() => true, JSON.stringify([{ number: 42 }])]]);
	assert.equal(hasOpenConflictPr(one), true);
});

test('mergeTree reports the tree when clean, and the conflicted paths when the sides conflict', () => {
	const clean = makeStub([[() => true, `${MERGE_TREE}\nsome extra output`]]);
	assert.deepEqual(mergeTree(clean, 'A', 'B'), {
		ok: true,
		tree: MERGE_TREE,
		conflictedPaths: [],
		out: `${MERGE_TREE}\nsome extra output`,
	});
	assert.deepEqual(clean.calls[0], ['merge-tree', '--write-tree', '--name-only', 'A', 'B']);

	const conflicting = makeStub([
		[
			() => true,
			fail(
				`${MERGE_TREE}\n${LOCKFILE}\npackages/cli/x.ts\n\nAuto-merging ${LOCKFILE}\nCONFLICT (content): Merge conflict in ${LOCKFILE}`,
			),
		],
	]);
	const res = mergeTree(conflicting, 'A', 'B');
	assert.equal(res.ok, false);
	// The conflicted tree is still written — it is the baseline for the relaxed guard.
	assert.equal(res.tree, MERGE_TREE);
	assert.deepEqual(res.conflictedPaths, [LOCKFILE, 'packages/cli/x.ts']);
});

test('classifyPaths and blocksLockfileRegen split mechanical from code conflicts', () => {
	const { mechanical, code } = classifyPaths([
		LOCKFILE,
		'packages/cli/x.ts',
		'.github/test-metrics/e2e-impact-map.json',
	]);
	assert.deepEqual(mechanical, [LOCKFILE, '.github/test-metrics/e2e-impact-map.json']);
	assert.deepEqual(code, ['packages/cli/x.ts']);

	assert.equal(blocksLockfileRegen(['packages/cli/package.json']), true);
	assert.equal(blocksLockfileRegen(['package.json']), true);
	assert.equal(blocksLockfileRegen(['pnpm-workspace.yaml']), true);
	assert.equal(blocksLockfileRegen(['packages/cli/x.ts']), false);
});

test('resolveMechanicalPath takes the blob from master, or the deletion when master removed the file', () => {
	const present = makeStub([[(a) => a[0] === 'cat-file', '']]);
	resolveMechanicalPath({
		git: present,
		pnpm: makeStub(),
		path: POPULARITY,
		masterSha: MASTER,
		log: () => {},
	});
	assert.ok(
		present.calls.some((a) => a[0] === 'checkout' && a[1] === MASTER && a.includes(POPULARITY)),
	);

	const deleted = makeStub([[(a) => a[0] === 'cat-file', fail()]]);
	resolveMechanicalPath({
		git: deleted,
		pnpm: makeStub(),
		path: POPULARITY,
		masterSha: MASTER,
		log: () => {},
	});
	assert.ok(
		deleted.calls.some((a) => a[0] === 'rm' && a.includes('--force') && a.includes(POPULARITY)),
	);
});

test('resolveMechanicalPath regenerates the lockfile with pnpm and stages it', () => {
	const git = makeStub();
	const pnpm = makeStub();
	resolveMechanicalPath({ git, pnpm, path: LOCKFILE, masterSha: MASTER, log: () => {} });
	// `--no-frozen-lockfile` is load-bearing: pnpm defaults to frozen when CI=true.
	assert.deepEqual(pnpm.calls[0], ['install', '--lockfile-only', '--no-frozen-lockfile']);
	assert.ok(git.calls.some((a) => a[0] === 'add' && a.includes(LOCKFILE)));
});

test('rebaseResolvingMechanical resolves mechanical stalls in place and skips emptied commits', () => {
	const git = makeStub([
		[(a) => a[0] === 'rebase' && a[1] === '--skip', ''],
		[isRebase, fail(`CONFLICT (content): Merge conflict in ${POPULARITY}`)],
		[isConflictedFiles, POPULARITY],
		[(a) => a[0] === 'cat-file', ''],
		[(a) => a[0] === 'diff-index', ''], // resolution emptied the commit
	]);

	const res = rebaseResolvingMechanical({
		git,
		pnpm: makeStub(),
		masterSha: MASTER,
		log: () => {},
	});

	assert.equal(res.ok, true);
	assert.deepEqual(res.resolved, [POPULARITY]);
	assert.ok(git.calls.some((a) => a[0] === 'checkout' && a[1] === MASTER));
	assert.ok(git.calls.some((a) => a[0] === 'rebase' && a[1] === '--skip'));
});

test('rebaseResolvingMechanical bails as soon as a stall touches a code path', () => {
	const git = makeStub([
		[isRebase, fail('CONFLICT (content): Merge conflict in packages/cli/x.ts')],
		[isConflictedFiles, `packages/cli/x.ts\n${LOCKFILE}`],
	]);
	const pnpm = makeStub();

	const res = rebaseResolvingMechanical({ git, pnpm, masterSha: MASTER, log: () => {} });

	assert.equal(res.ok, false);
	assert.deepEqual(res.conflictedCode, ['packages/cli/x.ts']);
	// Nothing may be auto-resolved when human judgement is needed for the same stall.
	assert.equal(pnpm.calls.length, 0);
	assert.equal(
		git.calls.some((a) => a[0] === 'checkout'),
		false,
	);
});

test('resolveQueueSidePath takes the queue commit side, or its deletion when there is no stage 3', () => {
	const FILE = 'packages/cli/x.ts';
	const bothSides = makeStub([
		[(a) => a[0] === 'ls-files', `100644 aaa 2\t${FILE}\n100644 bbb 3\t${FILE}`],
	]);
	resolveQueueSidePath({ git: bothSides, path: FILE, log: () => {} });
	assert.ok(bothSides.calls.some((a) => a[0] === 'checkout' && a[1] === '--theirs'));
	assert.ok(bothSides.calls.some((a) => a[0] === 'add' && a.includes(FILE)));

	// modify/delete with the queue commit deleting: stages 1 and 2 only.
	const queueDeleted = makeStub([
		[(a) => a[0] === 'ls-files', `100644 aaa 1\t${FILE}\n100644 bbb 2\t${FILE}`],
	]);
	resolveQueueSidePath({ git: queueDeleted, path: FILE, log: () => {} });
	assert.ok(queueDeleted.calls.some((a) => a[0] === 'rm' && a.includes(FILE)));
	assert.equal(
		queueDeleted.calls.some((a) => a[0] === 'checkout'),
		false,
	);
});

test('rebaseResolvingMechanical with favourQueue resolves a modify/delete code stall and continues', () => {
	const FILE = 'packages/nodes-base/nodes/Function/Function.node.ts';
	const git = makeStub([
		[(a) => a[0] === 'rebase' && a[1] === '--continue', ''],
		[isRebase, fail(`CONFLICT (modify/delete): ${FILE} deleted in 0ff923a066`)],
		[isConflictedFiles, FILE],
		[(a) => a[0] === 'ls-files', `100644 aaa 1\t${FILE}\n100644 bbb 2\t${FILE}`],
		[(a) => a[0] === 'diff-index', fail()], // staged deletion -> continue, not skip
	]);
	const pnpm = makeStub();

	const res = rebaseResolvingMechanical({
		git,
		pnpm,
		masterSha: MASTER,
		favourQueue: true,
		log: () => {},
	});

	assert.equal(res.ok, true);
	assert.ok(git.calls.some((a) => a[0] === 'rm' && a.includes(FILE)));
	assert.ok(git.calls.some((a) => a[0] === 'rebase' && a[1] === '--continue'));
	// The stall carried no mechanical file, so nothing mechanical may be touched.
	assert.equal(pnpm.calls.length, 0);
});

test('assertTreeMatches is exact by default and scoped to the allowed paths otherwise', () => {
	assert.doesNotThrow(() => assertTreeMatches(makeStub([[() => true, MERGE_TREE]]), MERGE_TREE));
	assert.throws(
		() => assertTreeMatches(makeStub([[() => true, 'OTHER']]), MERGE_TREE),
		/does not match the merge tree/,
	);

	const onlyLockfile = makeStub([
		[(a) => a[0] === 'rev-parse', 'OTHER'],
		[(a) => a[0] === 'diff-tree', LOCKFILE],
	]);
	assert.doesNotThrow(() => assertTreeMatches(onlyLockfile, MERGE_TREE, [LOCKFILE]));

	const alsoCode = makeStub([
		[(a) => a[0] === 'rev-parse', 'OTHER'],
		[(a) => a[0] === 'diff-tree', `${LOCKFILE}\npackages/cli/x.ts`],
	]);
	assert.throws(() => assertTreeMatches(alsoCode, MERGE_TREE, [LOCKFILE]), /non-mechanical paths/);
});

test('assertNoMarkers is a push guard', () => {
	assert.doesNotThrow(() => assertNoMarkers(makeStub([[() => true, fail()]])));
	assert.throws(
		() => assertNoMarkers(makeStub([[() => true, 'packages/cli/x.ts']])),
		/conflict markers present/,
	);
	// git grep failing for any other reason must not read as "clean".
	assert.throws(
		() => assertNoMarkers(makeStub([[() => true, fail('fatal: bad object')]])),
		/Could not scan/,
	);
});

test('reconcileWithMergeTreeAtTip folds favoured-replay drift into the tip commit, never a master commit', () => {
	// No drift: nothing to do.
	const clean = makeStub([[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', MERGE_TREE]]);
	assert.deepEqual(
		reconcileWithMergeTreeAtTip({
			git: clean,
			mergedTree: MERGE_TREE,
			masterSha: MASTER,
			log: () => {},
		}),
		[],
	);
	assert.equal(
		clean.calls.some((a) => a[0] === 'commit'),
		false,
	);

	// Lockfile drift: take the merge tree's blob and amend the tip.
	const drifted = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'OTHER'],
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', PRE_HEAD],
		[(a) => a[0] === 'diff-tree', LOCKFILE],
		[(a) => a[0] === 'cat-file', ''],
	]);
	assert.deepEqual(
		reconcileWithMergeTreeAtTip({
			git: drifted,
			mergedTree: MERGE_TREE,
			masterSha: MASTER,
			log: () => {},
		}),
		[LOCKFILE],
	);
	assert.ok(
		drifted.calls.some((a) => a[0] === 'checkout' && a[1] === MERGE_TREE && a.includes(LOCKFILE)),
	);
	assert.ok(drifted.calls.some((a) => a[0] === 'commit' && a.includes('--amend')));

	// Excluded (mechanical) paths are left to their own reconciliation.
	const excluded = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'OTHER'],
		[(a) => a[0] === 'diff-tree', LOCKFILE],
	]);
	assert.deepEqual(
		reconcileWithMergeTreeAtTip({
			git: excluded,
			mergedTree: MERGE_TREE,
			masterSha: MASTER,
			excludePaths: [LOCKFILE],
			log: () => {},
		}),
		[],
	);
	assert.equal(
		excluded.calls.some((a) => a[0] === 'commit'),
		false,
	);

	// A path the merge deleted is removed, not checked out.
	const deleted = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'OTHER'],
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', PRE_HEAD],
		[(a) => a[0] === 'diff-tree', 'packages/cli/gone.ts'],
		[(a) => a[0] === 'cat-file', fail()],
	]);
	reconcileWithMergeTreeAtTip({
		git: deleted,
		mergedTree: MERGE_TREE,
		masterSha: MASTER,
		log: () => {},
	});
	assert.ok(deleted.calls.some((a) => a[0] === 'rm' && a.includes('packages/cli/gone.ts')));

	// Never rewrite a master commit.
	const atMasterTip = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'OTHER'],
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', MASTER],
		[(a) => a[0] === 'diff-tree', LOCKFILE],
	]);
	assert.throws(
		() =>
			reconcileWithMergeTreeAtTip({
				git: atMasterTip,
				mergedTree: MERGE_TREE,
				masterSha: MASTER,
				log: () => {},
			}),
		/amend a master commit/,
	);
});

test('reconcileLockfileAtTip folds an inconsistent lockfile into the tip commit, never a master commit', () => {
	const consistent = makeStub([[(a) => a[0] === 'diff', '']]);
	reconcileLockfileAtTip({ git: consistent, pnpm: makeStub(), masterSha: MASTER, log: () => {} });
	assert.equal(
		consistent.calls.some((a) => a[0] === 'commit'),
		false,
	);

	const inconsistent = makeStub([
		[(a) => a[0] === 'diff', fail()],
		[(a) => a[0] === 'rev-parse', PRE_HEAD],
	]);
	const pnpm = makeStub();
	reconcileLockfileAtTip({ git: inconsistent, pnpm, masterSha: MASTER, log: () => {} });
	assert.deepEqual(pnpm.calls[0], ['install', '--lockfile-only', '--no-frozen-lockfile']);
	assert.ok(inconsistent.calls.some((a) => a[0] === 'commit' && a.includes('--amend')));

	const atMasterTip = makeStub([
		[(a) => a[0] === 'diff', fail()],
		[(a) => a[0] === 'rev-parse', MASTER],
	]);
	assert.throws(
		() =>
			reconcileLockfileAtTip({
				git: atMasterTip,
				pnpm: makeStub(),
				masterSha: MASTER,
				log: () => {},
			}),
		/amend a master commit/,
	);
});

test('sync replays and force-pushes with a lease, creating no commit', async () => {
	const git = makeStub([...baseGitRoutes, [isRebase, '']]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, pnpm: makeStub(), env, log: () => {} });

	const push = git.calls.find((a) => a[0] === 'push');
	assert.deepEqual(push, [
		'push',
		`--force-with-lease=refs/heads/${TARGET_BRANCH}:${PRE_HEAD}`,
		'https://x-access-token:tok@github.com/n8n-io/n8n.git',
		`HEAD:refs/heads/${TARGET_BRANCH}`,
	]);
	// The point of the change: no merge, no squash, no PR on the clean path.
	assert.equal(
		git.calls.some((a) => a[0] === 'merge'),
		false,
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'commit'),
		false,
	);
	assert.equal(
		gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'),
		false,
	);
});

test('sync targets the rehearsal branch when SYNC_TARGET_BRANCH is set', async () => {
	const git = makeStub([...baseGitRoutes, [isRebase, '']]);
	const gh = makeStub(noOpenPr);

	await sync({
		git,
		gh,
		pnpm: makeStub(),
		env: { ...env, SYNC_TARGET_BRANCH: '3x-sync-test' },
		log: () => {},
	});

	assert.equal(git.calls.find((a) => a[0] === 'push').at(-1), 'HEAD:refs/heads/3x-sync-test');
});

test('sync does nothing when 3.x already contains master', async () => {
	const git = makeStub([
		[(a) => a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD', MASTER],
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD', PRE_HEAD],
		[(a) => a[0] === 'merge-base', ''], // --is-ancestor succeeds
	]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, pnpm: makeStub(), env, log: () => {} });

	assert.equal(
		git.calls.some((a) => a[0] === 'rebase'),
		false,
		'must not rebase',
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'push'),
		false,
		'must not push',
	);
});

test('sync refuses to push when the replayed tree is not the merge tree', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['rev-parse', 'HEAD^{tree}'])),
		[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', 'OTHERTREE'],
		[isRebase, ''],
	]);
	const gh = makeStub(noOpenPr);

	await assert.rejects(
		() => sync({ git, gh, pnpm: makeStub(), env, log: () => {} }),
		/does not match the merge tree/,
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'push'),
		false,
		'must not push a suspect rewrite',
	);
});

test('sync halts (no fetch/rebase) when a conflict PR is already open', async () => {
	const git = makeStub();
	const gh = makeStub([[(a) => a[0] === 'pr' && a[1] === 'list', JSON.stringify([{ number: 7 }])]]);

	await sync({ git, gh, pnpm: makeStub(), env, log: () => {} });

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

	await sync({ git, gh, pnpm: makeStub(), env, log: () => {} });

	assert.ok(
		git.calls.some((a) => a[0] === 'rebase' && a[1] === '--abort'),
		'stalled rebase must be aborted',
	);
	assert.ok(git.calls.some(favouringOwnSide), 'expected the second replay to favour 3.x');
	assert.ok(
		git.calls.some((a) => a[0] === 'push'),
		'expected the replay to be pushed',
	);
	// Still no new commit and no PR: the resolver's own fix commit is already in the queue.
	assert.equal(
		git.calls.some((a) => a[0] === 'commit'),
		false,
	);
	assert.equal(
		gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'),
		false,
	);
});

test('sync recovers when the favoured replay stalls on a modify/delete conflict', async () => {
	// The endpoints reconcile (merge-tree is clean) because a fix commit in the queue
	// re-deletes the file — but replaying the deleting commit itself stalls on
	// modify/delete, which `-X theirs` never settles on its own.
	const FILE = 'packages/nodes-base/nodes/Function/Function.node.ts';
	const git = makeStub([
		...baseGitRoutes,
		[(a) => a[0] === 'rebase' && a[1] === '--continue', ''],
		[isRebase, fail(`CONFLICT (modify/delete): ${FILE} deleted in 0ff923a066`)],
		[isConflictedFiles, FILE],
		[(a) => a[0] === 'ls-files', `100644 aaa 1\t${FILE}\n100644 bbb 2\t${FILE}`],
		[(a) => a[0] === 'diff-index', fail()],
	]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, pnpm: makeStub(), env, log: () => {} });

	assert.ok(
		git.calls.some((a) => a[0] === 'rm' && a.includes(FILE)),
		'expected the queue-side deletion to be taken',
	);
	assert.ok(
		git.calls.some((a) => a[0] === 'push'),
		'expected the replay to be pushed',
	);
	// Still no new commit and no PR — the fix commit in the queue does the real work.
	assert.equal(
		git.calls.some((a) => a[0] === 'commit'),
		false,
	);
	assert.equal(
		gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'),
		false,
	);
});

test('sync folds favoured-replay drift back to the merge tree before pushing', async () => {
	// The favoured replay finishes but its tip drifts from the merge tree (the lockfile
	// hunks `-X theirs` resolved toward 3.x): the drift is folded back, then pushed.
	let treeReads = 0;
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['rev-parse', 'HEAD^{tree}'])),
		[
			(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}',
			() => (treeReads++ === 0 ? 'DRIFTED' : MERGE_TREE),
		],
		[(a) => a[0] === 'diff-tree', LOCKFILE],
		[(a) => a[0] === 'cat-file', ''],
		[favouringOwnSide, ''],
		[isRebase, fail('CONFLICT (content): packages/cli/x.ts')],
	]);
	const gh = makeStub(noOpenPr);

	await sync({ git, gh, pnpm: makeStub(), env, log: () => {} });

	assert.ok(git.calls.some((a) => a[0] === 'checkout' && a[1] === MERGE_TREE));
	assert.ok(git.calls.some((a) => a[0] === 'commit' && a.includes('--amend')));
	assert.ok(
		git.calls.some((a) => a[0] === 'push'),
		'expected the reconciled replay to be pushed',
	);
	assert.equal(
		gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'),
		false,
	);
});

test('sync fails without pushing when even the favoured replay cannot finish', async () => {
	const git = makeStub([
		...baseGitRoutes,
		[isRebase, fail('rebase failed for a non-conflict reason')],
		// No conflicted files: nothing the driver may resolve — don't guess.
		[isConflictedFiles, ''],
	]);
	const gh = makeStub(noOpenPr);

	await assert.rejects(
		() => sync({ git, gh, pnpm: makeStub(), env, log: () => {} }),
		/needs a human/,
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'push'),
		false,
	);
	assert.equal(git.calls.filter((a) => a[0] === 'rebase' && a[1] === '--abort').length, 2);
});

test('sync auto-resolves a lockfile-only conflict during the replay — no PR, no commit', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['merge-tree'])),
		[(a) => a[0] === 'merge-tree', conflictedMergeTree(LOCKFILE)],
		[(a) => a[0] === 'rebase' && a[1] === '--continue', ''],
		[isRebase, fail(`CONFLICT (content): Merge conflict in ${LOCKFILE}`)],
		[isConflictedFiles, LOCKFILE],
		[(a) => a[0] === 'diff' && a.includes('--quiet'), ''], // tip lockfile already consistent
		[(a) => a[0] === 'diff-index', fail()], // staged resolution -> continue, not skip
	]);
	const gh = makeStub(noOpenPr);
	const pnpm = makeStub();

	await sync({ git, gh, pnpm, env, log: () => {} });

	// The stall regen plus the tip reconciliation check.
	assert.deepEqual(pnpm.calls[0], ['install', '--lockfile-only', '--no-frozen-lockfile']);
	assert.equal(pnpm.calls.length, 2);
	assert.ok(git.calls.some((a) => a[0] === 'add' && a.includes(LOCKFILE)));
	assert.ok(git.calls.some((a) => a[0] === 'rebase' && a[1] === '--continue'));
	const push = git.calls.find((a) => a[0] === 'push');
	assert.equal(push[1], `--force-with-lease=refs/heads/${TARGET_BRANCH}:${PRE_HEAD}`);
	// No human surface: no merge commit, no amend, no conflict PR.
	assert.equal(
		git.calls.some((a) => a[0] === 'merge'),
		false,
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'commit'),
		false,
	);
	assert.equal(
		gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'),
		false,
	);
});

test('sync falls back to a conflict PR when mechanical auto-resolution cannot complete', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['merge-tree'])),
		[(a) => a[0] === 'merge-tree', conflictedMergeTree(LOCKFILE)],
		[isRebase, fail('CONFLICT')],
		// Both replay attempts stall on a code file the endpoints do not reconcile.
		[isConflictedFiles, 'packages/cli/x.ts'],
		[(a) => a[0] === 'merge', fail('CONFLICT (content): Merge conflict in packages/cli/x.ts')],
		[(a) => a[0] === 'log', 'breaking-sha'],
	]);
	const gh = makeStub([
		...noOpenPr,
		[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/99'],
	]);

	await sync({ git, gh, pnpm: makeStub(), env, fetchFn: okFetch(['alice']), log: () => {} });

	assert.ok(
		gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'),
		'expected the fallback conflict PR',
	);
	// Only the sync branch is pushed — 3.x must not move after a failed auto-resolution.
	const pushes = git.calls.filter((a) => a[0] === 'push');
	assert.equal(pushes.length, 1);
	assert.equal(pushes[0].at(-1), `HEAD:refs/heads/${SYNC_BRANCH}`);
});

test('buildConflictBranch commits the conflicted state, markers and all', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge', fail('CONFLICT (content): packages/cli/x.ts')],
		[isConflictedFiles, 'packages/cli/x.ts'],
	]);

	const { files, preResolved, lockfileDeferred } = buildConflictBranch({
		git,
		pnpm: makeStub(),
		masterSha: MASTER,
		log: () => {},
	});

	assert.deepEqual(files, ['packages/cli/x.ts']);
	assert.deepEqual(preResolved, []);
	assert.equal(lockfileDeferred, false);
	assert.deepEqual(git.calls[0], ['merge', '--no-edit', MASTER]);
	assert.equal(
		git.calls.some((a) => a[0] === 'rm'),
		false,
		'a content conflict keeps its markers',
	);
	assert.ok(git.calls.some((a) => a[0] === 'add' && a[1] === '-A'));
	assert.ok(git.calls.some((a) => a[0] === 'commit' && a.includes('--no-edit')));
	// The markers ARE the review surface here, so nothing may auto-resolve them.
	assert.equal(
		git.calls.some((a) => a.includes('-X')),
		false,
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'merge' && a[1] === '--abort'),
		false,
	);
});

test('deleteModifyConflicts tells the deleting side apart, and ignores add/add', () => {
	const stages = {
		'gone-on-3x.json': '100644 oid 1\tgone-on-3x.json\n100644 oid 3\tgone-on-3x.json',
		'gone-on-master.ts': '100644 oid 1\tgone-on-master.ts\n100644 oid 2\tgone-on-master.ts',
		'both-added.ts': '100644 oid 2\tboth-added.ts\n100644 oid 3\tboth-added.ts',
		'content.ts': '100644 oid 1\tcontent.ts\n100644 oid 2\tcontent.ts\n100644 oid 3\tcontent.ts',
	};
	const git = (args) => stages[args.at(-1)] ?? '';

	assert.deepEqual(deleteModifyConflicts(git, Object.keys(stages)), [
		{ path: 'gone-on-3x.json', deletedBy: 'target' },
		{ path: 'gone-on-master.ts', deletedBy: 'master' },
	]);
});

test('buildConflictBranch resolves marker-less delete/modify conflicts toward 3.x', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge', fail('CONFLICT (modify/delete): fixtures/a.json')],
		[isConflictedFiles, 'fixtures/a.json\nsrc/b.ts'],
		[
			(a) => a[0] === 'ls-files',
			(a) =>
				a.at(-1) === 'fixtures/a.json'
					? '100644 oid 1\tfixtures/a.json\n100644 oid 3\tfixtures/a.json'
					: '100644 oid 1\tsrc/b.ts\n100644 oid 2\tsrc/b.ts',
		],
	]);

	const { files, deleteConflicts } = buildConflictBranch({
		git,
		pnpm: makeStub(),
		masterSha: MASTER,
		log: () => {},
	});

	// Both are marker-less, so neither belongs in the "conflicted files" list.
	assert.deepEqual(files, []);
	assert.deepEqual(deleteConflicts, [
		{ path: 'fixtures/a.json', deletedBy: 'target' },
		{ path: 'src/b.ts', deletedBy: 'master' },
	]);
	// 3.x deleted the fixture: keep the deletion rather than master's re-added blob.
	assert.ok(git.calls.some((a) => a[0] === 'rm' && a.at(-1) === 'fixtures/a.json'));
	// master deleted the source file: keep 3.x's.
	assert.ok(git.calls.some((a) => a[0] === 'checkout' && a.includes('--ours')));
});

test('buildConflictBranch pre-resolves mechanical files so only code conflicts remain', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge', fail('CONFLICT')],
		[isConflictedFiles, `packages/cli/x.ts\n${LOCKFILE}\n${POPULARITY}`],
		[(a) => a[0] === 'cat-file', ''],
	]);
	const pnpm = makeStub();

	const { files, preResolved, lockfileDeferred } = buildConflictBranch({
		git,
		pnpm,
		masterSha: MASTER,
		log: () => {},
	});

	assert.deepEqual(files, ['packages/cli/x.ts']);
	assert.deepEqual(preResolved, [LOCKFILE, POPULARITY]);
	assert.equal(lockfileDeferred, false);
	assert.deepEqual(pnpm.calls[0], ['install', '--lockfile-only', '--no-frozen-lockfile']);
	assert.ok(
		git.calls.some((a) => a[0] === 'checkout' && a[1] === MASTER && a.includes(POPULARITY)),
	);
});

test('buildConflictBranch defers the lockfile when a manifest is conflicted too', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge', fail('CONFLICT')],
		[isConflictedFiles, `packages/cli/package.json\n${LOCKFILE}`],
	]);
	const pnpm = makeStub();

	const { files, preResolved, lockfileDeferred } = buildConflictBranch({
		git,
		pnpm,
		masterSha: MASTER,
		log: () => {},
	});

	assert.deepEqual(files, ['packages/cli/package.json']);
	assert.deepEqual(preResolved, []);
	assert.equal(lockfileDeferred, true);
	assert.equal(pnpm.calls.length, 0, 'regen is meaningless until the manifests are resolved');
});

test('buildConflictBranch degrades to a deferred lockfile when the regen fails', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge', fail('CONFLICT')],
		[isConflictedFiles, `packages/cli/x.ts\n${LOCKFILE}`],
	]);
	const pnpm = makeStub([[() => true, fail('ERR_PNPM_REGISTRY unreachable')]]);

	const { files, preResolved, lockfileDeferred } = buildConflictBranch({
		git,
		pnpm,
		masterSha: MASTER,
		log: () => {},
	});

	assert.deepEqual(files, ['packages/cli/x.ts']);
	assert.deepEqual(preResolved, []);
	assert.equal(lockfileDeferred, true);
	assert.ok(
		git.calls.some((a) => a[0] === 'commit'),
		'the conflict branch must still be committed',
	);
});

test('buildConflictBranch refuses to guess when the merge unexpectedly succeeds', () => {
	const git = makeStub([[(a) => a[0] === 'merge', '']]);

	assert.throws(
		() => buildConflictBranch({ git, pnpm: makeStub(), masterSha: MASTER, log: () => {} }),
		/Expected a merge conflict/,
	);
	assert.equal(
		git.calls.some((a) => a[0] === 'commit'),
		false,
	);
});

test('sync opens a draft conflict PR and leaves 3.x untouched on a real conflict', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['merge-tree'])),
		[(a) => a[0] === 'merge-tree', conflictedMergeTree('packages/cli/x.ts')],
		[(a) => a[0] === 'merge', fail('CONFLICT (content): packages/cli/x.ts')],
		[isConflictedFiles, 'packages/cli/x.ts'],
		[(a) => a[0] === 'log', 'breaking-sha'],
	]);
	const gh = makeStub([
		...noOpenPr,
		[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/99'],
	]);

	await sync({ git, gh, pnpm: makeStub(), env, fetchFn: okFetch(['alice']), log: () => {} });

	const create = gh.calls.find((a) => a[0] === 'pr' && a[1] === 'create');
	assert.ok(create.includes('--draft'));
	assert.equal(create[create.indexOf('--base') + 1], TARGET_BRANCH);
	assert.equal(create[create.indexOf('--head') + 1], SYNC_BRANCH);
	const body = create[create.indexOf('--body') + 1];
	assert.match(body, /Merge this PR with the normal merge button/);
	assert.match(body, /nothing is squashed/);
	assert.match(body, /conflict markers included/);
	assert.match(body, /- @alice/);

	// Reviewers are never requested — the body and the Slack post are the ping.
	assert.equal(
		gh.calls.some((a) => a[0] === 'pr' && a[1] === 'edit'),
		false,
	);

	// Only the sync branch is pushed — 3.x must not move.
	const pushes = git.calls.filter((a) => a[0] === 'push');
	assert.equal(pushes.length, 1);
	assert.equal(pushes[0].at(-1), `HEAD:refs/heads/${SYNC_BRANCH}`);
	assert.equal(
		git.calls.some((a) => a[0] === 'rebase'),
		false,
		'no replay attempt while a code conflict is unresolved',
	);
});

test('sync reports only the code conflicts on a mixed conflict, with mechanical files pre-resolved', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['merge-tree'])),
		[(a) => a[0] === 'merge-tree', conflictedMergeTree(LOCKFILE, 'packages/cli/x.ts')],
		[(a) => a[0] === 'merge', fail('CONFLICT')],
		[isConflictedFiles, `packages/cli/x.ts\n${LOCKFILE}`],
		[(a) => a[0] === 'log' && a.includes('--format=%H'), 'breaking-sha'],
	]);
	const gh = makeStub([
		...noOpenPr,
		[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/99'],
	]);
	const pnpm = makeStub();

	await sync({ git, gh, pnpm, env, fetchFn: okFetch(['alice']), log: () => {} });

	assert.equal(pnpm.calls.length, 1, 'the lockfile is regenerated for the conflict branch');

	const create = gh.calls.find((a) => a[0] === 'pr' && a[1] === 'create');
	const body = create[create.indexOf('--body') + 1];
	assert.match(body, /### Conflicted files\n- `packages\/cli\/x\.ts`/);
	assert.match(body, /### Auto-resolved for you/);
	assert.ok(
		body.indexOf(LOCKFILE) > body.indexOf('Auto-resolved'),
		'the lockfile belongs to the auto-resolved section',
	);

	// Owner attribution is scoped to the real code conflicts only.
	const attributions = git.calls.filter((a) => a[0] === 'log' && a.includes('--format=%H'));
	assert.equal(attributions.length, 1);
	assert.equal(attributions[0].at(-1), 'packages/cli/x.ts');
});

test('openConflictPr degrades gracefully when owner resolution fails', async () => {
	const git = makeStub([[(a) => a[0] === 'log', 'sha1']]);
	const gh = makeStub([
		[(a) => a[0] === 'pr' && a[1] === 'list', '[]'],
		[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/1'],
	]);
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
});

test('sync reports a marker-less delete/modify conflict as its own decision, with the master commit', async () => {
	const git = makeStub([
		...baseGitRoutes.filter((r) => !r[0](['merge-tree']) && !r[0](['merge-base'])),
		[(a) => a[0] === 'merge-base' && a[1] === '--is-ancestor', fail()],
		[(a) => a[0] === 'merge-base', 'DIVERGED'],
		[(a) => a[0] === 'merge-tree', conflictedMergeTree('fixtures/a.json')],
		[(a) => a[0] === 'merge', fail('CONFLICT (modify/delete): fixtures/a.json')],
		[isConflictedFiles, 'fixtures/a.json'],
		[(a) => a[0] === 'ls-files', '100644 oid 1\tfixtures/a.json\n100644 oid 3\tfixtures/a.json'],
		[(a) => a[0] === 'log' && a.includes('--format=%H'), 'breaking-sha'],
		[(a) => a[0] === 'log' && a.includes('--format=%H %h %s'), 'master-sha msha build: bump (#2)'],
	]);
	const gh = makeStub([
		...noOpenPr,
		[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/99'],
	]);

	await sync({
		git,
		gh,
		pnpm: makeStub(),
		env,
		fetchFn: okFetch(['alice', 'bob']),
		log: () => {},
	});

	const create = gh.calls.find((a) => a[0] === 'pr' && a[1] === 'create');
	const body = create[create.indexOf('--body') + 1];
	assert.match(body, /### Deleted on one side, changed on the other/);
	assert.match(body, /- `fixtures\/a\.json` — deleted on `3\.x`, changed on master/);
	assert.match(body, / {2}- master: `msha` build: bump \(#2\) — @bob/);
	// 3.x is still untouched — the decision is the resolver's, only the PR moves.
	const pushes = git.calls.filter((a) => a[0] === 'push');
	assert.equal(pushes.length, 1);
	assert.equal(pushes[0].at(-1), `HEAD:refs/heads/${SYNC_BRANCH}`);
});
