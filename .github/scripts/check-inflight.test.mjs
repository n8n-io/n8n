import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findInflight } from './check-inflight.mjs';

test('rejects resolved packages, including optional and development dependencies', () => {
	assert.deepEqual(
		findInflight(`
lockfileVersion: '9.0'
packages:
  inflight@1.0.6:
    resolution: {integrity: example}
snapshots:
  inflight@1.0.6:
    optional: true
`),
		['inflight@1.0.6'],
	);
});

test('rejects aliased dependencies by their resolved package name', () => {
	assert.deepEqual(
		findInflight(`
importers:
  .:
    devDependencies:
      renamed:
        specifier: npm:inflight@1.0.6
        version: inflight@1.0.6
packages:
  inflight@1.0.6: {}
`),
		['inflight@1.0.6'],
	);
});

test('allows separate packages with similar names', () => {
	assert.deepEqual(
		findInflight(`
packages:
  promise-inflight@1.0.1: {}
  '@example/inflight@1.0.0': {}
snapshots:
  promise-inflight@1.0.1(bluebird@3.7.2): {}
`),
		[],
	);
});

test('checks older lockfile keys and peer snapshots', () => {
	assert.deepEqual(findInflight('packages:\n  /inflight/1.0.6: {}'), ['/inflight/1.0.6']);
	assert.deepEqual(findInflight('snapshots:\n  inflight@1.0.6(peer@1.0.0): {}'), [
		'inflight@1.0.6(peer@1.0.0)',
	]);
});

test('fails when a lockfile cannot be parsed', () => {
	assert.throws(() => findInflight('packages: ['));
});

test('checks every document in pnpm 12 lockfiles', () => {
	assert.deepEqual(
		findInflight(`
lockfileVersion: '9.0'
packages:
  pnpm@12.4.2: {}
---
lockfileVersion: '9.0'
packages:
  inflight@1.0.6: {}
`),
		['inflight@1.0.6'],
	);
});
