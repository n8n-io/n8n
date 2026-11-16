import { Service } from '@n8n/di';

import {
	type ExecutionLedgerBacklogStats,
	ExecutionLedgerRepository,
} from './database/repositories/execution-ledger.repository';

/** Read-only view of the ledger for monitoring. The repository itself can delete rows. */
@Service()
export class ExecutionLedgerBacklog {
	constructor(private readonly repository: ExecutionLedgerRepository) {}

	async getStats(): Promise<ExecutionLedgerBacklogStats> {
		return await this.repository.getBacklogStats();
	}
}
