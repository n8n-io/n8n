import {
	buildHitlCallbackReference,
	HITL_CALLBACK_PREFIX,
	HITL_CALLBACK_PREFIX_V2,
	parseHitlCallbackReference,
	verifyHitlCallbackReference,
} from '../hitl-callback-reference';

const SECRET = 'test-hmac-secret';
const STEP_ID = '01926a4e-7f5c-7000-8000-000000000001';
const ENCODED_STEP_ID = Buffer.from(STEP_ID.replaceAll('-', ''), 'hex').toString('base64url');

describe('buildHitlCallbackReference / parseHitlCallbackReference', () => {
	test('round-trips an approve decision', () => {
		const reference = buildHitlCallbackReference('123', 'a', SECRET);

		expect(reference.startsWith(HITL_CALLBACK_PREFIX)).toBe(true);
		expect(reference.length).toBeLessThan(64);

		const parsed = parseHitlCallbackReference(reference);
		expect(parsed).toEqual({
			kind: 'execution',
			executionId: '123',
			decision: 'a',
			hmac: expect.any(String),
		});
	});

	test('round-trips a decline decision', () => {
		const reference = buildHitlCallbackReference('456', 'd', SECRET);
		const parsed = parseHitlCallbackReference(reference);

		expect(parsed).toMatchObject({ kind: 'execution', executionId: '456', decision: 'd' });
	});

	test('throws if the reference would exceed the 64-byte platform limit', () => {
		const hugeExecutionId = '1'.repeat(60);
		expect(() => buildHitlCallbackReference(hugeExecutionId, 'a', SECRET)).toThrow();
	});

	test('allows a reference that is exactly 64 bytes, the platform maximum', () => {
		// prefix (7) + executionId (22) + 2 pipes + decision (1) + hmac (32) = 64
		const executionId = '1'.repeat(22);
		const reference = buildHitlCallbackReference(executionId, 'a', SECRET);

		expect(reference.length).toBe(64);
		expect(() => buildHitlCallbackReference(executionId, 'a', SECRET)).not.toThrow();
	});

	test('returns null for a payload without the versioned prefix', () => {
		expect(parseHitlCallbackReference('not-a-hitl-reference')).toBeNull();
	});

	test('returns null for a payload with an invalid decision', () => {
		expect(parseHitlCallbackReference(`${HITL_CALLBACK_PREFIX}123|x|abcd`)).toBeNull();
	});

	test('returns null for a payload missing the hmac segment', () => {
		expect(parseHitlCallbackReference(`${HITL_CALLBACK_PREFIX}123|a|`)).toBeNull();
	});

	test('reads the step out of an engine v2 reference', () => {
		const parsed = parseHitlCallbackReference(`${HITL_CALLBACK_PREFIX_V2}${ENCODED_STEP_ID}|d|mac`);

		expect(parsed).toEqual({ kind: 'step', stepId: STEP_ID, decision: 'd', hmac: 'mac' });
	});

	test('returns null for an engine v2 reference whose step id is not 22 base64url characters', () => {
		expect(parseHitlCallbackReference(`${HITL_CALLBACK_PREFIX_V2}${STEP_ID}|a|mac`)).toBeNull();
	});
});

describe('verifyHitlCallbackReference', () => {
	test('accepts a reference minted with the same secret', () => {
		const parsed = parseHitlCallbackReference(buildHitlCallbackReference('123', 'a', SECRET));

		expect(verifyHitlCallbackReference(parsed!, SECRET)).toBe(true);
	});

	test('rejects a reference verified against a different secret', () => {
		const parsed = parseHitlCallbackReference(buildHitlCallbackReference('123', 'a', SECRET));

		expect(verifyHitlCallbackReference(parsed!, 'a-different-secret')).toBe(false);
	});

	test('rejects a tampered decision (execution id kept, decision flipped)', () => {
		const parsed = parseHitlCallbackReference(buildHitlCallbackReference('123', 'a', SECRET));
		const tampered = { ...parsed!, decision: 'd' as const };

		expect(verifyHitlCallbackReference(tampered, SECRET)).toBe(false);
	});

	test('rejects a step-bound reference, whose secret the instance does not hold', () => {
		const parsed = parseHitlCallbackReference(`${HITL_CALLBACK_PREFIX_V2}${ENCODED_STEP_ID}|a|mac`);

		expect(verifyHitlCallbackReference(parsed!, SECRET)).toBe(false);
	});

	test('rejects a tampered execution id (decision kept, execution id changed)', () => {
		const parsed = parseHitlCallbackReference(buildHitlCallbackReference('123', 'a', SECRET));
		const tampered = { ...parsed!, executionId: '999' };

		expect(verifyHitlCallbackReference(tampered, SECRET)).toBe(false);
	});
});
