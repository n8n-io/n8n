import { v7 as uuidv7 } from 'uuid';

import { createExecutionIdV2, isExecutionIdV2 } from '../execution-id';

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

describe('createExecutionIdV2', () => {
	// The engine rejects any other shape on the wire, so the format is the contract.
	it('should mint an id the engine accepts', () => {
		expect(createExecutionIdV2()).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	it('should mint a distinct id each call', () => {
		expect(createExecutionIdV2()).not.toBe(createExecutionIdV2());
	});
});
