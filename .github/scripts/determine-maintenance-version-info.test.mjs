import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import * as helpers from './github-helpers.mjs';

const versions = { stable: '3.4.1', beta: '3.5.0', v1: '1.123.33', v2: '2.50.2' };

mock.module('./github-helpers.mjs', {
	namedExports: {
		...helpers,
		resolveReleaseTagForTrack: (track) => ({
			version: versions[track],
			tag: `n8n@${versions[track]}`,
		}),
		writeGithubOutput: () => {},
	},
});

const { determineTrack } = await import('./determine-version-info.mjs');

it('routes a v2 patch to its maintenance branch without promotion', () => {
	const output = determineTrack('2.50.3');
	assert.equal(output.track, 'v2');
	assert.equal(output.previous_version, '2.50.2');
	assert.equal(output.bump, 'patch');
	assert.equal(output.rc_branch, '2.x');
	assert.equal(output.new_stable_version, null);
});

it('keeps v1 patch releases on their maintenance branch', () => {
	const output = determineTrack('1.123.34');
	assert.equal(output.track, 'v1');
	assert.equal(output.rc_branch, '1.x');
	assert.equal(output.new_stable_version, null);
});

it('promotes the previous v3 beta on a normal v3 minor release', () => {
	const output = determineTrack('3.6.0');
	assert.equal(output.track, 'beta');
	assert.equal(output.rc_branch, 'release-candidate/3.6.x');
	assert.equal(output.new_stable_version, '3.5.0');
});

it('rejects a minor release on the v2 maintenance track', () => {
	assert.throws(() => determineTrack('2.50.0'), /only supports v2 patch releases/);
});

it('rejects a patch when v2 maintenance overlaps the global beta line', (t) => {
	const beta = versions.beta;
	versions.beta = versions.v2;
	t.after(() => {
		versions.beta = beta;
	});
	assert.throws(() => determineTrack('2.50.3'), /overlaps with a main release track/);
});
