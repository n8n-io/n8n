import { mockInstance } from '@n8n/backend-test-utils';
import { LeasesConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UnexpectedError, UserError } from '@n8n/errors';
import type { LeaseKind } from '@n8n/leases';
import { UnknownLeaseKindError } from '@n8n/leases';

import type { LeaseTransaction } from '../durable-lease.service';
import { DurableLeaseService } from '../durable-lease.service';

describe('DurableLeaseService', () => {
	const validTimings = { leaseSeconds: 20, renewSeconds: 5, marginSeconds: 5 };

	const build = (timings: Partial<typeof validTimings> = {}) => {
		mockInstance(LeasesConfig, { ...validTimings, ...timings });
		return Container.get(DurableLeaseService);
	};

	beforeEach(() => {
		Container.reset();
	});

	it('rejects a kind until the provider can start sessions', async () => {
		const service = build();
		const kind: LeaseKind<LeaseTransaction> = {
			name: 'test-kind',
			handler: { hold: vi.fn() },
			source: { listDesired: vi.fn(), pageDesired: vi.fn() },
		};

		await expect(service.registerKind(kind)).rejects.toThrow(UnexpectedError);
		await expect(service.status('test-kind', ['a'])).rejects.toThrow(UnknownLeaseKindError);
	});

	it('rejects a change to a kind that never registered', async () => {
		const service = build();

		await expect(service.changed('test-kind')).rejects.toThrow(UnknownLeaseKindError);
		await expect(service.changed('test-kind', ['a'])).rejects.toThrow(UnknownLeaseKindError);
	});

	it('syncs no kind when every registration was rejected', async () => {
		const service = build();
		const kind: LeaseKind<LeaseTransaction> = {
			name: 'test-kind',
			handler: { hold: vi.fn() },
			source: { listDesired: vi.fn(), pageDesired: vi.fn() },
		};
		await expect(service.registerKind(kind)).rejects.toThrow(UnexpectedError);

		await expect(service.syncAll()).resolves.toBeUndefined();
	});

	it.each([
		{
			rule: 'lease shorter than 8 seconds',
			timings: { leaseSeconds: 7, renewSeconds: 1, marginSeconds: 1 },
		},
		{ rule: 'renewal longer than a third of lease minus margin', timings: { renewSeconds: 6 } },
	])('refuses to build with a $rule', ({ timings }) => {
		expect(() => build(timings)).toThrow(UserError);
	});

	it('states the largest allowed renewal in whole seconds', () => {
		expect(() => build({ leaseSeconds: 12, renewSeconds: 3, marginSeconds: 5 })).toThrow(
			'renewal must be at most the lease minus the margin, divided by three (2 seconds), got 3',
		);
	});
});
