import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import { tagVersionInfoToReleaseCandidateBranchName } from './github-helpers.mjs';

const trySh = mock.fn(() => ({ ok: true, out: '' }));
function resolveV2Track(track) {
	if (track === 'stable') return { version: '2.9.2', tag: 'n8n@2.9.2' };
	if (track === 'beta') return { version: '2.10.1', tag: 'n8n@2.10.1' };
	return { version: '1.123.33', tag: 'n8n@1.123.33' };
}
const resolveReleaseTagForTrack = mock.fn(resolveV2Track);

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
		RELEASE_PREFIX: 'n8n@',
		listRemoteTagsWithCommits: () =>
			new Map([
				['n8n@1.123.33', 'v1'],
				['n8n@2.9.2', 'stable'],
				['n8n@2.10.1', 'beta'],
				['n8n@3.0.0', 'prerelease'],
			]),
		resolveReleaseTagForTrack,
		tagVersionInfoToReleaseCandidateBranchName,
		trySh,
		writeGithubOutput: () => {}, // no-op in tests
		getCommitForRef: () => {}, // no-op
		localRefExists: () => {}, // no-op
		remoteBranchExists: () => {}, // no-op
		sh: () => {}, // no-op
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
		assert.equal(output.previous_version, '2.9.2');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'stable');
		assert.equal(output.rc_branch, '2.x');
	});

	it('Allow patch releases on beta', () => {
		const output = determineTrack('2.10.2');

		assert.equal(output.track, 'beta');
		assert.equal(output.version, '2.10.2');
		assert.equal(output.previous_version, '2.10.1');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'stable');
		assert.equal(output.rc_branch, '2.x');
	});

	// This use case might happen if a patch release fails and we proceed with rolling over to next release
	it('Allow skipping versions in patches', () => {
		const output = determineTrack('2.9.4');

		assert.equal(output.track, 'stable');
		assert.equal(output.version, '2.9.4');
		assert.equal(output.previous_version, '2.9.2');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'stable');
		assert.equal(output.rc_branch, '2.x');
	});

	it('Disallow skipping versions in minors', () => {
		assert.throws(() => determineTrack('2.12.0'));
	});
	it('Disallow changing major version', () => {
		assert.throws(() => determineTrack('3.0.0'), /Major version bumps are not allowed/);
		assert.throws(() => determineTrack('3.6.0'), /Major version bumps are not allowed/);
		assert.throws(() => determineTrack('3.5.1'), /Major version bumps are not allowed/);
	});
	it('Promote the v3 baseline when cutting the first normal v3 beta', () => {
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
	it('Reject the v3 cutover if its baseline is not in the release history', () => {
		trySh.mock.mockImplementationOnce(() => ({ ok: false, out: '' }));
		assert.throws(() => determineTrack('3.5.0'), /must descend from n8n@3\.4\.1/);
	});
	it('Use the live v3 beta for subsequent v3 minors and patches', (t) => {
		const versions = {
			stable: { version: '3.4.1', tag: 'n8n@3.4.1' },
			beta: { version: '3.5.0', tag: 'n8n@3.5.0' },
		};
		resolveReleaseTagForTrack.mock.mockImplementation(
			(track) => versions[track] ?? resolveV2Track(track),
		);
		t.after(() => resolveReleaseTagForTrack.mock.restore());
		trySh.mock.resetCalls();
		const minor = determineTrack('3.6.0');
		assert.equal(minor.previous_version, '3.5.0');
		assert.equal(minor.new_stable_version, '3.5.0');
		const patch = determineTrack('3.5.1');
		assert.equal(patch.previous_version, '3.5.0');
		assert.equal(patch.new_stable_version, null);
		assert.equal(trySh.mock.callCount(), 0);
	});
	it('Allow a standalone prerelease with a bare major version', () => {
		const output = determineTrack('3.0.0', { prerelease: true });

		assert.equal(output.track, 'rc');
		assert.equal(output.version, '3.0.0');
		assert.equal(output.previous_version, '2.10.1');
		assert.equal(output.bump, 'minor');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'rc');
		assert.equal(output.rc_branch, 'release-candidate/3.0.x');
		assert.equal(output.prerelease, true);
	});
	it('Use the previous standalone prerelease for the next weekly minor', () => {
		const output = determineTrack('3.1.0', { prerelease: true });

		assert.equal(output.track, 'rc');
		assert.equal(output.version, '3.1.0');
		assert.equal(output.previous_version, '3.0.0');
		assert.equal(output.bump, 'minor');
		assert.equal(output.release_type, 'rc');
		assert.equal(output.rc_branch, 'release-candidate/3.1.x');
		assert.equal(output.prerelease, true);
	});
	it('Allow a standalone prerelease patch', () => {
		const output = determineTrack('3.0.1', { prerelease: true });

		assert.equal(output.track, 'rc');
		assert.equal(output.version, '3.0.1');
		assert.equal(output.previous_version, '3.0.0');
		assert.equal(output.bump, 'patch');
		assert.equal(output.release_type, 'rc');
		assert.equal(output.rc_branch, 'release-candidate/3.0.x');
		assert.equal(output.prerelease, true);
	});
	it('Reject a standalone prerelease outside v3', () => {
		assert.throws(
			() => determineTrack('2.11.0', { prerelease: true }),
			/require a bare v3 version/,
		);
	});
	it('Reject a standalone prerelease with a SemVer prerelease suffix', () => {
		assert.throws(
			() => determineTrack('3.1.0-rc.0', { prerelease: true }),
			/require a bare v3 version/,
		);
	});
	it('Throw when track is not determinable', () => {
		assert.throws(() => determineTrack(''));
	});

	it('Set track as "beta" when doing a minor bump', () => {
		const output = determineTrack('2.11.0');

		assert.equal(output.track, 'beta');
		assert.equal(output.version, '2.11.0');
		assert.equal(output.previous_version, '2.10.1');
		assert.equal(output.bump, 'minor');
		assert.equal(output.new_stable_version, '2.10.1');
		assert.equal(output.release_type, 'stable');
		assert.equal(output.rc_branch, '2.x');
	});

	it('Set release_type accordingly on rc releases', () => {
		const output = determineTrack('2.10.2-rc.1');

		assert.equal(output.track, 'beta');
		assert.equal(output.version, '2.10.2-rc.1');
		assert.equal(output.previous_version, '2.10.1');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'rc');
		assert.equal(output.rc_branch, '2.x');
	});

	it('Set release_type accordingly on exp releases', () => {
		const output = determineTrack('2.9.2-exp.0');

		assert.equal(output.track, 'stable');
		assert.equal(output.version, '2.9.2-exp.0');
		assert.equal(output.previous_version, '2.9.2');
		assert.equal(output.bump, 'patch');
		assert.equal(output.new_stable_version, null);
		assert.equal(output.release_type, 'rc');
		assert.equal(output.rc_branch, '2.x');
	});
});
