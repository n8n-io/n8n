import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildableDeps, isBumpOnly, nativePinsChanged } from './should-smoke-build.mjs';

const workspace = ({ kafka = '1.9.1', vm = '^7.0.0', sentry = '10.70.0', allowVm = true } = {}) => `
catalog:
  '@confluentinc/kafka-javascript': ${kafka}
  '@sentry/core': ${sentry}
  isolated-vm: ${vm}

patchedDependencies:
  '@confluentinc/kafka-javascript@${kafka}': patches/@confluentinc__kafka-javascript@${kafka}.patch

allowBuilds:
  '@confluentinc/kafka-javascript': true
  esbuild: false
  isolated-vm: ${allowVm}
  sqlite3: true

onlyBuiltDependencies:
  - nothing
`;

describe('isBumpOnly', () => {
	it('accepts a catalog bump', () => {
		assert.equal(isBumpOnly(['pnpm-workspace.yaml', 'pnpm-lock.yaml']), true);
	});

	it('accepts a package.json at any depth', () => {
		assert.equal(isBumpOnly(['pnpm-workspace.yaml', 'packages/cli/package.json']), true);
	});

	it('rejects a Dockerfile change', () => {
		assert.equal(isBumpOnly(['pnpm-workspace.yaml', 'docker/images/n8n/Dockerfile']), false);
	});

	it('rejects an empty list so an unknown diff still builds', () => {
		assert.equal(isBumpOnly([]), false);
	});
});

describe('buildableDeps', () => {
	it('collects only the true entries under allowBuilds', () => {
		assert.deepEqual([...buildableDeps(workspace())].sort(), [
			'@confluentinc/kafka-javascript',
			'isolated-vm',
			'sqlite3',
		]);
	});

	it('stops at the next top-level key', () => {
		assert.equal(buildableDeps(workspace()).has('nothing'), false);
	});

	it('parses the real workspace file', () => {
		const text = readFileSync(new URL('../../../pnpm-workspace.yaml', import.meta.url), 'utf8');
		assert.ok(buildableDeps(text).has('isolated-vm'));
	});
});

describe('nativePinsChanged', () => {
	it('ignores a non-native catalog bump', () => {
		const { changed } = nativePinsChanged(workspace(), workspace({ sentry: '10.71.0' }));
		assert.equal(changed, false);
	});

	it('catches a native version bump', () => {
		const { changed } = nativePinsChanged(workspace(), workspace({ vm: '^8.0.0' }));
		assert.equal(changed, true);
	});

	it('catches a patch re-pin alongside the version', () => {
		const { changed, reason } = nativePinsChanged(workspace(), workspace({ kafka: '1.10.0' }));
		assert.equal(changed, true);
		assert.match(reason, /pin changed/);
	});

	it('catches a dep becoming non-buildable', () => {
		const { changed, reason } = nativePinsChanged(workspace(), workspace({ allowVm: false }));
		assert.equal(changed, true);
		assert.match(reason, /set of buildable dependencies/);
	});

	it('reports no change for an identical file', () => {
		assert.equal(nativePinsChanged(workspace(), workspace()).changed, false);
	});
});
