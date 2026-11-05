import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { roundPopularity } from './fetch-credential-setupability.mjs';

describe('roundPopularity', () => {
	it('preserves a missing value', () => {
		assert.equal(roundPopularity(null), null);
	});

	it('rounds a value to one decimal place', () => {
		assert.equal(roundPopularity(0.26), 0.3);
	});
});
