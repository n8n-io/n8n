import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/determine-version-info.test.mjs
 * */

// mock.module must be called before the module under test is imported,
// because static imports are hoisted and resolve before any code runs.
mock.module('./github-helpers.mjs', {
	namedExports: {
		RELEASE_TRACKS: ['stable', 'beta', 'v1'],
		resolveReleaseTagForTrack: (track) => {
			// Always return deterministic data
			if (track === 'stable') return { version: '2.9.2' };
			if (track === 'beta') return { version: '2.10.1' };
			return { version: '1.123.33' };
		},
		writeGithubOutput: () => {}, // no-op in tests
	},
});

let determineTrack;
before(async () => {
	({ determineTrack } = await import('./determine-version-info.mjs'));
});

describe('determine-tracks', () => {
	it('Allow patch releases on stable', () => {
		const output = determineTrack('2.9.3');

		assert.equal(output.track, 'stable');
		assert.equal(output.version, '2.9.3');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'stable');
	});

	it('Allow patch releases on beta', () => {
		const output = determineTrack('2.10.2');

		assert.equal(output.track, 'beta');
		assert.equal(output.version, '2.10.2');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'stable');
	});

	// This use case might happen if a patch release fails and we proceed with rolling over to next release
	it('Allow skipping versions in patches', () => {
		const output = determineTrack('2.9.4');

		assert.equal(output.track, 'stable');
		assert.equal(output.version, '2.9.4');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'stable');
	});

	it('Disallow skipping versions in minors', () => {
		assert.throws(() => determineTrack('2.12.0'));
	});
	it('Disallow changing major version', () => {
		assert.throws(() => determineTrack('3.0.0'));
	});
	it('Throw when track is not determinable', () => {
		assert.throws(() => determineTrack(''));
	});

	it('Set track as "beta" when doing a minor bump', () => {
		const output = determineTrack('2.11.0');

		assert.equal(output.track, 'beta');
		assert.equal(output.version, '2.11.0');
		assert.equal(output.bump, 'minor');
		assert.equal(output.new_stable_version, '2.10.1');
		assert.equal(output.release_type, 'stable');
	});

	it('Set release_type accordingly on rc releases', () => {
		const output = determineTrack('2.10.2-rc.1');

		assert.equal(output.track, 'beta');
		assert.equal(output.version, '2.10.2-rc.1');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'rc');
	});
});
