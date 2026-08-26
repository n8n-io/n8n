import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	breakingShas,
	masterCommitsByFile,
	resolveCommitAuthors,
	gatherAttribution,
	buildOutputs,
} from './sync-conflict-owners.mjs';

test('breakingShas collects unique SHAs across the conflicted files only', () => {
	const calls = [];
	const git = (args) => {
		calls.push(args);
		// args: ['log', 'BASE..HEAD', '--format=%H', '--', <file>]
		const file = args.at(-1);
		if (file === 'a.ts') return 'sha1\nsha2\n';
		if (file === 'b.ts') return 'sha2\nsha3'; // sha2 shared -> deduped
		return '';
	};
	const shas = breakingShas('BASE', ['a.ts', 'b.ts'], git);
	assert.deepEqual(shas, ['sha1', 'sha2', 'sha3']);
	assert.equal(calls.length, 2);
	assert.deepEqual(calls[0], ['log', 'BASE..HEAD', '--format=%H', '--', 'a.ts']);
});

test('breakingShas can be scoped to an explicit tip (the pre-rebase 3.x tip)', () => {
	const calls = [];
	const git = (args) => {
		calls.push(args);
		return 'sha1';
	};
	breakingShas('BASE', ['a.ts'], git, 'PREHEAD');
	assert.deepEqual(calls[0], ['log', 'BASE..PREHEAD', '--format=%H', '--', 'a.ts']);
});

test('masterCommitsByFile reads the master side of each conflicted file, capped', () => {
	const calls = [];
	const git = (args) => {
		calls.push(args);
		return args.at(-1) === 'a.ts'
			? 'full1 short1 fix(core): a thing (#1)\nfull2 short2 chore: another'
			: '';
	};

	const byFile = masterCommitsByFile('BASE', ['a.ts', 'b.ts'], git, 'MASTER', 3);

	assert.deepEqual(byFile.get('a.ts'), [
		{ sha: 'full1', short: 'short1', subject: 'fix(core): a thing (#1)' },
		{ sha: 'full2', short: 'short2', subject: 'chore: another' },
	]);
	assert.deepEqual(byFile.get('b.ts'), []);
	assert.deepEqual(calls[0], [
		'log',
		'BASE..MASTER',
		'--max-count=3',
		'--format=%H %h %s',
		'--',
		'a.ts',
	]);
});

test('gatherAttribution resolves both sides of the conflict in a single call', async () => {
	const git = (args) => {
		if (args[0] === 'merge-base') return 'DIVERGED';
		if (args.includes('--format=%H')) return 'breaking-sha';
		if (args.includes('--format=%H %h %s')) return 'master-sha msha build(core): bump deps (#2)';
		return '';
	};
	let queried = [];
	const fetchFn = async (_url, opts) => {
		queried.push(JSON.parse(opts.body).query);
		return {
			ok: true,
			json: async () => ({
				data: {
					repository: {
						c0: { author: { user: { login: 'alice' } } },
						c1: { author: { user: { login: 'bob' } } },
					},
				},
			}),
		};
	};

	const { owners, masterCommits } = await gatherAttribution({
		repo: 'n8n-io/n8n',
		token: 't',
		files: ['a.ts'],
		base: 'MASTER',
		tip: 'PREHEAD',
		git,
		fetchFn,
	});

	assert.equal(queried.length, 1);
	assert.deepEqual(owners, ['alice']);
	assert.deepEqual(masterCommits.get('a.ts'), [
		{ sha: 'master-sha', short: 'msha', subject: 'build(core): bump deps (#2)', login: 'bob' },
	]);
});

test('gatherAttribution still attributes the 3.x side when the master side cannot be read', async () => {
	const git = (args) => {
		if (args[0] === 'merge-base') throw new Error('no merge base');
		return 'breaking-sha';
	};
	const fetchFn = async () => ({
		ok: true,
		json: async () => ({ data: { repository: { c0: { author: { user: { login: 'alice' } } } } } }),
	});

	const { owners, masterCommits } = await gatherAttribution({
		repo: 'r',
		token: 't',
		files: ['a.ts'],
		base: 'MASTER',
		git,
		fetchFn,
		log: () => {},
	});

	assert.deepEqual(owners, ['alice']);
	assert.equal(masterCommits.size, 0);
});

test('resolveCommitAuthors maps SHAs to logins in one call, dropping unlinked/bot authors', async () => {
	let calls = 0;
	const fetchFn = async (url, opts) => {
		calls++;
		assert.equal(url, 'https://api.github.com/graphql');
		const query = JSON.parse(opts.body).query;
		assert.match(query, /c0: object\(oid: "sha1"\)/);
		assert.match(query, /c2: object\(oid: "sha3"\)/);
		return {
			ok: true,
			json: async () => ({
				data: {
					repository: {
						c0: { author: { user: { login: 'bob' } } },
						c1: { author: { user: { login: 'alice' } } },
						c2: { author: { user: null } }, // unlinked / bot -> dropped
					},
				},
			}),
		};
	};
	const authors = await resolveCommitAuthors('n8n-io/n8n', ['sha1', 'sha2', 'sha3'], 't', fetchFn);
	assert.equal(calls, 1); // single batched request
	assert.deepEqual(
		[...authors],
		[
			['sha1', 'bob'],
			['sha2', 'alice'],
		],
	); // sha3's null author is dropped
});

test('resolveCommitAuthors makes no request when there are no SHAs', async () => {
	let calls = 0;
	const fetchFn = async () => {
		calls++;
		return { ok: true, json: async () => ({ data: { repository: {} } }) };
	};
	assert.equal((await resolveCommitAuthors('r', [], 't', fetchFn)).size, 0);
	assert.equal(calls, 0);
});

test('resolveCommitAuthors throws on API/GraphQL errors (caller degrades gracefully)', async () => {
	const httpError = async () => ({ ok: false, status: 502, json: async () => ({}) });
	const gqlError = async () => ({ ok: true, json: async () => ({ errors: [{ message: 'bad' }] }) });
	await assert.rejects(resolveCommitAuthors('r', ['s'], 't', httpError), /502/);
	await assert.rejects(resolveCommitAuthors('r', ['s'], 't', gqlError), /GraphQL error/);
});

test('buildOutputs formats the slack line and PR body with owners', () => {
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		files: ['packages/cli/x.ts'],
		owners: ['alice', 'bob'],
	});
	assert.equal(out.slack, 'Likely owners (GitHub): @alice @bob');
	assert.match(out.body, /### Conflicted files/);
	assert.match(out.body, /- `packages\/cli\/x\.ts`/);
	assert.match(out.body, /- @alice/);
	assert.match(out.body, /- @bob/);
	assert.match(out.body, /Daily syncs are paused until this PR is merged/);
	// Markers are the review surface; the fix goes in the resolver's own commit.
	assert.match(out.body, /conflict markers included/);
	assert.match(out.body, /nobody is requested as a reviewer/);
	assert.match(out.body, /in one commit of your own/);
	assert.match(out.body, /Merge this PR with the normal merge button/);
	assert.match(out.body, /`3\.x` was not touched/);
});

test('buildOutputs degrades gracefully when nothing could be attributed', () => {
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		syncBase: 'abc1234',
		files: ['x.ts'],
		owners: [],
	});
	assert.equal(out.slack, 'Could not auto-attribute owners.');
	assert.match(out.body, /Could not auto-attribute/);
});

test('buildOutputs lists mechanically pre-resolved files apart from the code conflicts', () => {
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		files: ['packages/cli/x.ts'],
		owners: ['alice'],
		preResolved: ['pnpm-lock.yaml'],
	});
	assert.match(out.body, /### Conflicted files\n- `packages\/cli\/x\.ts`/);
	assert.match(out.body, /### Auto-resolved for you/);
	assert.match(out.body, /resolved mechanically — no action needed/);
	assert.ok(out.body.indexOf('pnpm-lock.yaml') > out.body.indexOf('Auto-resolved'));
});

test('buildOutputs carries the regen instruction when the lockfile was deferred', () => {
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		files: ['packages/cli/package.json'],
		owners: [],
		lockfileDeferred: true,
	});
	assert.match(out.body, /still carries its conflict markers/);
	assert.match(out.body, /pnpm install --lockfile-only/);
});

test('buildOutputs warns about conflict PRs that were closed without merging', () => {
	const abandoned = [{ number: 42, url: 'https://github.com/n8n-io/n8n/pull/42' }];
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		files: ['x.ts'],
		owners: ['alice'],
		abandoned,
	});
	assert.match(out.body, /#42\) was closed without being merged/);
	assert.match(out.body, /Merge, don't close/);
	assert.match(out.slack, /<https:\/\/github\.com\/n8n-io\/n8n\/pull\/42\|#42>/);
	assert.match(out.slack, /merge this one, don't close it/);
});

test('buildOutputs names the master commit behind each conflicted file', () => {
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		files: ['packages/cli/x.ts'],
		owners: ['alice'],
		masterCommits: new Map([
			[
				'packages/cli/x.ts',
				[{ short: 'abc1234', subject: 'build(core): bump deps (#2)', login: 'bob' }],
			],
		]),
	});
	assert.match(
		out.body,
		/- `packages\/cli\/x\.ts`\n {2}- master: `abc1234` build\(core\): bump deps \(#2\) — @bob/,
	);
	assert.equal(out.slack, 'Likely owners (GitHub): @alice · master side: @bob');
});

test('buildOutputs gives marker-less delete/modify conflicts their own section', () => {
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		files: [],
		owners: ['alice'],
		deleteConflicts: [
			{ path: 'fixtures/a.json', deletedBy: 'target' },
			{ path: 'src/b.ts', deletedBy: 'master' },
		],
		masterCommits: new Map([
			['fixtures/a.json', [{ short: 'abc1234', subject: 'build: re-record (#2)' }]],
		]),
	});
	assert.match(out.body, /### Deleted on one side, changed on the other/);
	// Nothing keeps the checks red here, so the body must not promise that it does.
	assert.match(out.body, /the checks can go green on a merge that was resolved by default/);
	assert.match(out.body, /no conflict markers/);
	assert.match(
		out.body,
		/- `fixtures\/a\.json` — deleted on `3\.x`, changed on master; the merge kept `3\.x`'s deletion/,
	);
	assert.match(
		out.body,
		/- `src\/b\.ts` — deleted on master, changed on `3\.x`; the merge kept `3\.x`'s file/,
	);
	assert.match(out.body, / {2}- master: `abc1234` build: re-record \(#2\)/);
	// Nothing carries markers, so the misleading "Conflicted files" list is dropped.
	assert.equal(/### Conflicted files/.test(out.body), false);
});
