import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

export type ExecutionLedgerBacklogStats = {
	/** Upper bound from the id range: rolled-back appends leave gaps that count too. */
	rows: number;
	oldestOccurredAt: Date | null;
};

/** Lets metrics read the ledger backlog without importing the opt-in `execution-ledger` module. */
@Service()
export class ExecutionLedgerBacklogProbe {
	private provider?: () => Promise<ExecutionLedgerBacklogStats>;

	/** Single-shot: a second provider would be silently ignored. */
	register(provider: () => Promise<ExecutionLedgerBacklogStats>) {
		if (this.provider) {
			throw new UnexpectedError('An execution ledger backlog provider is already registered');
		}

		this.provider = provider;
	}

	get isRegistered() {
		return this.provider !== undefined;
	}

	async getStats(): Promise<ExecutionLedgerBacklogStats> {
		if (!this.provider) {
			throw new UnexpectedError('No execution ledger backlog provider is registered');
		}

		return await this.provider();
	}
}
