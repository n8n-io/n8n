import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan, MoreThan, Not } from '@n8n/typeorm';

import { AgentTurnRequest } from '../entities/agent-turn-request.entity';
import {
	type AgentTurnRequestKind,
	type AgentTurnRequestPayload,
	DURABLE_TURN_KINDS,
	isPublicTurn,
	PUBLIC_TURN_KINDS,
} from '../queue/agent-turn-request.types';

const durableKinds: AgentTurnRequestKind[] = [...DURABLE_TURN_KINDS];

const publicNonDurableKinds: AgentTurnRequestKind[] = PUBLIC_TURN_KINDS.filter(
	(kind) => !durableKinds.includes(kind),
);

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

	/**
	 * Store a pending request. Only public kinds store `agentId`, because only
	 * they count against the cap of waiting turns of each agent.
	 */
	async createPending(id: string, payload: AgentTurnRequestPayload): Promise<void> {
		const agentId = isPublicTurn(payload) ? payload.agentId : null;
		await this.table.insert({ id, kind: payload.kind, agentId, payload, claimedBy: null });
	}

	/**
	 * Store a pending request, unless a request with this ID exists already.
	 * Returns `false` for an existing request: a retry of the same delivery.
	 */
	async createPendingIfAbsent(id: string, payload: AgentTurnRequestPayload): Promise<boolean> {
		if (await this.table.existsBy({ id })) return false;
		try {
			await this.createPending(id, payload);
			return true;
		} catch (error) {
			// Another process inserted the same ID after the check above.
			if (await this.table.existsBy({ id })) return false;
			throw error;
		}
	}

	/**
	 * Number of public requests of one agent that no process claimed yet.
	 * A request of a durable kind counts when it was created after
	 * `durableSince`, any other public request when it was created after `since`.
	 */
	async countPendingForAgent(
		agentId: string,
		{ since, durableSince }: { since: Date; durableSince: Date },
	): Promise<number> {
		const pending = { agentId, claimedBy: IsNull() };
		return await this.table.count({
			where: [
				{ ...pending, kind: In(publicNonDurableKinds), createdAt: MoreThan(since) },
				{ ...pending, kind: In(durableKinds), createdAt: MoreThan(durableSince) },
			],
		});
	}

	/**
	 * Durable requests that no process claimed and that were created before
	 * `before`, oldest first. Their request job can be lost, so the caller
	 * sends it again.
	 */
	async findUnclaimedDurable(
		before: Date,
		limit: number,
	): Promise<Array<{ id: string; kind: AgentTurnRequestKind }>> {
		return await this.table.find({
			select: { id: true, kind: true },
			where: { kind: In(durableKinds), claimedBy: IsNull(), createdAt: LessThan(before) },
			order: { createdAt: 'ASC' },
			take: limit,
		});
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

	/** The process that ran the turn, or the main that rejected it, removes the row. */
	async remove(id: string): Promise<void> {
		await this.table.delete({ id });
	}

	/**
	 * Remove requests that no process finished, for example after a crash: the
	 * rows created before `cutoff`. An unclaimed durable request still waits
	 * for a worker, so it stays until `durableCutoff`.
	 *
	 * Returns the number of removed rows, and of the unclaimed durable rows
	 * among them.
	 */
	async removeStale({
		cutoff,
		durableCutoff,
	}: {
		cutoff: Date;
		durableCutoff: Date;
	}): Promise<{ removed: number; expiredDurable: number }> {
		const other = await this.table.delete({
			kind: Not(In(durableKinds)),
			createdAt: LessThan(cutoff),
		});
		const claimedDurable = await this.table.delete({
			kind: In(durableKinds),
			claimedBy: Not(IsNull()),
			createdAt: LessThan(cutoff),
		});
		const expired = await this.table.delete({
			kind: In(durableKinds),
			claimedBy: IsNull(),
			createdAt: LessThan(durableCutoff),
		});
		const expiredDurable = expired.affected ?? 0;
		const removed = (other.affected ?? 0) + (claimedDurable.affected ?? 0) + expiredDurable;
		return { removed, expiredDurable };
	}
}
