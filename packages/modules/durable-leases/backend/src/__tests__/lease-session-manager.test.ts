import type { Logger } from '@n8n/backend-common';
import type { LeaseKindRepository, LeaseSessionRepository, NewLeaseSession } from '@n8n/db';
import { OperationalError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SessionClock } from '../lease-session-manager';
import { LeaseSessionManager } from '../lease-session-manager';

describe('LeaseSessionManager', () => {
	const START_WALL_MS = 1_800_000_000_000;
	const LEASE_SECONDS = 20;
	const RENEW_SECONDS = 5;
	const MARGIN_SECONDS = 5;
	const DEADLINE_MS = (LEASE_SECONDS - MARGIN_SECONDS) * 1000;

	let now: { mono: number; wall: number };
	let clock: SessionClock;
	let kinds: ReturnType<typeof mock<LeaseKindRepository>>;
	let sessions: ReturnType<typeof mock<LeaseSessionRepository>>;
	let session: LeaseSessionManager;
	let logger: ReturnType<typeof mock<Logger>>;

	const insertedSessions = () =>
		sessions.insertSession.mock.calls.map(([inserted]: [NewLeaseSession, unknown]) => inserted);

	const setClock = (elapsedMs: number) => {
		now = { mono: elapsedMs, wall: START_WALL_MS + elapsedMs };
	};

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
		const [replacement] = sessions.insertSession.mock.calls.at(-1)!;
		expect(replacement.id).not.toBe(id);
	};

	beforeEach(() => {
		vi.useFakeTimers();
		now = { mono: 0, wall: START_WALL_MS };
		clock = { monotonicMs: () => now.mono, wallMs: () => now.wall };
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
			marginSeconds: MARGIN_SECONDS,
			hostId: 'host-1',
			bootId: 'boot-1',
			kinds,
			sessions,
			clock,
			logger,
		});
	});

	afterEach(async () => {
		const stopping = session.stop().catch(() => {});
		await vi.advanceTimersByTimeAsync(LEASE_SECONDS * 1000);
		await stopping;
		vi.restoreAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('loses the session and deletes its row when the monotonic clock passes the deadline', async () => {
		await session.start();
		const [first] = insertedSessions();

		now.mono += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);

		await expectLost(first.id);
	});

	it('loses the session and deletes its row when the wall clock passes the deadline', async () => {
		await session.start();
		const [first] = insertedSessions();

		now.wall += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);

		await expectLost(first.id);
	});

	it('inserts a session with a new id on the next beat after a loss', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.renewLive.mockResolvedValueOnce(false);
		await session.start();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		const [first] = insertedSessions();
		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		const [, second] = insertedSessions();
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

	it('moves the deadline forward when a renewal succeeds', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		await session.start();
		const [first] = insertedSessions();

		now.mono = 10_000;
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.renewLive).toHaveBeenCalledTimes(1);

		now.mono = DEADLINE_MS + 1_000;
		await vi.advanceTimersByTimeAsync(100);

		await expectHeld(first.id);
	});

	it('measures the deadline of a new session from the clock before the insert was sent', async () => {
		sessions.insertSession.mockImplementationOnce(async () => {
			setClock(4_000);
		});
		await session.start();
		const [first] = insertedSessions();

		setClock(DEADLINE_MS + 1);
		await vi.advanceTimersByTimeAsync(100);

		await expectLost(first.id);
	});

	it('measures a renewed deadline from the clock before the renewal was sent', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.renewLive.mockImplementationOnce(async () => {
			setClock(14_000);
			return true;
		});
		await session.start();
		const [first] = insertedSessions();

		setClock(10_000);
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.renewLive).toHaveBeenCalledTimes(1);
		expect(sessions.deleteSession).not.toHaveBeenCalled();

		setClock(10_000 + DEADLINE_MS + 1);
		await vi.advanceTimersByTimeAsync(100);

		await expectLost(first.id);
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

	it('keeps a newer session when a renewal of a lost session finds it expired', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		let finishRenewal: (renewed: boolean) => void = () => {};
		sessions.renewLive.mockImplementationOnce(
			async () =>
				await new Promise<boolean>((resolve) => {
					finishRenewal = resolve;
				}),
		);
		await session.start();
		const [first] = insertedSessions();
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		now.mono += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);
		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		const [, second] = insertedSessions();

		finishRenewal(false);
		await vi.advanceTimersByTimeAsync(0);

		await expectHeld(second.id);
	});

	it('deletes the old row and keeps the newer session when a renewal of a lost session succeeds', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		let finishRenewal: (renewed: boolean) => void = () => {};
		sessions.renewLive.mockImplementationOnce(
			async () =>
				await new Promise<boolean>((resolve) => {
					finishRenewal = resolve;
				}),
		);
		await session.start();
		const [first] = insertedSessions();
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		now.mono += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		const [, second] = insertedSessions();
		sessions.deleteSession.mockClear();

		finishRenewal(true);
		await vi.advanceTimersByTimeAsync(0);

		expect(sessions.deleteSession).toHaveBeenCalledTimes(1);
		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());
		await expectHeld(second.id);
	});

	it('inserts a new session on the next beat and stops when a renewal never finishes', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.renewLive.mockImplementation(async () => await new Promise<boolean>(() => {}));
		await session.start();
		const [first] = insertedSessions();
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.renewLive).toHaveBeenCalledTimes(1);

		now.mono += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);
		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		const [, second] = insertedSessions();
		expect(second.id).not.toBe(first.id);
		await expectHeld(second.id);
		await expect(session.stop()).resolves.toBeUndefined();
	});

	it('renews a newer session while a renewal of a lost session never finishes', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.renewLive.mockImplementationOnce(async () => await new Promise<boolean>(() => {}));
		await session.start();
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		now.mono += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		const [, second] = insertedSessions();

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		expect(sessions.renewLive).toHaveBeenLastCalledWith(
			second.id,
			LEASE_SECONDS,
			expect.anything(),
		);
		expect(sessions.deleteSession).not.toHaveBeenCalledWith(second.id, expect.anything());
	});

	it('deletes no row when a renewal of a lost session succeeds after stop', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		let finishRenewal: (renewed: boolean) => void = () => {};
		sessions.renewLive.mockImplementationOnce(
			async () =>
				await new Promise<boolean>((resolve) => {
					finishRenewal = resolve;
				}),
		);
		await session.start();
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		now.mono += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		const [, second] = insertedSessions();
		await session.stop();
		expect(sessions.deleteSession).toHaveBeenCalledWith(second.id, expect.anything());
		sessions.deleteSession.mockClear();

		finishRenewal(true);
		await vi.advanceTimersByTimeAsync(0);

		expect(sessions.deleteSession).not.toHaveBeenCalled();
	});

	it('stops after the lease length when an insert never finishes', async () => {
		sessions.insertSession.mockImplementationOnce(async () => await new Promise<void>(() => {}));
		void session.start().catch(() => {});
		await vi.advanceTimersByTimeAsync(0);
		let stopped = false;
		void session.stop().then(() => {
			stopped = true;
		});

		await vi.advanceTimersByTimeAsync(LEASE_SECONDS * 1000 - 1);
		expect(stopped).toBe(false);
		await vi.advanceTimersByTimeAsync(1);

		expect(stopped).toBe(true);
	});

	it('deletes the row of an insert that finishes after stop stopped waiting', async () => {
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
		await vi.advanceTimersByTimeAsync(LEASE_SECONDS * 1000);
		await stopping;

		finishInsert();
		await starting;
		await vi.advanceTimersByTimeAsync(0);

		const [first] = insertedSessions();
		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());
	});

	it('inserts a new session on a later beat when an insert never finishes', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.insertSession.mockImplementationOnce(async () => await new Promise<void>(() => {}));
		void session.start().catch(() => {});
		await vi.advanceTimersByTimeAsync(0);

		now.mono += LEASE_SECONDS * 1000;
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		const [first, second] = insertedSessions();
		expect(second.id).not.toBe(first.id);
		await expectHeld(second.id);
	});

	it('keeps the insert of a beat one millisecond before the lease length passes', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.insertSession.mockImplementationOnce(async () => await new Promise<void>(() => {}));
		void session.start().catch(() => {});
		await vi.advanceTimersByTimeAsync(0);

		now.mono += LEASE_SECONDS * 1000 - 1;
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
		expect(logger.warn).not.toHaveBeenCalledWith(
			'Abandoned a lease session insert that did not finish',
			expect.anything(),
		);
	});

	it('logs no failed start once a newer session holds after beats waited on a hung insert', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.insertSession.mockImplementationOnce(async () => await new Promise<void>(() => {}));
		void session.start().catch(() => {});
		for (let beat = 0; beat < LEASE_SECONDS / RENEW_SECONDS; beat++) {
			now.mono += RENEW_SECONDS * 1000;
			await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		}
		const [, second] = insertedSessions();
		logger.warn.mockClear();

		await vi.advanceTimersByTimeAsync(LEASE_SECONDS * 1000);

		expect(logger.warn).not.toHaveBeenCalledWith(
			'Failed to start lease session',
			expect.anything(),
		);
		await expectHeld(second.id);
	});

	it('logs no failed start and leaves no timers after stop while beats wait on a hung insert', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.insertSession.mockImplementationOnce(async () => await new Promise<void>(() => {}));
		void session.start().catch(() => {});
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000 * 2);

		const stopping = session.stop();
		await vi.advanceTimersByTimeAsync(LEASE_SECONDS * 1000);
		await stopping;

		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(LEASE_SECONDS * 1000);
		expect(logger.warn).not.toHaveBeenCalledWith(
			'Failed to start lease session',
			expect.anything(),
		);
	});

	it('deletes the row of an abandoned insert that finishes later', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		let finishInsert: () => void = () => {};
		sessions.insertSession.mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishInsert = resolve;
				}),
		);
		void session.start().catch(() => {});
		await vi.advanceTimersByTimeAsync(0);
		now.mono += LEASE_SECONDS * 1000;
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		const [first, second] = insertedSessions();

		finishInsert();
		await vi.advanceTimersByTimeAsync(0);

		expect(sessions.deleteSession).toHaveBeenCalledWith(first.id, expect.anything());
		await expectHeld(second.id);
	});

	it('deletes the current row before stop waits for an abandoned insert, then deletes its row', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		let finishInsert: () => void = () => {};
		sessions.insertSession.mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishInsert = resolve;
				}),
		);
		void session.start().catch(() => {});
		await vi.advanceTimersByTimeAsync(0);
		now.mono += LEASE_SECONDS * 1000;
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		const [first, second] = insertedSessions();
		let stopped = false;

		const stopping = session.stop().then(() => {
			stopped = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(stopped).toBe(false);
		expect(sessions.deleteSession).toHaveBeenCalledWith(second.id, expect.anything());
		expect(sessions.deleteSession).not.toHaveBeenCalledWith(first.id, expect.anything());

		finishInsert();
		await stopping;

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

	it('waits for the delete of a lost session row when stopped', async () => {
		let finishDelete: () => void = () => {};
		sessions.deleteSession.mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishDelete = resolve;
				}),
		);
		await session.start();
		now.mono += DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);
		expect(sessions.deleteSession).toHaveBeenCalled();

		let stopped = false;
		const stopping = session.stop().then(() => {
			stopped = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(stopped).toBe(false);

		finishDelete();
		await stopping;
		expect(stopped).toBe(true);
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

	it('moves the wall-clock deadline forward when a renewal succeeds', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		await session.start();
		const [first] = insertedSessions();
		setClock(10_000);
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.renewLive).toHaveBeenCalledTimes(1);

		now.wall = START_WALL_MS + DEADLINE_MS + 1_000;
		await vi.advanceTimersByTimeAsync(100);

		await expectHeld(first.id);
	});

	it('loses the session when the wall clock passes the deadline of a successful renewal', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		await session.start();
		const [first] = insertedSessions();
		setClock(10_000);
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);
		expect(sessions.renewLive).toHaveBeenCalledTimes(1);

		now.wall = START_WALL_MS + 10_000 + DEADLINE_MS + 1;
		await vi.advanceTimersByTimeAsync(100);

		await expectLost(first.id);
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

	it('keeps the session at the deadline and loses it one millisecond past', async () => {
		await session.start();
		const [first] = insertedSessions();

		setClock(DEADLINE_MS);
		await vi.advanceTimersByTimeAsync(100);
		expect(sessions.deleteSession).not.toHaveBeenCalled();

		setClock(DEADLINE_MS + 1);
		await vi.advanceTimersByTimeAsync(100);

		await expectLost(first.id);
	});

	it('rejects start and inserts no session when the kind insert fails', async () => {
		kinds.insertIfMissing.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(session.start()).rejects.toThrow('database unavailable');

		expect(sessions.insertSession).not.toHaveBeenCalled();
	});

	it('logs a failed insert after a loss and inserts again on the next beat', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.renewLive.mockResolvedValueOnce(false);
		await session.start();
		kinds.insertIfMissing.mockRejectedValueOnce(new Error('database unavailable'));

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000 * 2);
		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to start lease session',
			expect.objectContaining({ kind: 'test-kind' }),
		);

		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		const [, second] = insertedSessions();
		expect(sessions.insertSession).toHaveBeenCalledTimes(2);
		await expectHeld(second.id);
	});

	it('rejects start when the insert does not finish within the lease length and inserts again after abandoning it', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.insertSession.mockImplementationOnce(async () => await new Promise<void>(() => {}));
		const starting = expect(session.start()).rejects.toThrow(OperationalError);

		await vi.advanceTimersByTimeAsync(LEASE_SECONDS * 1000);
		await starting;
		expect(sessions.insertSession).toHaveBeenCalledTimes(1);

		now.mono += LEASE_SECONDS * 1000;
		await vi.advanceTimersByTimeAsync(RENEW_SECONDS * 1000);

		const [first, second] = insertedSessions();
		expect(sessions.insertSession).toHaveBeenCalledTimes(2);
		expect(second.id).not.toBe(first.id);
	});
});
