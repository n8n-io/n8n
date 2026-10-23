import { isPolicyRefusedToolOutput, parseToolPolicyRefusal } from '../toolPolicyRefusal';

const violation = { kind: 'node-type-unavailable', checkId: 'check-1', message: 'Not allowed' };
const refusal = {
	isPolicyRefusal: true,
	message: 'Blocked by policy',
	violations: [violation],
	instruction: 'Ask the user to pick another tool.',
};

describe('parseToolPolicyRefusal', () => {
	it('reads the violations of a serialized policy refusal', () => {
		expect(parseToolPolicyRefusal(refusal)).toEqual({ violations: [violation] });
		expect(isPolicyRefusedToolOutput(refusal)).toBe(true);
	});

	it.each([
		['undefined', undefined],
		['a plain string', 'Something failed'],
		['an ordinary tool output', { foo: 'bar' }],
		['violations without the refusal marker', { violations: [violation] }],
		['a refusal with no violations', { ...refusal, violations: [] }],
	])('rejects %s', (_label, output) => {
		expect(parseToolPolicyRefusal(output)).toBeUndefined();
		expect(isPolicyRefusedToolOutput(output)).toBe(false);
	});
});
