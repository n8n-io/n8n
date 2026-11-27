import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import * as helpers from './github-helpers.mjs';

const versions = { stable: '3.4.1', beta: '3.5.0' };
const preCutoverVersions = { stable: '2.9.2', beta: '2.10.1' };
const releaseTag = (version) => (version ? { version, tag: `n8n@${version}` } : null);
const resolveReleaseTagForTrack = mock.fn((track) => releaseTag(versions[track]));
const trySh = mock.fn(() => ({ ok: true, out: '' }));

mock.module('./github-helpers.mjs', {
	namedExports: {
		...helpers,
		listRemoteTagsWithCommits: () =>
			new Map([
				['n8n@2.10.1', 'beta'],
				['n8n@3.0.0', 'prerelease'],
			]),
		resolveReleaseTagForTrack,
		trySh,
		writeGithubOutput: () => {},
	},
});

const { determineTrack } = await import('./determine-version-info.mjs');

describe('determineTrack', () => {
	it('allows patch releases on stable', () => {
		assert.deepEqual(determineTrack('3.4.2'), {
			track: 'stable',
			version: '3.4.2',
			previous_version: '3.4.1',
			bump: 'patch',
			new_stable_version: null,
			release_type: 'stable',
			rc_branch: 'release-candidate/3.4.x',
			prerelease: false,
		});
	});

	it('allows patch releases on beta', () => {
		assert.deepEqual(determineTrack('3.5.1'), {
			track: 'beta',
			version: '3.5.1',
			previous_version: '3.5.0',
			bump: 'patch',
			new_stable_version: null,
			release_type: 'stable',
			rc_branch: 'release-candidate/3.5.x',
			prerelease: false,
		});
	});

	it('allows skipping patch versions', () => {
		const output = determineTrack('3.4.3');
		assert.equal(output.track, 'stable');
		assert.equal(output.previous_version, '3.4.1');
		assert.equal(output.bump, 'patch');
		assert.equal(output.rc_branch, 'release-candidate/3.4.x');
	});

	it('rejects skipping minor versions', () => {
		assert.throws(() => determineTrack('3.7.0'), /more than one increment/);
	});

	it('rejects a major version change', () => {
		assert.throws(() => determineTrack('4.0.0'), /Major version bumps are not allowed/);
	});

	it('rejects an invalid version', () => {
		assert.throws(() => determineTrack(''), /Package semver not valid/);
	});

	it('releases a new minor to beta and promotes the previous beta', () => {
		trySh.mock.resetCalls();
		assert.deepEqual(determineTrack('3.6.0'), {
			track: 'beta',
			version: '3.6.0',
			previous_version: '3.5.0',
			bump: 'minor',
			new_stable_version: '3.5.0',
			release_type: 'stable',
			rc_branch: 'release-candidate/3.6.x',
			prerelease: false,
		});
		assert.equal(trySh.mock.callCount(), 0);
	});

	it('sets the release type for a release candidate', () => {
		const output = determineTrack('3.5.1-rc.1');
		assert.equal(output.track, 'beta');
		assert.equal(output.previous_version, '3.5.0');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'rc');
		assert.equal(output.rc_branch, 'release-candidate/3.5.x');
	});

	it('sets the release type for an experimental release', () => {
		const output = determineTrack('3.4.1-exp.0');
		assert.equal(output.track, 'stable');
		assert.equal(output.previous_version, '3.4.1');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'rc');
		assert.equal(output.rc_branch, 'release-candidate/3.4.x');
	});
});

describe('first normal v3 release', () => {
	it('promotes the v3 baseline when the release descends from it', (t) => {
		resolveReleaseTagForTrack.mock.mockImplementation((track) =>
			releaseTag(preCutoverVersions[track]),
		);
		t.after(() => resolveReleaseTagForTrack.mock.restore());
		trySh.mock.resetCalls();
		assert.deepEqual(determineTrack('3.5.0'), {
			previous_version: '3.4.1',
			version: '3.5.0',
			track: 'beta',
			bump: 'minor',
			new_stable_version: '3.4.1',
			release_type: 'stable',
			rc_branch: 'release-candidate/3.5.x',
			prerelease: false,
		});
		assert.deepEqual(trySh.mock.calls[0].arguments, [
			'git',
			['merge-base', '--is-ancestor', 'refs/tags/n8n@3.4.1', 'HEAD'],
		]);
	});

	it('rejects a release that does not descend from the v3 baseline', (t) => {
		resolveReleaseTagForTrack.mock.mockImplementation((track) =>
			releaseTag(preCutoverVersions[track]),
		);
		t.after(() => resolveReleaseTagForTrack.mock.restore());
		trySh.mock.mockImplementationOnce(() => ({ ok: false, out: '' }));
		assert.throws(() => determineTrack('3.5.0'), /must descend from n8n@3\.4\.1/);
	});
});

describe('standalone prereleases', () => {
	for (const [version, previous, bump] of [
		['3.0.0', '2.10.1', 'minor'],
		['3.1.0', '3.0.0', 'minor'],
		['3.0.1', '3.0.0', 'patch'],
	]) {
		it(`plans ${version} after ${previous}`, () => {
			assert.deepEqual(determineTrack(version, { prerelease: true }), {
				previous_version: previous,
				version,
				track: 'rc',
				bump,
				new_stable_version: null,
				release_type: 'rc',
				rc_branch: `release-candidate/${version.split('.').slice(0, 2).join('.')}.x`,
				prerelease: true,
			});
		});
	}

	it('requires a bare v3 version', () => {
		for (const version of ['2.11.0', '3.1.0-rc.0']) {
			assert.throws(
				() => determineTrack(version, { prerelease: true }),
				/require a bare v3 version/,
			);
		}
	});
});
