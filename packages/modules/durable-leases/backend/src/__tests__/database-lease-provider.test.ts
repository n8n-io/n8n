import type { Logger } from '@n8n/backend-common';
import type { LeasesConfig } from '@n8n/config';
import type { LeaseKindRepository, LeaseSessionRepository, NewLeaseSession } from '@n8n/db';
import { UnexpectedError } from '@n8n/errors';
import { InvalidLeaseKindOptionsError } from '@n8n/leases';
import type { LeaseKindOptions } from '@n8n/leases';
import { mock } from 'vitest-mock-extended';

import { DatabaseLeaseProvider } from '../database-lease-provider';

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
		kinds = mock<LeaseKindRepository>();
		kinds.insertIfMissing.mockResolvedValue();
		sessions = mock<LeaseSessionRepository>();
		sessions.insertSession.mockResolvedValue();
		sessions.deleteSession.mockResolvedValue();
		provider = new DatabaseLeaseProvider({
			config,
			kinds,
			sessions,
			hostId: 'host-1',
			bootId: 'boot-1',
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
					'Lease kind "test-kind": renewal must be at most the lease minus the margin, divided by three',
				),
			}),
		});
	});

	it('rejects the registration and keeps no session when the first session insert fails', async () => {
		sessions.insertSession.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(provider.registerHolder('test-kind', options, hold)).rejects.toThrow(
			'database unavailable',
		);

		expect(sessions.insertSession).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('starts a session with the retried lease length when a failed registration is retried', async () => {
		sessions.insertSession.mockRejectedValueOnce(new Error('database unavailable'));
		await expect(provider.registerHolder('test-kind', options, hold)).rejects.toThrow(
			'database unavailable',
		);

		await expect(
			provider.registerHolder('test-kind', { ...options, leaseSeconds: 30 }, hold),
		).resolves.toBeUndefined();

		const [, inserted] = insertedSessions();
		expect(sessions.insertSession).toHaveBeenCalledTimes(2);
		expect(inserted.leaseDurationSeconds).toBe(30);
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
