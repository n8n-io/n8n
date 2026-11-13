import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan } from '@n8n/typeorm';

import { AgentTurnRequest } from '../entities/agent-turn-request.entity';
import type { AgentTurnRequestPayload } from '../queue/agent-turn-request.types';

class AgentTurnRequestTable extends BaseRepository<AgentTurnRequest> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentTurnRequest, dataSource.manager, transactionRunner);
	}
}

@Service()
export class AgentTurnRequestRepository {
	private readonly table: AgentTurnRequestTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentTurnRequestTable(dataSource, transactionRunner);
	}

	async createPending(id: string, payload: AgentTurnRequestPayload): Promise<void> {
		await this.table.insert({ id, kind: payload.kind, payload, claimedBy: null });
	}

	/**
	 * Claim a pending request for one process. Returns the input of the turn,
	 * or `null` when another process claimed it first or it is gone.
	 */
	async claim(id: string, instanceKey: string): Promise<AgentTurnRequestPayload | null> {
		const result = await this.table.update({ id, claimedBy: IsNull() }, { claimedBy: instanceKey });
		if (!result.affected) return null;
		const row = await this.table.findOneBy({ id });
		return row?.payload ?? null;
	}

	async isPending(id: string): Promise<boolean> {
		return await this.table.existsBy({ id, claimedBy: IsNull() });
	}

	async remove(id: string): Promise<void> {
		await this.table.delete({ id });
	}

	/** Remove requests that no process finished, for example after a crash. */
	async removeOlderThan(cutoff: Date): Promise<number> {
		const result = await this.table.delete({ createdAt: LessThan(cutoff) });
		return result.affected ?? 0;
	}
}
