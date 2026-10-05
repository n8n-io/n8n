import { InvalidLeaseDurationError } from '../../errors';
import { LeaseHeartbeat } from '../lease-heartbeat';

const INTERVAL_MS = 5_000;
const LEASE_MS = 3 * INTERVAL_MS;

const options = () => ({
	leaseDurationMs: LEASE_MS,
	leaseSetAt: performance.now(),
});

describe('LeaseHeartbeat', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renews once per interval while running', async () => {
		const renew = vi.fn().mockResolvedValue(true);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
		expect(renew).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1 + 2 * INTERVAL_MS);
		expect(renew).toHaveBeenCalledTimes(3);
		expect(renew).toHaveBeenCalledWith(LEASE_MS);
		expect(onRenewal).toHaveBeenCalledTimes(3);
		expect(onRenewal).toHaveBeenCalledWith('renewed');

		heartbeat.stop();
	});

	it('does not keep the process alive', async () => {
		const renew = vi.fn().mockResolvedValue(true);
		const heartbeat = new LeaseHeartbeat(renew, options());
		const alarms = heartbeat as unknown as Record<
			'beatAlarm' | 'expiryAlarm',
			{ timer: NodeJS.Timeout }
		>;
		expect(alarms.beatAlarm.timer.hasRef()).toBe(false);
		expect(alarms.expiryAlarm.timer.hasRef()).toBe(false);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(renew).toHaveBeenCalledTimes(1);
		expect(alarms.beatAlarm.timer.hasRef()).toBe(false);
		expect(alarms.expiryAlarm.timer.hasRef()).toBe(false);

		heartbeat.stop();
	});

	it('lands a third renewal before the lease expires when the first two fail', async () => {
		const leaseDurationMs = 60_000;
		const renew = vi
			.fn()
			.mockRejectedValueOnce(new Error('db down'))
			.mockRejectedValueOnce(new Error('db down'))
			.mockResolvedValue(true);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(
			renew,
			{ leaseDurationMs, leaseSetAt: performance.now() },
			{ onRenewal },
		);

		await vi.advanceTimersByTimeAsync(leaseDurationMs);
		expect(onRenewal).toHaveBeenCalledWith('renewed');
		expect(onRenewal).not.toHaveBeenCalledWith('expired');

		heartbeat.stop();
	});

	it('lands a third renewal before the lease expires when the first two fail slowly', async () => {
		const leaseDurationMs = 60_000;
		const slowFailure = async () =>
			await new Promise<boolean>((_, reject) =>
				setTimeout(() => reject(new Error('db down')), 10_000),
			);
		const renew = vi
			.fn()
			.mockImplementationOnce(slowFailure)
			.mockImplementationOnce(slowFailure)
			.mockResolvedValue(true);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(
			renew,
			{ leaseDurationMs, leaseSetAt: performance.now() },
			{ onRenewal },
		);

		await vi.advanceTimersByTimeAsync(leaseDurationMs);
		expect(onRenewal).toHaveBeenCalledWith('renewed');
		expect(onRenewal).not.toHaveBeenCalledWith('expired');

		heartbeat.stop();
	});

	it('waits at least five seconds between renewals, so a short lease expires before its first one', async () => {
		const renew = vi.fn().mockResolvedValue(true);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(
			renew,
			{ leaseDurationMs: 3_000, leaseSetAt: performance.now() },
			{ onRenewal },
		);

		await vi.advanceTimersByTimeAsync(5_000 - 1);
		expect(renew).not.toHaveBeenCalled();
		expect(onRenewal).toHaveBeenCalledExactlyOnceWith('expired');

		await vi.advanceTimersByTimeAsync(1);
		expect(renew).toHaveBeenCalledTimes(1);

		heartbeat.stop();
	});

	it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects a lease duration of %s',
		(leaseDurationMs) => {
			expect(
				() => new LeaseHeartbeat(vi.fn(), { leaseDurationMs, leaseSetAt: performance.now() }),
			).toThrow(InvalidLeaseDurationError);
		},
	);

	it('reports a lost claim once and stops renewing', async () => {
		const renew = vi.fn().mockResolvedValue(false);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);

		expect(onRenewal).toHaveBeenCalledExactlyOnceWith('lost');

		await vi.advanceTimersByTimeAsync(5 * INTERVAL_MS);
		expect(renew).toHaveBeenCalledTimes(1);

		heartbeat.stop();
	});

	it('reports a failed renewal and tries again on the next beat', async () => {
		const failure = new Error('db down');
		const renew = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(true);
		const onRenewalError = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewalError });

		await vi.advanceTimersByTimeAsync(2 * INTERVAL_MS);

		expect(onRenewalError).toHaveBeenCalledWith(failure);
		expect(renew).toHaveBeenCalledTimes(2);

		heartbeat.stop();
	});

	it('reports an expired lease once a whole lease passes without a successful renewal', async () => {
		const renew = vi.fn().mockRejectedValue(new Error('db down'));
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(LEASE_MS - 1);
		expect(onRenewal).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(onRenewal).toHaveBeenCalledExactlyOnceWith('expired');

		heartbeat.stop();
	});

	it('keeps renewing after a missed lease, so the claim survives a short outage', async () => {
		const renew = vi
			.fn()
			.mockRejectedValueOnce(new Error('db down'))
			.mockRejectedValueOnce(new Error('db down'))
			.mockResolvedValue(true);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(LEASE_MS + INTERVAL_MS);

		expect(renew).toHaveBeenCalledTimes(4);
		expect(onRenewal.mock.calls).toEqual([['expired'], ['renewed'], ['renewed']]);

		heartbeat.stop();
	});

	it('reports an expired lease, then a lost claim once a renewal finds it gone', async () => {
		const renew = vi
			.fn()
			.mockRejectedValueOnce(new Error('db down'))
			.mockRejectedValueOnce(new Error('db down'))
			.mockRejectedValueOnce(new Error('db down'))
			.mockResolvedValue(false);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(LEASE_MS + INTERVAL_MS);

		expect(renew).toHaveBeenCalledTimes(4);
		expect(onRenewal.mock.calls).toEqual([['expired'], ['lost']]);

		heartbeat.stop();
	});

	it('counts the lease from the start of the last successful renewal', async () => {
		const renew = vi.fn().mockResolvedValueOnce(true).mockRejectedValue(new Error('db down'));
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(INTERVAL_MS + LEASE_MS - 1);
		expect(onRenewal).not.toHaveBeenCalledWith('expired');

		await vi.advanceTimersByTimeAsync(1);
		expect(onRenewal).toHaveBeenCalledWith('expired');

		heartbeat.stop();
	});

	it('measures the lease on a monotonic clock, so a wall-clock jump does not delay the expiry', async () => {
		const renew = vi
			.fn()
			.mockImplementationOnce(async () => {
				vi.setSystemTime(Date.now() - 60 * 60 * 1_000);
				return true;
			})
			.mockRejectedValue(new Error('db down'));
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(INTERVAL_MS + LEASE_MS);
		expect(onRenewal).toHaveBeenCalledWith('expired');

		heartbeat.stop();
	});

	it('waits out a lease longer than the timer limit', async () => {
		const day = 24 * 60 * 60 * 1_000;
		const leaseDurationMs = 90 * day;
		const renew = vi.fn().mockRejectedValue(new Error('db down'));
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(
			renew,
			{ leaseDurationMs, leaseSetAt: performance.now() },
			{ onRenewal },
		);

		await vi.advanceTimersByTimeAsync(1_000);
		expect(renew).not.toHaveBeenCalled();
		expect(onRenewal).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(leaseDurationMs - 1_000 - 1);
		expect(onRenewal).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(onRenewal).toHaveBeenCalledExactlyOnceWith('expired');

		heartbeat.stop();
	});

	it('never renews after stop', async () => {
		const renew = vi.fn().mockResolvedValue(true);
		const heartbeat = new LeaseHeartbeat(renew, options());

		heartbeat.stop();
		await vi.advanceTimersByTimeAsync(5 * INTERVAL_MS);

		expect(renew).not.toHaveBeenCalled();
	});

	it('ignores a renewal that settles after stop, so a terminal write is not taken for a lost claim', async () => {
		let settle!: (renewed: boolean) => void;
		const renew = vi.fn(
			async () =>
				await new Promise<boolean>((resolve) => {
					settle = resolve;
				}),
		);
		const onRenewal = vi.fn();
		const heartbeat = new LeaseHeartbeat(renew, options(), { onRenewal });

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		heartbeat.stop();
		settle(false);
		await vi.advanceTimersByTimeAsync(5 * INTERVAL_MS);

		expect(onRenewal).not.toHaveBeenCalled();
		expect(renew).toHaveBeenCalledTimes(1);
	});
});
