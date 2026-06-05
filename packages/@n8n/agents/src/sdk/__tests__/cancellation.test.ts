import {
	createCancellation,
	createSavePartialResponseAbortReason,
	isCancellation,
	isSavePartialAbortError,
	CANCELLATION_TYPE,
	SAVE_PARTIAL_RESPONSE_ABORT_TYPE,
	SavePartialResponseAbortError,
} from '../cancellation';

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

describe('createSavePartialResponseAbortReason', () => {
	it('creates an Error with a stable marker type', () => {
		const reason = createSavePartialResponseAbortReason();

		expect(reason).toBeInstanceOf(Error);
		expect(reason).toBeInstanceOf(SavePartialResponseAbortError);
		expect(reason.name).toBe('SavePartialResponseAbortError');
		expect(reason._type).toBe(SAVE_PARTIAL_RESPONSE_ABORT_TYPE);
		expect(reason.message).toBe(
			'Agent run was aborted with partial response persistence requested',
		);
	});

	it('allows a custom error message', () => {
		const reason = new SavePartialResponseAbortError('interrupt and save');

		expect(reason.message).toBe('interrupt and save');
		expect(reason._type).toBe(SAVE_PARTIAL_RESPONSE_ABORT_TYPE);
	});
});

describe('isSavePartialAbortError', () => {
	it('returns true for the SDK abort reason instance', () => {
		expect(isSavePartialAbortError(createSavePartialResponseAbortReason())).toBe(true);
	});

	it('returns true for structurally equivalent reasons', () => {
		expect(isSavePartialAbortError({ _type: SAVE_PARTIAL_RESPONSE_ABORT_TYPE })).toBe(true);
	});

	it('returns false for cancellation resume payloads', () => {
		expect(isSavePartialAbortError(createCancellation('steer'))).toBe(false);
	});

	it('returns false for null and unrelated reasons', () => {
		expect(isSavePartialAbortError(null)).toBe(false);
		expect(isSavePartialAbortError(undefined)).toBe(false);
		expect(isSavePartialAbortError(new Error('plain abort'))).toBe(false);
		expect(isSavePartialAbortError({ _type: 'something.else' })).toBe(false);
	});
});
