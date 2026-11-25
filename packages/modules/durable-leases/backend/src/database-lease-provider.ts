import { UnexpectedError } from '@n8n/errors';
import type { Lease, LeaseKindOptions, LeaseProvider, LeaseSource, LeaseStatus } from '@n8n/leases';

import type { LeaseTransaction } from './durable-lease.service';

type Holder = (lease: Lease<LeaseTransaction>) => Promise<void>;

export class DatabaseLeaseProvider implements LeaseProvider<LeaseTransaction> {
	async registerHolder(kind: string, _options: LeaseKindOptions, _hold: Holder): Promise<void> {
		throw new UnexpectedError(`Lease kinds cannot register yet: "${kind}"`);
	}

	registerSource(_kind: string, _source: LeaseSource): void {}

	async sync(kind: string, _scope?: readonly string[]): Promise<void> {
		throw new UnexpectedError(`Lease sync is not available for kind "${kind}"`);
	}

	async status(kind: string, _keys: readonly string[]): Promise<LeaseStatus[]> {
		throw new UnexpectedError(`Lease status is not available for kind "${kind}"`);
	}

	async stop(): Promise<void> {}
}
