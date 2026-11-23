import type { Logger } from '@n8n/backend-common';
import type { LeaseKindRepository, LeaseSessionRepository, NewLeaseSession } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { LeaseSessionManager } from '../lease-session-manager';

describe('LeaseSessionManager', () => {
	const LEASE_SECONDS = 20;
	const RENEW_SECONDS = 5;

	let kinds: ReturnType<typeof mock<LeaseKindRepository>>;
	let sessions: ReturnType<typeof mock<LeaseSessionRepository>>;
	let session: LeaseSessionManager;
	let logger: ReturnType<typeof mock<Logger>>;

	const insertedSessions = () =>
		sessions.insertSession.mock.calls.map(([inserted]: [NewLeaseSession, unknown]) => inserted);

	const nextBeat = async () => await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000 * 1.1);

	const expectHeld = async (id: string) => {
		sessions.renewLive.mockClear();
		await nextBeat();
		expect(sessions.renewLive).toHaveBeenCalledWith(id, LEASE_SECONDS, expect.anything());
		expect(sessions.deleteSession).not.toHaveBeenCalledWith(id, expect.anything());
	};

	const expectLost = async (id: string) => {
		expect(sessions.deleteSession).toHaveBeenCalledWith(id, expect.anything());
		sessions.renewLive.mockClear();
		const insertsBefore = sessions.insertSession.mock.calls.length;
		await nextBeat();
		expect(sessions.renewLive).not.toHaveBeenCalledWith(id, expect.anything(), expect.anything());
		expect(sessions.insertSession.mock.calls.length).toBeGreaterThan(insertsBefore);
	};

	beforeEach(() => {
		vi.useFakeTimers();
		kinds = mock<LeaseKindRepository>();
		kinds.insertIfMissing.mockResolvedValue();
		sessions = mock<LeaseSessionRepository>();
		sessions.insertSession.mockResolvedValue();
		sessions.renewLive.mockResolvedValue(true);
		sessions.deleteSession.mockResolvedValue();
		logger = mock<Logger>();
		session = new LeaseSessionManager({
			kind: 'test-kind',
			leaseSeconds: LEASE_SECONDS,
			renewSeconds: RENEW_SECONDS,
			hostId: 'host-1',
			bootId: 'boot-1',
			kinds,
			sessions,
			logger,
		});
	});

	afterEach(async () => {
		await session.stop();
		vi.restoreAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('inserts a session on the next beat when the first insert fails', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.insertSession.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(session.start()).rejects.toThrow('database unavailable');

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		const [first, second] = insertedSessions();
		expect(sessions.insertSession).toHaveBeenCalledTimes(2);
		expect(second.id).not.toBe(first.id);
		await expectHeld(second.id);
	});

	it.each([
		{ random: 0, delayMs: RENEW_SECONDS * 1000 * 0.9 },
		{ random: 1, delayMs: RENEW_SECONDS * 1000 * 1.1 },
	])(
		'renews once per beat after $delayMs ms when the jitter source returns $random',
		async ({ random, delayMs }) => {
			vi.spyOn(Math, 'random').mockReturnValue(random);
			await session.start();
			const [first] = insertedSessions();

			await vi.advanceTimersByTimeAsync(delayMs - 1);
			expect(sessions.renewLive).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			expect(sessions.renewLive).toHaveBeenCalledTimes(1);
			expect(sessions.renewLive).toHaveBeenCalledWith(first.id, LEASE_SECONDS, expect.anything());

			await vi.advanceTimersByTimeAsync(delayMs);
			expect(sessions.renewLive).toHaveBeenCalledTimes(2);
		},
	);

	it('loses the session and deletes its row when a renewal finds it expired', async () => {
		sessions.renewLive.mockResolvedValue(false);
		await session.start();
		const [first] = insertedSessions();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000 * 1.1);

		await expectLost(first.id);
	});

	it('keeps the session and renews again when a renewal fails with a database error', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.renewLive.mockRejectedValueOnce(new Error('database unavailable'));
		await session.start();
		const [first] = insertedSessions();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.deleteSession).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.renewLive).toHaveBeenCalledTimes(2);
		expect(sessions.renewLive).toHaveBeenLastCalledWith(first.id, LEASE_SECONDS, expect.anything());
		expect(sessions.deleteSession).not.toHaveBeenCalled();
	});

	it('deletes the row of an insert that finishes during stop', async () => {
		let finishInsert: () => void = () => {};
		sessions.insertSession.mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishInsert = resolve;
				}),
		);
		const starting = session.start();
		await vi.advanceTimersByTimeAsync(0);

		const stopping = session.stop();
		finishInsert();
		await Promise.all([starting, stopping]);

		const [first] = insertedSessions();
		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());
	});

	it('resolves a second stop only after the first has deleted the row', async () => {
		await session.start();
		let finishDelete: () => void = () => {};
		sessions.deleteSession.mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishDelete = resolve;
				}),
		);
		void session.stop();
		let secondStopped = false;
		void session.stop().then(() => {
			secondStopped = true;
		});

		await vi.advanceTimersByTimeAsync(0);
		expect(secondStopped).toBe(false);
		finishDelete();
		await vi.advanceTimersByTimeAsync(0);

		expect(secondStopped).toBe(true);
	});

	it('resolves stop only after the delete of its session row finishes', async () => {
		await session.start();
		let finishDelete: () => void = () => {};
		sessions.deleteSession.mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishDelete = resolve;
				}),
		);
		let stopped = false;
		const stopping = session.stop().then(() => {
			stopped = true;
		});

		await vi.advanceTimersByTimeAsync(0);
		expect(sessions.deleteSession).toHaveBeenCalled();
		expect(stopped).toBe(false);

		finishDelete();
		await stopping;
		expect(stopped).toBe(true);
	});

	it('arms no timers and inserts no session when started after stop', async () => {
		await session.stop();

		await session.start();

		expect(vi.getTimerCount()).toBe(0);
		expect(sessions.insertSession).not.toHaveBeenCalled();
	});

	it('runs one beat when started twice', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		await session.start();
		await session.start();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
		expect(sessions.renewLive).toHaveBeenCalledTimes(1);
	});

	it('clears its timers and deletes its session row when stopped', async () => {
		await session.start();
		const [first] = insertedSessions();

		await session.stop();

		expect(vi.getTimerCount()).toBe(0);
		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());
	});

	it('logs a failed delete of its session row and resolves when stopped', async () => {
		await session.start();
		sessions.deleteSession.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(session.stop()).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to delete lease session',
			expect.objectContaining({ kind: 'test-kind' }),
		);
	});

	it('starts no second renewal on a beat while a renewal of the same session is in flight', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.renewLive.mockImplementationOnce(async () => await new Promise<boolean>(() => {}));
		await session.start();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000 * 3);

		expect(sessions.renewLive).toHaveBeenCalledTimes(1);
		expect(sessions.deleteSession).not.toHaveBeenCalled();
	});

	it('starts one insert when a beat comes while the insert of start is in flight', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		let finishInsert: () => void = () => {};
		sessions.insertSession.mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishInsert = resolve;
				}),
		);
		const starting = session.start();
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.insertSession).toHaveBeenCalledTimes(1);

		finishInsert();
		await starting;

		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
		const [first] = insertedSessions();
		await expectHeld(first.id);
	});

	it('rejects start, inserts no session and retries on the next beat when the kind insert fails', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		kinds.insertIfMissing.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(session.start()).rejects.toThrow('database unavailable');
		expect(sessions.insertSession).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		expect(kinds.insertIfMissing).toHaveBeenCalledTimes(2);
		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
		const [first] = insertedSessions();
		await expectHeld(first.id);
	});
});
