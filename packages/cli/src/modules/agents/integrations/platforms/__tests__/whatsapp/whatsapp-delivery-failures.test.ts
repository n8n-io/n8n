import {
	DELIVERY_FAILURE_NOTICE,
	DeliveryFailureRecoveryLimiter,
	isRecentFailure,
	parseWindowClosedFailures,
	type WindowClosedFailure,
} from '../../whatsapp/whatsapp-delivery-failures';

const statusWebhook = (statuses: unknown[], field = 'messages') => ({
	object: 'whatsapp_business_account',
	entry: [
		{
			id: 'waba-1',
			changes: [{ field, value: { metadata: { phone_number_id: '111' }, statuses } }],
		},
	],
});

const failedStatus = (code: number, id = 'wamid.1') => ({
	id,
	status: 'failed',
	timestamp: '1792413540',
	recipient_id: '447700900123',
	errors: [{ code, title: 'Re-engagement message' }],
});

describe('parseWindowClosedFailures', () => {
	it('returns a failed status with the re-engagement error code', () => {
		expect(parseWindowClosedFailures(statusWebhook([failedStatus(131047)]))).toEqual([
			{
				messageId: 'wamid.1',
				phoneNumberId: '111',
				recipientId: '447700900123',
				timestamp: '1792413540',
			},
		]);
	});

	it('ignores failures with another error code', () => {
		expect(parseWindowClosedFailures(statusWebhook([failedStatus(131026)]))).toEqual([]);
	});

	it('ignores statuses that are not failures', () => {
		const delivered = { ...failedStatus(131047), status: 'delivered' };
		expect(parseWindowClosedFailures(statusWebhook([delivered]))).toEqual([]);
	});

	it('ignores changes for other fields', () => {
		expect(parseWindowClosedFailures(statusWebhook([failedStatus(131047)], 'other'))).toEqual([]);
	});

	it.each([[null], ['text'], [{}], [{ entry: 'x' }], [{ entry: [{ changes: [null] }] }]])(
		'returns nothing for a malformed payload %j',
		(payload) => {
			expect(parseWindowClosedFailures(payload)).toEqual([]);
		},
	);
});

describe('DeliveryFailureRecoveryLimiter', () => {
	const failure = (messageId: string, recipientId = '447700900123'): WindowClosedFailure => ({
		messageId,
		phoneNumberId: '111',
		recipientId,
		timestamp: '1',
	});

	it('accepts a failure once', () => {
		const limiter = new DeliveryFailureRecoveryLimiter(1000, 3);
		expect(limiter.tryAcquire(failure('a'), 0)).toBe(true);
		expect(limiter.tryAcquire(failure('a'), 5000)).toBe(false);
	});

	it('accepts several different failures for a thread up to the limit', () => {
		const limiter = new DeliveryFailureRecoveryLimiter(1000, 2);
		expect(limiter.tryAcquire(failure('a'), 0)).toBe(true);
		expect(limiter.tryAcquire(failure('b'), 100)).toBe(true);
		expect(limiter.tryAcquire(failure('c'), 200)).toBe(false);
	});

	it('accepts a failure again when earlier recoveries leave the window', () => {
		const limiter = new DeliveryFailureRecoveryLimiter(1000, 1);
		expect(limiter.tryAcquire(failure('a'), 0)).toBe(true);
		expect(limiter.tryAcquire(failure('b'), 500)).toBe(false);
		expect(limiter.tryAcquire(failure('c'), 1000)).toBe(true);
	});

	it('limits each thread on its own', () => {
		const limiter = new DeliveryFailureRecoveryLimiter(1000, 1);
		expect(limiter.tryAcquire(failure('a', '1'), 0)).toBe(true);
		expect(limiter.tryAcquire(failure('b', '2'), 0)).toBe(true);
	});
});

describe('isRecentFailure', () => {
	const failureAt = (timestamp: string): WindowClosedFailure => ({
		messageId: 'a',
		phoneNumberId: '111',
		recipientId: '447700900123',
		timestamp,
	});
	const nowMs = 1_800_000_000_000;

	it('accepts a failure reported a minute ago', () => {
		expect(isRecentFailure(failureAt(String(nowMs / 1000 - 60)), nowMs)).toBe(true);
	});

	it('rejects a failure reported an hour ago', () => {
		expect(isRecentFailure(failureAt(String(nowMs / 1000 - 3600)), nowMs)).toBe(false);
	});

	it('rejects a timestamp that is not a number', () => {
		expect(isRecentFailure(failureAt('soon'), nowMs)).toBe(false);
	});
});

describe('DELIVERY_FAILURE_NOTICE', () => {
	it('asks for a reason on do_not_respond when no template fits', () => {
		expect(DELIVERY_FAILURE_NOTICE).toContain('do_not_respond');
		expect(DELIVERY_FAILURE_NOTICE).toContain('not delivered, no suitable template');
	});
});
