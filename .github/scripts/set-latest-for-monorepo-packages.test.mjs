import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/set-latest-for-monorepo-packages.test.mjs
 * */

let resolveLatestVersion;
before(async () => {
	({ resolveLatestVersion } = await import('./set-latest-for-monorepo-packages.mjs'));
});

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});

function mockDistTags(tags) {
	globalThis.fetch = async () => ({ ok: true, json: async () => tags });
}

describe('resolveLatestVersion', () => {
	it('uses the checkout version for regular monorepo packages', async () => {
		globalThis.fetch = async () => {
			throw new Error('should not fetch dist-tags for regular packages');
		};
		const version = await resolveLatestVersion({ name: '@n8n/config', version: '1.2.3' });
		assert.equal(version, '1.2.3');
	});

	it('pins standalone packages to the beta dist-tag', async () => {
		mockDistTags({ beta: '0.40.1', latest: '0.39.3' });
		const version = await resolveLatestVersion({ name: '@n8n/create-node', version: '0.39.3' });
		assert.equal(version, '0.40.1');
	});

	it('never downgrades latest below a newer standalone release', async () => {
		mockDistTags({ beta: '0.40.1', latest: '0.41.0' });
		const version = await resolveLatestVersion({ name: '@n8n/create-node', version: '0.39.3' });
		assert.equal(version, null);
	});

	it('skips standalone packages without a beta tag when latest is current', async () => {
		mockDistTags({ latest: '0.25.0' });
		const version = await resolveLatestVersion({
			name: '@n8n/eslint-plugin-community-nodes',
			version: '0.25.0',
		});
		assert.equal(version, null);
	});
});
