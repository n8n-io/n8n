import { describe, it, expect } from 'vitest';

import { parseExecutionBlockCauses } from './wontExecute';

describe('parseExecutionBlockCauses', () => {
	it('keeps known causes and drops unknown ones', () => {
		expect(parseExecutionBlockCauses(['unknown', 'restrictedNode', ''])).toEqual([
			'restrictedNode',
		]);
	});

	it('returns no causes for an empty list', () => {
		expect(parseExecutionBlockCauses([])).toEqual([]);
	});
});
