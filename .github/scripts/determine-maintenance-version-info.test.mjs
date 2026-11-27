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

for (const [major, minor, nextPatch] of [
	[1, 123, 34],
	[2, 50, 3],
]) {
	const track = `v${major}`;
	const patch = `${major}.${minor}.${nextPatch}`;

	it(`routes a ${track} patch to its maintenance branch without promotion`, () => {
		const output = determineTrack(patch);
		assert.equal(output.track, track);
		assert.equal(output.previous_version, versions[track]);
		assert.equal(output.bump, 'patch');
		assert.equal(output.rc_branch, `${major}.x`);
		assert.equal(output.new_stable_version, null);
	});

	it(`rejects a minor release on the ${track} maintenance track`, () => {
		assert.throws(
			() => determineTrack(`${major}.${minor}.0`),
			/maintenance track only supports patches/,
		);
	});

	it(`rejects a patch when ${track} maintenance overlaps the global beta line`, (t) => {
		const beta = versions.beta;
		versions.beta = versions[track];
		t.after(() => {
			versions.beta = beta;
		});
		assert.throws(() => determineTrack(patch), /overlaps with another release track/);
	});
}

it('promotes the previous v3 beta on a normal v3 minor release', () => {
	const output = determineTrack('3.6.0');
	assert.equal(output.track, 'beta');
	assert.equal(output.rc_branch, 'release-candidate/3.6.x');
	assert.equal(output.new_stable_version, '3.5.0');
});
