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
