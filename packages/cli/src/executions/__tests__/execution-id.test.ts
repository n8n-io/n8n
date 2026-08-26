import { v7 as uuidv7 } from 'uuid';

import { isExecutionIdV2 } from '../execution-id';

describe('isExecutionIdV2', () => {
	it('should accept an id the engine mints', () => {
		expect(isExecutionIdV2(uuidv7())).toBe(true);
	});

	it('should accept a uuid whose version nibble is not 1-5', () => {
		// A version-pinned regex would reject every engine id.
		expect(isExecutionIdV2('01a038ae-c4a8-7799-8a3e-e3c2ca055cfa')).toBe(true);
	});

	it.each(['1', '12345', 'test', '', 'not-a-uuid', '01a038ae-c4a8-7799-8a3e-e3c2ca055cf'])(
		'should reject %j',
		(id) => {
			expect(isExecutionIdV2(id)).toBe(false);
		},
	);
});
