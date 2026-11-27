import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { LeasesConfig } from '@n8n/config';
import type { NewLeaseSession } from '@n8n/db';
import { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type { LeaseKind } from '@n8n/leases';
import { UnknownLeaseKindError } from '@n8n/leases';
import { InstanceSettings } from 'n8n-core';

import type { LeaseTransaction } from '../durable-lease.service';
import { DurableLeaseService } from '../durable-lease.service';

describe('DurableLeaseService', () => {
	const validTimings = { leaseSeconds: 20, renewSeconds: 5, marginSeconds: 5 };
	const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

	const kindNamed = (name: string): LeaseKind<LeaseTransaction> => ({
		name,
		handler: { hold: vi.fn() },
		source: { listDesired: vi.fn(), pageDesired: vi.fn() },
	});

	let sessions: ReturnType<typeof mockInstance<LeaseSessionRepository>>;

	const build = (timings: Partial<typeof validTimings> = {}) => {
		mockInstance(LeasesConfig, { ...validTimings, ...timings });
		return Container.get(DurableLeaseService);
	};

	const insertedSessions = () =>
		sessions.insertSession.mock.calls.map(([inserted]: [NewLeaseSession, unknown]) => inserted);

	beforeEach(() => {
		vi.useFakeTimers();
		Container.reset();
		mockInstance(Logger);
		mockInstance(InstanceSettings, { hostId: 'host-1' });
		const kinds = mockInstance(LeaseKindRepository);
		kinds.insertIfMissing.mockResolvedValue();
		sessions = mockInstance(LeaseSessionRepository);
		sessions.insertSession.mockResolvedValue();
		sessions.renewLive.mockResolvedValue(true);
		sessions.deleteSession.mockResolvedValue();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('inserts each session with the instance host and one boot id for the process', async () => {
		const service = build();

		await service.registerKind(kindNamed('kind-a'));
		await service.registerKind(kindNamed('kind-b'));
		await service.stop();

		const [first, second] = insertedSessions();
		expect(first.hostId).toBe('host-1');
		expect(second.hostId).toBe('host-1');
		expect(first.bootId).toMatch(UUID_PATTERN);
		expect(second.bootId).toBe(first.bootId);
	});

	it('deletes the session row of each kind on stop', async () => {
		const service = build();
		await service.registerKind(kindNamed('kind-a'));
		await service.registerKind(kindNamed('kind-b'));
		const insertedIds = insertedSessions().map((inserted) => inserted.id);

		await service.stop();

		expect(insertedIds).toHaveLength(2);
		for (const id of insertedIds) {
			expect(sessions.deleteSession).toHaveBeenCalledWith(id, expect.anything());
		}
	});

	it('rejects a change to a kind that never registered', async () => {
		const service = build();

		await expect(service.changed('test-kind')).rejects.toThrow(UnknownLeaseKindError);
		await expect(service.changed('test-kind', ['a'])).rejects.toThrow(UnknownLeaseKindError);
	});

	it('fails to sync a registered kind until the provider can sync', async () => {
		const service = build();
		await service.registerKind(kindNamed('kind-a'));

		await expect(service.syncAll()).rejects.toThrow('Failed to sync lease kinds: kind-a');
		await service.stop();
	});

	it('refuses to build with a renewal longer than a third of lease minus margin', () => {
		expect(() => build({ renewSeconds: 6 })).toThrow(UserError);
	});

	it('states the largest allowed renewal in whole seconds and the settings it comes from', () => {
		expect(() => build({ leaseSeconds: 12, renewSeconds: 3, marginSeconds: 5 })).toThrow(
			'N8N_LEASES_RENEW_SECONDS must be at most 2 seconds, which is N8N_LEASES_LEASE_SECONDS (12) minus N8N_LEASES_MARGIN_SECONDS (5), divided by three, got 3',
		);
	});

	it('names the margin when it leaves no time to renew', () => {
		expect(() => build({ leaseSeconds: 8, renewSeconds: 1, marginSeconds: 10 })).toThrow(
			'N8N_LEASES_MARGIN_SECONDS must be at most 5 seconds, so that N8N_LEASES_LEASE_SECONDS (8) leaves time to renew, got 10',
		);
	});
});
