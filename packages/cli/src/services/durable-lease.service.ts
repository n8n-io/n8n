import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { LeaseService } from '@n8n/leases';
import type { LeaseKind, LeaseProvider, LeaseStatus } from '@n8n/leases';

export type LeaseTransaction = OperationContext;

@Service()
export class DurableLeaseService {
	private leaseService?: LeaseService<LeaseTransaction>;

	constructor(private readonly logger: Logger) {}

	registerProvider(provider: LeaseProvider<LeaseTransaction>): void {
		this.leaseService = new LeaseService(provider);
	}

	async registerKind(kind: LeaseKind<LeaseTransaction>): Promise<void> {
		if (!this.leaseService) {
			this.logger.debug('Skipped lease kind registration: no lease provider', { kind: kind.name });
			return;
		}
		await this.leaseService.registerKind(kind);
	}

	async changed(kind: string, keys?: readonly string[]): Promise<void> {
		if (!this.leaseService) {
			this.logger.debug('Skipped lease change: no lease provider', { kind });
			return;
		}
		await this.leaseService.changed(kind, keys);
	}

	async syncAll(): Promise<void> {
		if (!this.leaseService) {
			this.logger.debug('Skipped lease sync: no lease provider');
			return;
		}
		await this.leaseService.syncAll();
	}

	async status(kind: string, keys: readonly string[]): Promise<LeaseStatus[]> {
		if (!this.leaseService) {
			throw new UnexpectedError('Lease status requested without a lease provider');
		}
		return await this.leaseService.status(kind, keys);
	}
}
