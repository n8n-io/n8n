import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	hasOpenConflictPr,
	tryMerge,
	openConflictPr,
	sync,
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

const okFetch = (logins) => async () => ({
	ok: true,
	json: async () => ({ data: { repository: Object.fromEntries(logins.map((l, i) => [`c${i}`, { author: { user: { login: l } } }])) } }),
});

test('hasOpenConflictPr reflects the open-PR count from gh', () => {
	const empty = makeStub([[() => true, '[]']]);
	assert.equal(hasOpenConflictPr(empty), false);
	assert.deepEqual(empty.calls[0], ['pr', 'list', '--state', 'open', '--label', CONFLICT_LABEL, '--json', 'number']);

	const one = makeStub([[() => true, JSON.stringify([{ number: 42 }])]]);
	assert.equal(hasOpenConflictPr(one), true);
});

test('tryMerge returns true when the merge succeeds', () => {
	const git = makeStub([[(a) => a[0] === 'merge', '']]);
	assert.equal(tryMerge(git, 'MASTER', () => {}), true);
	assert.deepEqual(git.calls[0], ['merge', '--no-edit', 'MASTER']);
});

test('tryMerge returns false and logs merge output on conflict', () => {
	const logged = [];
	const git = () => {
		const err = new Error('merge failed');
		err.stdout = 'CONFLICT (content): x.ts\n';
		throw err;
	};
	assert.equal(tryMerge(git, 'MASTER', (m) => logged.push(m)), false);
	assert.match(logged.join('\n'), /CONFLICT/);
});

test('sync fast-forwards and pushes to 3.x on a clean merge', async () => {
	const git = makeStub([
		[(a) => a[0] === 'rev-parse', 'MASTERSHA'],
		[(a) => a[0] === 'merge', ''],
	]);
	const gh = makeStub([[(a) => a[0] === 'pr' && a[1] === 'list', '[]']]);
	const env = { GH_TOKEN: 'tok', GITHUB_REPOSITORY: 'n8n-io/n8n' };

	await sync({ git, gh, env, log: () => {} });

	const push = git.calls.find((a) => a[0] === 'push');
	assert.ok(push, 'expected a push');
	assert.equal(push[1], 'https://x-access-token:tok@github.com/n8n-io/n8n.git');
	assert.equal(push[2], `HEAD:${TARGET_BRANCH}`);
	// No PR created on a clean merge.
	assert.equal(gh.calls.some((a) => a[0] === 'pr' && a[1] === 'create'), false);
});

test('sync halts (no fetch/merge) when a conflict PR is already open', async () => {
	const git = makeStub();
	const gh = makeStub([[(a) => a[0] === 'pr' && a[1] === 'list', JSON.stringify([{ number: 7 }])]]);

	await sync({ git, gh, env: { GH_TOKEN: 't', GITHUB_REPOSITORY: 'n8n-io/n8n' }, log: () => {} });

	assert.equal(git.calls.length, 0, 'must not touch git while halted');
});

test('sync opens a conflict PR and writes outputs on merge conflict', async () => {
	const git = makeStub([
		[(a) => a[0] === 'rev-parse', 'MASTERSHA'],
		[(a) => a[0] === 'merge', () => { const e = new Error('conflict'); e.status = 1; throw e; }],
		[(a) => a[0] === 'diff', 'packages/cli/x.ts'],
		[(a) => a[0] === 'log', 'sha1'],
	]);
	const gh = makeStub([
		[(a) => a[0] === 'pr' && a[1] === 'list', '[]'],
		[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/99'],
	]);
	// No GITHUB_OUTPUT set → writeGithubOutput no-ops; assert on the gh/git calls instead.
	const env = { GH_TOKEN: 'tok', GITHUB_REPOSITORY: 'n8n-io/n8n' };

	await sync({ git, gh, env, fetchFn: okFetch(['alice']), log: () => {} });

	const create = gh.calls.find((a) => a[0] === 'pr' && a[1] === 'create');
	assert.ok(create, 'expected a PR to be created');
	assert.ok(create.includes('--draft'));
	assert.equal(create[create.indexOf('--base') + 1], TARGET_BRANCH);
	assert.equal(create[create.indexOf('--head') + 1], SYNC_BRANCH);

	// Owner requested as reviewer.
	const edit = gh.calls.find((a) => a[0] === 'pr' && a[1] === 'edit');
	assert.ok(edit, 'expected reviewers to be requested');
	assert.equal(edit[edit.indexOf('--add-reviewer') + 1], 'alice');

	// Conflicted state force-pushed to the sync branch.
	const push = git.calls.find((a) => a[0] === 'push' && a.includes('--force'));
	assert.ok(push, 'expected a force push to the sync branch');
	assert.equal(push.at(-1), `HEAD:refs/heads/${SYNC_BRANCH}`);
});

test('openConflictPr degrades gracefully when owner resolution fails', async () => {
	const git = makeStub([
		[(a) => a[0] === 'diff', 'x.ts'],
		[(a) => a[0] === 'log', 'sha1'],
	]);
	const gh = makeStub([[(a) => a[0] === 'pr' && a[1] === 'create', 'https://github.com/n8n-io/n8n/pull/1']]);
	const failingFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

	const { prUrl, ownersSlack } = await openConflictPr({
		git,
		gh,
		repo: 'n8n-io/n8n',
		token: 't',
		masterSha: 'MASTER',
		pushUrl: 'https://push',
		fetchFn: failingFetch,
		log: () => {},
	});

	assert.equal(prUrl, 'https://github.com/n8n-io/n8n/pull/1');
	assert.equal(ownersSlack, 'Could not auto-attribute owners.');
	// No reviewer request when there are no owners.
	assert.equal(gh.calls.some((a) => a[0] === 'pr' && a[1] === 'edit'), false);
});
