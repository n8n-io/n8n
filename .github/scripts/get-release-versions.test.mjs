import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getSemverTagForTrack } from './get-release-versions.mjs';

describe('getSemverTagForTrack', () => {
	it('returns the highest release tag at the track commit', () => {
		const tags = new Map([
			['stable', 'commit-a'],
			['n8n@2.47.6', 'commit-a'],
			['n8n@2.47.7', 'commit-a'],
			['not-a-release', 'commit-a'],
		]);

		assert.equal(getSemverTagForTrack('stable', tags), 'n8n@2.47.7');
	});

	it('does not use release tags from another commit', () => {
		const tags = new Map([
			['beta', 'commit-a'],
			['n8n@2.48.3', 'commit-a'],
			['n8n@2.48.4', 'commit-b'],
		]);

		assert.equal(getSemverTagForTrack('beta', tags), 'n8n@2.48.3');
	});

	it('returns an empty string when the track is missing', () => {
		assert.equal(getSemverTagForTrack('v1', new Map()), '');
	});

	it('returns an empty string when no release tag points at the track commit', () => {
		const tags = new Map([
			['stable', 'commit-a'],
			['unrelated', 'commit-a'],
		]);

		assert.equal(getSemverTagForTrack('stable', tags), '');
	});
});
