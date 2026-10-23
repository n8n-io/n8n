import { BatchedLeaseRenewer } from '../batched-lease-renewer';
import type { LeaseRenewal } from '../store';

const HOST = 'main-abc';
const LEASE_MS = 20_000;
const INTERVAL_MS = 5_000;
const MARGIN_MS = 1_000;

const claim = (id: string, claimedEpoch = 1) => ({ host: HOST, id, claimedEpoch });

const lease = (leaseMs = LEASE_MS) => ({
	leaseMs,
	leaseSetAt: performance.now(),
	fenceMarginMs: MARGIN_MS,
});

const setup = () => {
	const renewLeases = vi.fn<(host: string, renewals: LeaseRenewal[]) => Promise<Set<string>>>();
	const onRenewalError = vi.fn();
	const onBatch = vi.fn();
	const renewer = new BatchedLeaseRenewer(HOST, renewLeases, { onRenewalError, onBatch });
	return { renewLeases, onRenewalError, onBatch, renewer };
};

describe('BatchedLeaseRenewer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renews every entry with one write per beat', async () => {
		const { renewLeases, onBatch, renewer } = setup();
		renewLeases.mockResolvedValue(new Set(['a', 'b']));
		const onA = vi.fn();
		const onB = vi.fn();
		renewer.add(claim('a', 3), lease(), onA);
		renewer.add(claim('b', 5), lease(), onB);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
		expect(renewLeases).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(renewLeases).toHaveBeenCalledExactlyOnceWith(HOST, [
			{ id: 'a', claimedEpoch: 3, expiresInMs: LEASE_MS },
			{ id: 'b', claimedEpoch: 5, expiresInMs: LEASE_MS },
		]);
		expect(onA).toHaveBeenCalledExactlyOnceWith('renewed');
		expect(onB).toHaveBeenCalledExactlyOnceWith('renewed');
		expect(onBatch).toHaveBeenCalledWith(2, expect.any(Number));

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(renewLeases).toHaveBeenCalledTimes(2);

		renewer.stop();
	});

	it('beats at a quarter of the shortest lease', async () => {
		const { renewLeases, renewer } = setup();
		renewLeases.mockResolvedValue(new Set(['a', 'b']));
		renewer.add(claim('a'), lease(40_000), vi.fn());
		renewer.add(claim('b'), lease(60_000), vi.fn());

		await vi.advanceTimersByTimeAsync(10_000 - 1);
		expect(renewLeases).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(renewLeases).toHaveBeenCalledTimes(1);

		renewer.stop();
	});

	it('brings the next beat forward when a shorter lease joins', async () => {
		const { renewLeases, renewer } = setup();
		renewLeases.mockResolvedValue(new Set(['a', 'b']));
		const onB = vi.fn();
		renewer.add(claim('a'), lease(600_000), vi.fn());
		renewer.add(claim('b'), lease(LEASE_MS), onB);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(renewLeases).toHaveBeenCalledTimes(1);
		expect(onB).toHaveBeenCalledExactlyOnceWith('renewed');

		await vi.advanceTimersByTimeAsync(LEASE_MS);
		expect(onB).not.toHaveBeenCalledWith('expired');

		renewer.stop();
	});

	it('waits at least the shortest renewal interval between beats', async () => {
		const { renewLeases, renewer } = setup();
		renewLeases.mockResolvedValue(new Set(['a']));
		renewer.add(claim('a'), lease(8_000), vi.fn());

		await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
		expect(renewLeases).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(renewLeases).toHaveBeenCalledTimes(1);

		renewer.stop();
	});

	it('re-arms the fence of a renewed entry from the start of the beat', async () => {
		const { renewLeases, renewer } = setup();
		renewLeases.mockResolvedValueOnce(new Set(['a'])).mockRejectedValue(new Error('db down'));
		const onRenewal = vi.fn();
		renewer.add(claim('a'), lease(), onRenewal);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS + LEASE_MS - MARGIN_MS - 1);
		expect(onRenewal).not.toHaveBeenCalledWith('expired');

		await vi.advanceTimersByTimeAsync(1);
		expect(onRenewal).toHaveBeenCalledWith('expired');

		renewer.stop();
	});

	it('reports a missing id as lost and drops only that entry', async () => {
		const { renewLeases, renewer } = setup();
		renewLeases.mockResolvedValue(new Set(['a']));
		const onA = vi.fn();
		const onB = vi.fn();
		renewer.add(claim('a'), lease(), onA);
		renewer.add(claim('b'), lease(), onB);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(onA).toHaveBeenCalledExactlyOnceWith('renewed');
		expect(onB).toHaveBeenCalledExactlyOnceWith('lost');
		expect(renewer.size).toBe(1);

		await vi.advanceTimersByTimeAsync(LEASE_MS);
		expect(renewLeases).toHaveBeenLastCalledWith(HOST, [
			{ id: 'a', claimedEpoch: 1, expiresInMs: LEASE_MS },
		]);
		expect(onB).toHaveBeenCalledTimes(1);

		renewer.stop();
	});

	it('reports a failed write and still fences each entry at its lease end minus the margin', async () => {
		const { renewLeases, onRenewalError, renewer } = setup();
		const failure = new Error('db down');
		renewLeases.mockRejectedValue(failure);
		const onRenewal = vi.fn();
		renewer.add(claim('a'), lease(), onRenewal);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(onRenewalError).toHaveBeenCalledWith(failure);

		await vi.advanceTimersByTimeAsync(LEASE_MS - MARGIN_MS - INTERVAL_MS - 1);
		expect(onRenewal).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(onRenewal).toHaveBeenCalledExactlyOnceWith('expired');
		expect(renewer.size).toBe(1);

		renewer.stop();
	});

	it('stops beating once the last entry is removed', async () => {
		const { renewLeases, renewer } = setup();
		renewLeases.mockResolvedValue(new Set(['a', 'b']));
		const onA = vi.fn();
		const removeA = renewer.add(claim('a'), lease(), onA);
		const removeB = renewer.add(claim('b'), lease(), vi.fn());

		removeA();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(renewLeases).toHaveBeenCalledExactlyOnceWith(HOST, [
			{ id: 'b', claimedEpoch: 1, expiresInMs: LEASE_MS },
		]);

		removeB();
		await vi.advanceTimersByTimeAsync(10 * LEASE_MS);
		expect(renewLeases).toHaveBeenCalledTimes(1);
		expect(onA).not.toHaveBeenCalled();
		expect(renewer.size).toBe(0);
	});

	it('does not start a second beat when an entry is added while a write is in flight', async () => {
		const { renewLeases, renewer } = setup();
		let finishBeat!: (renewed: Set<string>) => void;
		renewLeases
			.mockReturnValueOnce(
				new Promise((resolve) => {
					finishBeat = resolve;
				}),
			)
			.mockResolvedValue(new Set(['a', 'b']));
		renewer.add(claim('a'), lease(), vi.fn());

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(renewLeases).toHaveBeenCalledTimes(1);

		renewer.add(claim('b'), lease(), vi.fn());
		await vi.advanceTimersByTimeAsync(2 * INTERVAL_MS);
		expect(renewLeases).toHaveBeenCalledTimes(1);

		finishBeat(new Set(['a']));
		await vi.advanceTimersByTimeAsync(0);
		expect(renewLeases).toHaveBeenCalledTimes(2);
		expect(renewLeases).toHaveBeenLastCalledWith(HOST, [
			{ id: 'a', claimedEpoch: 1, expiresInMs: LEASE_MS },
			{ id: 'b', claimedEpoch: 1, expiresInMs: LEASE_MS },
		]);

		renewer.stop();
	});

	it('never renews after stop', async () => {
		const { renewLeases, renewer } = setup();
		renewLeases.mockResolvedValue(new Set(['a']));
		const onRenewal = vi.fn();
		renewer.add(claim('a'), lease(), onRenewal);

		renewer.stop();
		await vi.advanceTimersByTimeAsync(10 * LEASE_MS);

		expect(renewLeases).not.toHaveBeenCalled();
		expect(onRenewal).not.toHaveBeenCalled();
	});
});
