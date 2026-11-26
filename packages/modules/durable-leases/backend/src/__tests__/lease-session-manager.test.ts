import type { Logger } from '@n8n/backend-common';
import type { LeaseKindRepository, LeaseSessionRepository, NewLeaseSession } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { LeaseSessionManager } from '../lease-session-manager';

describe('LeaseSessionManager', () => {
	const LEASE_SECONDS = 20;

	let kinds: ReturnType<typeof mock<LeaseKindRepository>>;
	let sessions: ReturnType<typeof mock<LeaseSessionRepository>>;
	let session: LeaseSessionManager;
	let logger: ReturnType<typeof mock<Logger>>;

	const insertedSessions = () =>
		sessions.insertSession.mock.calls.map(([inserted]: [NewLeaseSession, unknown]) => inserted);

	beforeEach(() => {
		vi.useFakeTimers();
		kinds = mock<LeaseKindRepository>();
		kinds.insertIfMissing.mockResolvedValue();
		sessions = mock<LeaseSessionRepository>();
		sessions.insertSession.mockResolvedValue();
		sessions.deleteSession.mockResolvedValue();
		logger = mock<Logger>();
		session = new LeaseSessionManager({
			kind: 'test-kind',
			leaseSeconds: LEASE_SECONDS,
			hostId: 'host-1',
			bootId: 'boot-1',
			kinds,
			sessions,
			logger,
		});
	});

	afterEach(async () => {
		await session.stop();
		vi.useRealTimers();
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

	it('inserts no session when started after stop', async () => {
		await session.stop();

		await session.start();

		expect(sessions.insertSession).not.toHaveBeenCalled();
	});

	it('inserts one session when started twice', async () => {
		await session.start();
		await session.start();

		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
	});

	it('deletes its session row when stopped', async () => {
		await session.start();
		const [first] = insertedSessions();

		await session.stop();

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

	it('rejects start and inserts no session when the kind insert fails', async () => {
		kinds.insertIfMissing.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(session.start()).rejects.toThrow('database unavailable');

		expect(sessions.insertSession).not.toHaveBeenCalled();
	});
});
