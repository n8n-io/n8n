import type { Logger } from '@n8n/backend-common';
import type { LeasesConfig } from '@n8n/config';
import type { LeaseKindRepository, LeaseSessionRepository, NewLeaseSession } from '@n8n/db';
import { UnexpectedError } from '@n8n/errors';
import { InvalidLeaseKindOptionsError } from '@n8n/leases';
import type { LeaseKindOptions } from '@n8n/leases';
import { mock } from 'vitest-mock-extended';

import { DatabaseLeaseProvider } from '../database-lease-provider';
import type { SessionClock } from '../lease-session-manager';

describe('DatabaseLeaseProvider', () => {
	const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	const config = mock<LeasesConfig>({ leaseSeconds: 20, renewSeconds: 5, marginSeconds: 5 });
	const options: LeaseKindOptions = { startTimeoutSeconds: 60, maxFailedStarts: 5 };
	const hold = async () => {};

	let kinds: ReturnType<typeof mock<LeaseKindRepository>>;
	let sessions: ReturnType<typeof mock<LeaseSessionRepository>>;
	let provider: DatabaseLeaseProvider;

	const insertedSessions = () =>
		sessions.insertSession.mock.calls.map(([inserted]: [NewLeaseSession, unknown]) => inserted);

	beforeEach(() => {
		vi.useFakeTimers();
		const clock: SessionClock = { monotonicMs: () => 0, wallMs: () => 1_800_000_000_000 };
		kinds = mock<LeaseKindRepository>();
		kinds.insertIfMissing.mockResolvedValue();
		sessions = mock<LeaseSessionRepository>();
		sessions.insertSession.mockResolvedValue();
		sessions.renewLive.mockResolvedValue(true);
		sessions.deleteSession.mockResolvedValue();
		provider = new DatabaseLeaseProvider({
			config,
			kinds,
			sessions,
			hostId: 'host-1',
			bootId: 'boot-1',
			clock,
			logger: mock<Logger>(),
		});
	});

	afterEach(async () => {
		await provider.stop().catch(() => {});
		vi.restoreAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it.each([7, 19, 2_147_484])(
		'rejects a kind whose lease length of %s seconds breaks a timing rule, and starts no session',
		async (leaseSeconds) => {
			await expect(
				provider.registerHolder('test-kind', { ...options, leaseSeconds }, hold),
			).rejects.toThrow(InvalidLeaseKindOptionsError);
			await vi.advanceTimersByTimeAsync(10_000);

			expect(sessions.insertSession).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
		},
	);

	it('gives the timing rule a rejected lease length breaks as the cause', async () => {
		await expect(
			provider.registerHolder('test-kind', { ...options, leaseSeconds: 19 }, hold),
		).rejects.toMatchObject({
			cause: expect.objectContaining({
				message: expect.stringContaining(
					'N8N_LEASES_RENEW_SECONDS must be at most 4 seconds, which is the leaseSeconds option of lease kind "test-kind" (19) minus N8N_LEASES_MARGIN_SECONDS (5), divided by three, got 5',
				),
			}),
		});
	});

	it('rejects the registration and keeps no session when the first session insert fails', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(1);
		sessions.insertSession.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(provider.registerHolder('test-kind', options, hold)).rejects.toThrow(
			'database unavailable',
		);
		await vi.advanceTimersByTimeAsync(3 * 5 * 1000 * 1.1);

		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('starts a session with the retried lease length when a failed registration is retried', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		sessions.insertSession.mockRejectedValueOnce(new Error('database unavailable'));
		await expect(provider.registerHolder('test-kind', options, hold)).rejects.toThrow(
			'database unavailable',
		);

		await expect(
			provider.registerHolder('test-kind', { ...options, leaseSeconds: 30 }, hold),
		).resolves.toBeUndefined();
		await vi.advanceTimersByTimeAsync(2 * 5 * 1000);

		const [, inserted] = insertedSessions();
		expect(sessions.insertSession).toHaveBeenCalledTimes(2);
		expect(inserted.leaseDurationSeconds).toBe(30);
		expect(sessions.renewLive).toHaveBeenCalledTimes(2);
		for (const [id, leaseSeconds] of sessions.renewLive.mock.calls) {
			expect(id).toBe(inserted.id);
			expect(leaseSeconds).toBe(30);
		}
	});

	it('waits on stop for the delete of a session that a failed registration left', async () => {
		let finishInsert!: () => void;
		sessions.insertSession.mockImplementationOnce(
			async () => await new Promise<void>((resolve) => (finishInsert = resolve)),
		);
		const registering = expect(provider.registerHolder('test-kind', options, hold)).rejects.toThrow(
			'did not finish within the lease length',
		);
		await vi.advanceTimersByTimeAsync(20 * 1000);
		await registering;

		let finishDelete!: () => void;
		sessions.deleteSession.mockImplementationOnce(
			async () => await new Promise<void>((resolve) => (finishDelete = resolve)),
		);
		let stopped = false;
		const stopping = provider.stop().then(() => {
			stopped = true;
		});
		finishInsert();
		await vi.advanceTimersByTimeAsync(0);

		const [inserted] = insertedSessions();
		expect(sessions.deleteSession).toHaveBeenCalledWith(inserted.id, {});
		expect(stopped).toBe(false);

		finishDelete();
		await stopping;
		expect(stopped).toBe(true);
	});

	it('starts no session for a kind that registers after stop', async () => {
		await provider.stop();

		await expect(provider.registerHolder('test-kind', options, hold)).resolves.toBeUndefined();
		await vi.advanceTimersByTimeAsync(10_000);

		expect(sessions.insertSession).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('rejects sync with an unexpected error', async () => {
		await expect(provider.sync('test-kind')).rejects.toThrow(UnexpectedError);
	});

	it('rejects status with an unexpected error', async () => {
		await expect(provider.status('test-kind', ['a'])).rejects.toThrow(UnexpectedError);
	});

	it('inserts each session with a new id, the kind, the host, the boot and the lease length', async () => {
		await provider.registerHolder('kind-a', { ...options, leaseSeconds: 30 }, hold);
		await provider.registerHolder('kind-b', options, hold);

		const [first, second] = insertedSessions();
		expect(first).toEqual({
			id: expect.stringMatching(UUID_PATTERN),
			leaseKind: 'kind-a',
			hostId: 'host-1',
			bootId: 'boot-1',
			leaseDurationSeconds: 30,
		});
		expect(second).toEqual({
			id: expect.stringMatching(UUID_PATTERN),
			leaseKind: 'kind-b',
			hostId: 'host-1',
			bootId: 'boot-1',
			leaseDurationSeconds: 20,
		});
		expect(second.id).not.toBe(first.id);
	});
});
