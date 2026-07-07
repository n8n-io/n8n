import assert from 'node:assert/strict';
import { test } from 'node:test';

import { breakingShas, resolveLogin, buildOutputs } from './sync-conflict-owners.mjs';

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

test('resolveLogin returns the linked login for a human author', async () => {
	const fetchFn = async () => ({ ok: true, json: async () => ({ author: { login: 'alice', type: 'User' } }) });
	assert.equal(await resolveLogin('n8n-io/n8n', 'sha1', 't', fetchFn), 'alice');
});

test('resolveLogin skips bots, unlinked accounts, and API errors', async () => {
	const bot = async () => ({ ok: true, json: async () => ({ author: { login: 'dependabot[bot]', type: 'Bot' } }) });
	const unlinked = async () => ({ ok: true, json: async () => ({ author: null }) });
	const errored = async () => ({ ok: false, json: async () => ({}) });
	assert.equal(await resolveLogin('r', 's', 't', bot), null);
	assert.equal(await resolveLogin('r', 's', 't', unlinked), null);
	assert.equal(await resolveLogin('r', 's', 't', errored), null);
});

test('buildOutputs formats reviewers, slack line, and PR body with owners', () => {
	const out = buildOutputs({ syncBranch: 'sync/master-to-3x', files: ['packages/cli/x.ts'], owners: ['alice', 'bob'] });
	assert.equal(out.ownersCsv, 'alice,bob');
	assert.equal(out.slack, 'Likely owners (GitHub): @alice @bob');
	assert.match(out.body, /### Conflicted files/);
	assert.match(out.body, /- `packages\/cli\/x\.ts`/);
	assert.match(out.body, /- @alice/);
	assert.match(out.body, /- @bob/);
	assert.match(out.body, /Daily syncs are paused until it is merged/);
});

test('buildOutputs degrades gracefully when nothing could be attributed', () => {
	const out = buildOutputs({ syncBranch: 'sync/master-to-3x', files: ['x.ts'], owners: [] });
	assert.equal(out.ownersCsv, '');
	assert.equal(out.slack, 'Could not auto-attribute owners.');
	assert.match(out.body, /Could not auto-attribute/);
});
