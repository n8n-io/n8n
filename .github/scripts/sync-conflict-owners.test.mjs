import assert from 'node:assert/strict';
import { test } from 'node:test';

import { breakingShas, resolveLogins, buildOutputs } from './sync-conflict-owners.mjs';

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

test('resolveLogins maps SHAs to logins in one call, dropping unlinked/bot authors', async () => {
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
	const owners = await resolveLogins('n8n-io/n8n', ['sha1', 'sha2', 'sha3'], 't', fetchFn);
	assert.equal(calls, 1); // single batched request
	assert.deepEqual(owners, ['alice', 'bob']); // sorted, deduped, null dropped
});

test('resolveLogins makes no request when there are no SHAs', async () => {
	let calls = 0;
	const fetchFn = async () => {
		calls++;
		return { ok: true, json: async () => ({ data: { repository: {} } }) };
	};
	assert.deepEqual(await resolveLogins('r', [], 't', fetchFn), []);
	assert.equal(calls, 0);
});

test('resolveLogins throws on API/GraphQL errors (caller degrades gracefully)', async () => {
	const httpError = async () => ({ ok: false, status: 502, json: async () => ({}) });
	const gqlError = async () => ({ ok: true, json: async () => ({ errors: [{ message: 'bad' }] }) });
	await assert.rejects(resolveLogins('r', ['s'], 't', httpError), /502/);
	await assert.rejects(resolveLogins('r', ['s'], 't', gqlError), /GraphQL error/);
});

test('buildOutputs formats reviewers, slack line, and PR body with owners', () => {
	const out = buildOutputs({
		syncBranch: 'sync/master-to-3x',
		files: ['packages/cli/x.ts'],
		owners: ['alice', 'bob'],
	});
	assert.equal(out.ownersCsv, 'alice,bob');
	assert.equal(out.slack, 'Likely owners (GitHub): @alice @bob');
	assert.match(out.body, /### Conflicted files/);
	assert.match(out.body, /- `packages\/cli\/x\.ts`/);
	assert.match(out.body, /- @alice/);
	assert.match(out.body, /- @bob/);
	assert.match(out.body, /Daily syncs are paused until this PR is merged/);
	// Markers are the review surface; the fix goes in the resolver's own commit.
	assert.match(out.body, /conflict markers committed/);
	assert.match(out.body, /in one commit of your own/);
	assert.match(out.body, /Merge this PR with the normal merge button/);
	assert.match(out.body, /`3\.x` was not touched/);
});

test('buildOutputs degrades gracefully when nothing could be attributed', () => {
	const out = buildOutputs({ syncBranch: 'sync/master-to-3x', syncBase: 'abc1234', files: ['x.ts'], owners: [] });
	assert.equal(out.ownersCsv, '');
	assert.equal(out.slack, 'Could not auto-attribute owners.');
	assert.match(out.body, /Could not auto-attribute/);
});
