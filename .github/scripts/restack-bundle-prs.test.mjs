import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planRestack, restackBundlePrs } from './restack-bundle-prs.mjs';

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
const ONTO = 'ONTOSHA';
const PRE_HEAD = 'PREHEAD';
const MERGE_TREE = 'MERGETREEOID';

const env = {
	BUNDLE_BRANCH: 'bundle/2.x',
	BASE_BRANCH: 'master',
	CUT_SHA: CUT,
	GH_TOKEN: 'tok',
	GITHUB_REPOSITORY: 'n8n-io/n8n-private',
};

const isPush = (a) => a[0] === 'push';
const isRebase = (a) => a[0] === 'rebase';
const isComment = (a) => a[0] === 'pr' && a[1] === 'comment';
const isEdit = (a) => a[0] === 'pr' && a[1] === 'edit';
const isAncestorOf = (a, ancestor, descendant) =>
	a[0] === 'merge-base' && a[2] === ancestor && a[3] === descendant;

const conflictedMergeTree = (...paths) =>
	fail(`${MERGE_TREE}\n${paths.join('\n')}\n\nCONFLICT (content): Merge conflict in ${paths[0]}`);

const gitRoutes = [
	[(a) => a[0] === 'rev-parse' && a[1] === 'FETCH_HEAD', ONTO],
	[(a) => a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}', MERGE_TREE],
	[(a) => a[0] === 'rev-parse', PRE_HEAD],
	[(a) => isAncestorOf(a, ONTO, PRE_HEAD), fail()], // the branch is not on the new tip yet
	[(a) => isAncestorOf(a, CUT, PRE_HEAD), ''], // it was branched off the bundle before the cut
	[(a) => a[0] === 'merge-tree', MERGE_TREE],
	[(a) => a[0] === 'grep', fail()],
];

const prList = (pulls) => [(a) => a[0] === 'pr' && a[1] === 'list', JSON.stringify(pulls)];

const silent = () => {};

test('only PRs based on the bundle branch are restacked', () => {
	const { targets, stacked } = planRestack(
		[
			{ number: 1, headRefName: 'security/one', baseRefName: 'bundle/2.x' },
			{ number: 2, headRefName: 'security/two', baseRefName: 'master' },
			{ number: 3, headRefName: 'bundle/2.x', baseRefName: 'master' },
		],
		{ bundle: 'bundle/2.x', base: 'master', adoptStranded: false },
	);

	assert.deepEqual(
		targets.map((pr) => pr.number),
		[1],
	);
	assert.deepEqual(stacked, []);
});

test('stranded PRs are reclaimed only when asked, and the cut PR never is', () => {
	const pulls = [
		{ number: 2, headRefName: 'security/two', baseRefName: 'master' },
		{ number: 3, headRefName: 'bundle/2.x', baseRefName: 'master' },
	];
	const { targets } = planRestack(pulls, {
		bundle: 'bundle/2.x',
		base: 'master',
		adoptStranded: true,
	});

	assert.deepEqual(
		targets.map((pr) => pr.number),
		[2],
	);
	assert.equal(targets[0].retarget, true);
});

test('a PR another open PR is based on is skipped, not half-restacked', () => {
	const { targets, stacked } = planRestack(
		[
			{ number: 1, headRefName: 'security/root', baseRefName: 'bundle/2.x' },
			{ number: 2, headRefName: 'security/child', baseRefName: 'security/root' },
			{ number: 3, headRefName: 'security/lone', baseRefName: 'bundle/2.x' },
		],
		{ bundle: 'bundle/2.x', base: 'master', adoptStranded: false },
	);

	assert.deepEqual(
		stacked.map((pr) => pr.number),
		[1],
	);
	assert.deepEqual(
		targets.map((pr) => pr.number),
		[3],
	);
});

test('a clean branch is replayed from the cut and force-pushed with a lease', () => {
	const git = makeStub(gitRoutes);
	const gh = makeStub([
		prList([{ number: 7, headRefName: 'security/one', baseRefName: 'bundle/2.x' }]),
	]);

	const result = restackBundlePrs({ git, gh, env, log: silent });

	assert.equal(result.restacked, 1);
	assert.deepEqual(git.calls.find(isRebase), [
		'rebase',
		'--empty=drop',
		'--onto',
		ONTO,
		CUT,
		'security/one',
	]);
	assert.equal(git.calls.find(isPush)[1], `--force-with-lease=refs/heads/security/one:${PRE_HEAD}`);
	assert.equal(gh.calls.filter(isEdit).length, 0);
});

test('a stranded branch is replayed from its merge base when no cut is recorded', () => {
	const git = makeStub([
		[(a) => a[0] === 'merge-base' && a[1] === ONTO, 'MERGEBASE'],
		...gitRoutes,
	]);
	const gh = makeStub([
		prList([{ number: 8, headRefName: 'security/old', baseRefName: 'master' }]),
	]);

	const result = restackBundlePrs({
		git,
		gh,
		env: { ...env, CUT_SHA: '', ADOPT_STRANDED: 'true' },
		log: silent,
	});

	assert.equal(result.restacked, 1);
	assert.equal(git.calls.find(isRebase)[4], 'MERGEBASE');
	assert.deepEqual(gh.calls.find(isEdit), [
		'pr',
		'edit',
		'8',
		'--repo',
		'n8n-io/n8n-private',
		'--base',
		'bundle/2.x',
	]);
});

test('a stranded branch already on the new tip is still pointed back at the bundle', () => {
	const git = makeStub([[(a) => isAncestorOf(a, ONTO, PRE_HEAD), ''], ...gitRoutes]);
	const gh = makeStub([
		prList([{ number: 9, headRefName: 'security/fresh', baseRefName: 'master' }]),
	]);

	const result = restackBundlePrs({
		git,
		gh,
		env: { ...env, ADOPT_STRANDED: 'true' },
		log: silent,
	});

	assert.equal(result.current, 1);
	assert.equal(git.calls.filter(isPush).length, 0);
	assert.equal(gh.calls.filter(isEdit).length, 1);
});

test('a conflicted branch is left untouched, reported on its PR, and does not stop the others', () => {
	// The first branch conflicts; the second is clean.
	let seen = 0;
	const git = makeStub([
		[
			(a) => a[0] === 'merge-tree',
			(args) => (seen++ === 0 ? conflictedMergeTree('packages/cli/src/x.ts')(args) : MERGE_TREE),
		],
		...gitRoutes,
	]);
	const gh = makeStub([
		prList([
			{ number: 10, headRefName: 'security/clash', baseRefName: 'bundle/2.x' },
			{ number: 11, headRefName: 'security/clean', baseRefName: 'bundle/2.x' },
		]),
	]);

	const result = restackBundlePrs({ git, gh, env, log: silent });

	assert.deepEqual(result.conflicts, [10]);
	assert.equal(result.restacked, 1);
	assert.equal(gh.calls.filter(isComment).length, 1);
	assert.match(gh.calls.find(isComment)[6], /packages\/cli\/src\/x\.ts/);
	assert.equal(git.calls.filter(isPush).length, 1);
});

test('a dry run reports the planned rewrites and pushes nothing', () => {
	const git = makeStub(gitRoutes);
	const gh = makeStub([
		prList([{ number: 12, headRefName: 'security/one', baseRefName: 'bundle/2.x' }]),
	]);

	const result = restackBundlePrs({ git, gh, env: { ...env, DRY_RUN: 'true' }, log: silent });

	assert.equal(result.planned, 1);
	assert.equal(result.restacked, 0);
	assert.equal(git.calls.filter(isPush).length, 0);
	assert.equal(git.calls.filter(isRebase).length, 0);
});

test('nothing to restack touches no branch at all', () => {
	const git = makeStub(gitRoutes);
	const gh = makeStub([prList([{ number: 13, headRefName: 'bundle/2.x', baseRefName: 'master' }])]);

	const result = restackBundlePrs({ git, gh, env, log: silent });

	assert.equal(result.restacked, 0);
	assert.equal(git.calls.length, 0);
});
