import { decodeStepId, encodeStepId } from './approval-callback';

const STEP_ID = '01926a4e-7f5c-7000-8000-000000000001';

describe('approval callback step id', () => {
	it('round-trips a UUID v7 through 22 base64url characters', () => {
		const encoded = encodeStepId(STEP_ID);

		expect(encoded).toHaveLength(22);
		expect(decodeStepId(encoded)).toBe(STEP_ID);
	});

	it('rejects a respelled last character, a non-v7 id and a wrong length', () => {
		const encoded = encodeStepId(STEP_ID);

		expect(decodeStepId(encoded.slice(0, 21) + 'B')).toBeUndefined();
		expect(decodeStepId(encodeStepId('01926a4e-7f5c-4000-8000-000000000001'))).toBeUndefined();
		expect(decodeStepId('short')).toBeUndefined();
		expect(decodeStepId('A'.repeat(100_000))).toBeUndefined();
	});
});
