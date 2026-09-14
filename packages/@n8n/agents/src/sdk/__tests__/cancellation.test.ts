import { createCancellation, isCancellation, CANCELLATION_TYPE } from '../cancellation';

describe('createCancellation', () => {
	it('creates an object with the correct _type and message', () => {
		const c = createCancellation('do something else');
		expect(c._type).toBe(CANCELLATION_TYPE);
		expect(c.message).toBe('do something else');
	});

	it('is detected by isCancellation', () => {
		const c = createCancellation('steer me');
		expect(isCancellation(c)).toBe(true);
	});
});

describe('isCancellation', () => {
	it('returns true for a valid cancellation object', () => {
		expect(isCancellation({ _type: 'agent.cancellation', message: 'hello' })).toBe(true);
	});

	it('returns false for null', () => {
		expect(isCancellation(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isCancellation(undefined)).toBe(false);
	});

	it('returns false for a plain resume payload', () => {
		expect(isCancellation({ approved: true })).toBe(false);
	});

	it('returns false when _type is wrong', () => {
		expect(isCancellation({ _type: 'something.else', message: 'hi' })).toBe(false);
	});

	it('returns false when message is missing', () => {
		expect(isCancellation({ _type: 'agent.cancellation' })).toBe(false);
	});

	it('returns false when message is not a string', () => {
		expect(isCancellation({ _type: 'agent.cancellation', message: 42 })).toBe(false);
	});

	it('survives a JSON round-trip (simulating HTTP wire format)', () => {
		const original = createCancellation('change direction');
		const serialized = JSON.stringify(original);
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		const deserialized = JSON.parse(serialized) as unknown;
		expect(isCancellation(deserialized)).toBe(true);
		expect((deserialized as ReturnType<typeof createCancellation>).message).toBe(
			'change direction',
		);
	});
});
