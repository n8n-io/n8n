import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDesiredLabels } from './promote-backport-labels-on-minor.mjs';

describe('computeDesiredLabels', () => {
	it('clears a lone stable label', () => {
		assert.deepEqual(
			computeDesiredLabels({ hadStable: true, hadBeta: false, includedInRelease: false }),
			{ wantStable: false, wantBeta: false },
		);
	});

	it('promotes beta to stable, keeping beta when not yet in the release', () => {
		assert.deepEqual(
			computeDesiredLabels({ hadStable: false, hadBeta: true, includedInRelease: false }),
			{ wantStable: true, wantBeta: true },
		);
	});

	it('promotes beta to stable and drops beta once it is in the release', () => {
		assert.deepEqual(
			computeDesiredLabels({ hadStable: false, hadBeta: true, includedInRelease: true }),
			{ wantStable: true, wantBeta: false },
		);
	});

	it('keeps stable and drops beta for a both-labelled PR already in the release', () => {
		assert.deepEqual(
			computeDesiredLabels({ hadStable: true, hadBeta: true, includedInRelease: true }),
			{ wantStable: true, wantBeta: false },
		);
	});
});
