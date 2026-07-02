import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDesiredLabels } from './promote-backport-labels-on-minor.mjs';

describe('computeDesiredLabels', () => {
	it('clears stable on a PR without beta', () => {
		assert.deepEqual(computeDesiredLabels({ hadBeta: false }), { wantStable: false });
	});

	it('keeps stable on a PR marked for beta (promoted from beta)', () => {
		assert.deepEqual(computeDesiredLabels({ hadBeta: true }), { wantStable: true });
	});
});
