import { Logger } from '@n8n/backend-common';
import { LeasesConfig } from '@n8n/config';
import type { OperationContext } from '@n8n/db';
import { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { LeaseService } from '@n8n/leases';
import type { LeaseKind, LeaseStatus } from '@n8n/leases';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { DatabaseLeaseProvider } from './database-lease-provider';
import { systemClock } from './lease-session-manager';
import { assertLeaseTimings } from './lease-timings';

export type LeaseTransaction = OperationContext;

/** The database-backed {@link LeaseService}. */
@Service()
export class DurableLeaseService {
	private readonly provider: DatabaseLeaseProvider;

	private readonly leaseService: LeaseService<LeaseTransaction>;

	constructor(
		logger: Logger,
		instanceSettings: InstanceSettings,
		config: LeasesConfig,
		kinds: LeaseKindRepository,
		sessions: LeaseSessionRepository,
	) {
		assertLeaseTimings(config);
		this.provider = new DatabaseLeaseProvider({
			config,
			kinds,
			sessions,
			hostId: instanceSettings.hostId,
			bootId: randomUUID(),
			clock: systemClock,
			logger: logger.scoped('durable-leases'),
		});
		this.leaseService = new LeaseService(this.provider);
	}

	async registerKind(kind: LeaseKind<LeaseTransaction>): Promise<void> {
		await this.leaseService.registerKind(kind);
	}

	async changed(kind: string, keys?: readonly string[]): Promise<void> {
		await this.leaseService.changed(kind, keys);
	}

	async syncAll(): Promise<void> {
		await this.leaseService.syncAll();
	}

	async status(kind: string, keys: readonly string[]): Promise<LeaseStatus[]> {
		return await this.leaseService.status(kind, keys);
	}

	async stop(): Promise<void> {
		await this.provider.stop();
	}
}
