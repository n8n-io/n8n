import type { Logger } from '@n8n/backend-common';
import type { LeasesConfig } from '@n8n/config';
import type { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { UnexpectedError } from '@n8n/errors';
import { InvalidLeaseKindOptionsError } from '@n8n/leases';
import type { Lease, LeaseKindOptions, LeaseProvider, LeaseSource, LeaseStatus } from '@n8n/leases';

import type { LeaseTransaction } from './durable-lease.service';
import { LeaseSessionManager } from './lease-session-manager';
import { assertLeaseTimings } from './lease-timings';

export interface DatabaseLeaseProviderDeps {
	config: LeasesConfig;
	kinds: LeaseKindRepository;
	sessions: LeaseSessionRepository;
	hostId: string;
	bootId: string;
	logger: Logger;
}

type Holder = (lease: Lease<LeaseTransaction>) => Promise<void>;

export class DatabaseLeaseProvider implements LeaseProvider<LeaseTransaction> {
	private readonly sources = new Map<string, LeaseSource>();

	private readonly managers = new Map<string, LeaseSessionManager>();

	private readonly stoppingManagers = new Set<Promise<void>>();

	private stopped = false;

	constructor(private readonly deps: DatabaseLeaseProviderDeps) {}

	async registerHolder(kind: string, options: LeaseKindOptions, _hold: Holder): Promise<void> {
		if (this.stopped) {
			this.deps.logger.debug('Skipped lease kind registration: the lease provider has stopped', {
				kind,
			});
			return;
		}
		const { config } = this.deps;
		const leaseSeconds = options.leaseSeconds ?? config.leaseSeconds;
		try {
			assertLeaseTimings(
				{ leaseSeconds, renewSeconds: config.renewSeconds, marginSeconds: config.marginSeconds },
				`Lease kind "${kind}"`,
			);
		} catch (error) {
			throw new InvalidLeaseKindOptionsError(kind, 'leaseSeconds', leaseSeconds, { cause: error });
		}

		const manager = new LeaseSessionManager({
			kind,
			leaseSeconds,
			hostId: this.deps.hostId,
			bootId: this.deps.bootId,
			kinds: this.deps.kinds,
			sessions: this.deps.sessions,
			logger: this.deps.logger,
		});
		this.managers.set(kind, manager);
		try {
			await manager.start();
		} catch (error) {
			// The kind stays unregistered, so it must hold no session; a retry starts a new manager.
			this.managers.delete(kind);
			const stopping = manager.stop().finally(() => this.stoppingManagers.delete(stopping));
			this.stoppingManagers.add(stopping);
			throw error;
		}
	}

	registerSource(kind: string, source: LeaseSource): void {
		this.sources.set(kind, source);
	}

	async sync(kind: string, _scope?: readonly string[]): Promise<void> {
		throw new UnexpectedError(`Lease sync is not available for kind "${kind}"`);
	}

	async status(kind: string, _keys: readonly string[]): Promise<LeaseStatus[]> {
		throw new UnexpectedError(`Lease status is not available for kind "${kind}"`);
	}

	async stop(): Promise<void> {
		this.stopped = true;
		await Promise.allSettled([
			...[...this.managers.values()].map(async (manager) => await manager.stop()),
			...this.stoppingManagers,
		]);
	}
}
