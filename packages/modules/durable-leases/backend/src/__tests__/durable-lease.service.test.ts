import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { LeasesConfig } from '@n8n/config';
import type { NewLeaseSession } from '@n8n/db';
import { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type { LeaseKind } from '@n8n/leases';
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

	it.each([
		{
			rule: 'lease shorter than 8 seconds',
			timings: { leaseSeconds: 7, renewSeconds: 1, marginSeconds: 1 },
		},
		{ rule: 'margin shorter than 1 second', timings: { marginSeconds: 0 } },
		{ rule: 'renewal shorter than 1 second', timings: { renewSeconds: 0 } },
		{ rule: 'renewal longer than a third of lease minus margin', timings: { renewSeconds: 6 } },
		{ rule: 'non-integer lease', timings: { leaseSeconds: 20.5 } },
		{ rule: 'non-integer renewal', timings: { renewSeconds: 4.5 } },
		{ rule: 'non-integer margin', timings: { marginSeconds: 5.5, renewSeconds: 4 } },
		{ rule: 'lease longer than 2147483 seconds', timings: { leaseSeconds: 2_147_484 } },
	])('refuses to build with a $rule', ({ timings }) => {
		expect(() => build(timings)).toThrow(UserError);
	});

	it('states the largest allowed renewal in whole seconds', () => {
		expect(() => build({ leaseSeconds: 12, renewSeconds: 3, marginSeconds: 5 })).toThrow(
			'renewal must be at most the lease minus the margin, divided by three (2 seconds), got 3',
		);
	});
});
