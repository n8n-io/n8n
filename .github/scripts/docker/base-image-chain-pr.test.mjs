import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	CHAIN,
	commitOf,
	fetchWithRetry,
	isRefreshCommit,
	planPins,
	renderBody,
} from './base-image-chain-pr.mjs';

const digest = (char) => `sha256:${char.repeat(64)}`;
const sha = 'f'.repeat(40);
const hcl = readFileSync(new URL('../../../docker/docker-bake.hcl', import.meta.url), 'utf8');

describe('isRefreshCommit', () => {
	it('accepts the squash merge of a refresh PR', () => {
		assert.ok(isRefreshCommit('build: Update base image digests with fewer OS findings (#45000)'));
		assert.ok(isRefreshCommit('build: Update base image digests that need a review (#45003)'));
	});

	it('rejects other commits', () => {
		assert.ok(!isRefreshCommit('build: Update Docker base images to Node 26.14.0 (#45002)'));
		assert.ok(!isRefreshCommit('build: Pin the base images that master published (#45001)'));
		assert.ok(!isRefreshCommit(''));
	});
});

describe('planPins', () => {
	it('pins the bases that master published', async () => {
		const tags = [];
		const changes = await planPins(hcl, 'build-base-image.yml', sha, {
			resolve: (tag) => {
				tags.push(tag);
				return digest('b');
			},
			contains: async () => true,
		});
		assert.ok(tags.every((tag) => tag.startsWith('n8nio/base:') && tag.includes(sha)));
		assert.ok(tags.some((tag) => tag.includes(`-debian-${sha}`)));
		assert.deepEqual(
			changes.map((change) => change.source),
			['RUNTIME_IMAGE', 'DEBIAN_RUNTIME_IMAGE'],
		);
		assert.match(changes[0].newest, new RegExp(`^n8nio/base:[0-9.]+-${sha}@${digest('b')}$`));
	});

	it('skips the images that the run did not publish', async () => {
		const changes = await planPins(hcl, 'build-base-image.yml', sha, {
			resolve: (tag) => (tag.includes('-debian-') ? digest('d') : null),
			contains: async () => true,
		});
		assert.deepEqual(
			changes.map((change) => change.source),
			['DEBIAN_RUNTIME_IMAGE'],
		);
	});

	it('skips a pin that already points at the published image', async () => {
		const pinned = /variable "RUNTIME_IMAGE" \{\s*default = "([^"@]+)@([^"]+)"/.exec(hcl);
		const changes = await planPins(hcl, 'build-base-image.yml', pinned[1].split('-').at(-1), {
			resolve: (tag) => (tag === pinned[1] ? pinned[2] : digest('d')),
			contains: async () => true,
		});
		assert.deepEqual(
			changes.map((change) => change.source),
			['DEBIAN_RUNTIME_IMAGE'],
		);
	});

	it('reads the tag versions from the bake file of the published commit', async () => {
		const tags = [];
		await planPins(hcl, 'build-base-image.yml', sha, {
			publishedHcl: hcl.replaceAll(/dhi\.io\/node:[0-9.]+-/g, 'dhi.io/node:1.2.3-'),
			resolve: (tag) => {
				tags.push(tag);
				return null;
			},
			contains: async () => true,
		});
		assert.equal(tags.length, 2);
		assert.ok(tags.every((tag) => tag.includes(':1.2.3-')));
	});

	it('never moves a pin back to an older image', async () => {
		const asked = [];
		const changes = await planPins(hcl, 'build-base-image.yml', sha, {
			resolve: () => digest('e'),
			contains: async (older, newer) => {
				asked.push([older, newer]);
				return false;
			},
		});
		assert.deepEqual(changes, []);
		assert.ok(asked.every(([older, newer]) => /^[0-9a-f]{40}$/.test(older) && newer === sha));
	});

	it('covers every publishing workflow', () => {
		assert.deepEqual(Object.keys(CHAIN), ['build-base-image.yml']);
	});
});

describe('commitOf', () => {
	it('reads the master commit from the tag of a pin', () => {
		const commit = 'a'.repeat(40);
		assert.equal(commitOf(`n8nio/base:26.13.0-${commit}@${digest('b')}`), commit);
		assert.equal(commitOf(`n8nio/base:26.13.0-debian-${commit}@${digest('b')}`), commit);
	});

	it('returns null for a tag without a commit', () => {
		assert.equal(commitOf(`n8nio/base:26.13.0@${digest('b')}`), null);
	});
});

describe('renderBody', () => {
	it('lists each pin change and links the publish run', () => {
		const body = renderBody(
			[{ source: 'RUNTIME_IMAGE', pinned: 'n8nio/base:26@a', newest: 'n8nio/base:26-x@b' }],
			{ runUrl: 'https://github.com/n8n-io/n8n/actions/runs/2' },
		);
		assert.match(body, /\[publish run\]\(https:\/\/github\.com\/n8n-io\/n8n\/actions\/runs\/2\)/);
		assert.match(body, /\| `RUNTIME_IMAGE` \| `n8nio\/base:26@a` \| `n8nio\/base:26-x@b` \|/);
	});
});

describe('fetchWithRetry', () => {
	it('sends the request again after a network error', async (t) => {
		const ok = new Response('{}', { status: 200 });
		const fetch = t.mock.method(globalThis, 'fetch', async () => {
			if (fetch.mock.callCount() === 0) throw new TypeError('fetch failed');
			return ok;
		});
		assert.equal(await fetchWithRetry('https://api.github.com/x', { method: 'POST' }), ok);
		assert.equal(fetch.mock.callCount(), 2);
	});

	it('does not send the request again after another error', async (t) => {
		const fetch = t.mock.method(globalThis, 'fetch', async () => {
			throw new DOMException('The operation timed out.', 'TimeoutError');
		});
		await assert.rejects(fetchWithRetry('https://api.github.com/x'), { name: 'TimeoutError' });
		assert.equal(fetch.mock.callCount(), 1);
	});

	it('fails when the second request also fails', async (t) => {
		const fetch = t.mock.method(globalThis, 'fetch', async () => {
			throw new TypeError('fetch failed');
		});
		await assert.rejects(fetchWithRetry('https://api.github.com/x'), TypeError);
		assert.equal(fetch.mock.callCount(), 2);
	});
});
