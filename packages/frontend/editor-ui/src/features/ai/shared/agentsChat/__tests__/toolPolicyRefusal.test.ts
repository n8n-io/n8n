import { isPolicyRefusedToolOutput, parseToolPolicyRefusal } from '../toolPolicyRefusal';

const validRefusal = {
	status: 'policy_refused' as const,
	error: 'Blocked by policy',
	violations: [{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Not allowed' }],
	instruction: 'Ask the user to pick another tool.',
};

describe('parseToolPolicyRefusal', () => {
	it('parses a valid refusal', () => {
		expect(parseToolPolicyRefusal(validRefusal)).toEqual(validRefusal);
		expect(isPolicyRefusedToolOutput(validRefusal)).toBe(true);
	});

	it.each([
		['undefined', undefined],
		['a plain string', 'Something failed'],
		['an ordinary tool output', { foo: 'bar' }],
		['a refusal with no violations', { ...validRefusal, violations: [] }],
		['another status', { ...validRefusal, status: 'error' }],
	])('rejects %s', (_label, output) => {
		expect(parseToolPolicyRefusal(output)).toBeUndefined();
		expect(isPolicyRefusedToolOutput(output)).toBe(false);
	});
});
