import type { AgentAttentionFlag, AgentAttentionFlagType } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { AgentAttentionFlagEntity } from '../entities/agent-attention-flag.entity';

class AgentAttentionFlagTable extends BaseRepository<AgentAttentionFlagEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentAttentionFlagEntity, dataSource.manager, transactionRunner);
	}
}

export interface AgentAttentionFlagScope {
	projectId: string;
	agentId: string;
	userId: string;
}

@Service()
export class AgentAttentionFlagRepository {
	private readonly table: AgentAttentionFlagTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentAttentionFlagTable(dataSource, transactionRunner);
	}

	async flagSession(sessionId: string, type: AgentAttentionFlagType, ctx: OperationContext) {
		// Each committed error gets a new ID, including errors on an already-flagged session.
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(AgentAttentionFlagEntity)
			.values({ id: uuidv7(), sessionId, type, createdAt: new Date() })
			.orUpdate(['id', 'createdAt'], ['sessionId', 'type'])
			.execute();
	}

	private accessibleFlags(scope: AgentAttentionFlagScope, ctx: OperationContext) {
		return this.table
			.managerFor(ctx)
			.createQueryBuilder(AgentAttentionFlagEntity, 'flag')
			.innerJoin('flag.session', 'session')
			.where('session.projectId = :projectId', { projectId: scope.projectId })
			.andWhere('session.agentId = :agentId', { agentId: scope.agentId })
			.andWhere(
				"(session.accessScope = 'project' OR (session.accessScope = 'user' AND session.ownerId = :userId))",
				{ userId: scope.userId },
			);
	}

	async list(
		scope: AgentAttentionFlagScope,
		type?: AgentAttentionFlagType,
	): Promise<AgentAttentionFlag[]> {
		const query = this.accessibleFlags(scope, {});
		if (type) query.andWhere('flag.type = :type', { type });
		const flags = await query
			.orderBy('flag.createdAt', 'ASC')
			.addOrderBy('flag.id', 'ASC')
			.getMany();
		return flags.map(({ id, type: flagType, sessionId, createdAt }) => ({
			id,
			type: flagType,
			sessionId,
			createdAt: createdAt.toISOString(),
		}));
	}

	async dismiss(
		scope: AgentAttentionFlagScope,
		type: AgentAttentionFlagType,
		flagIds: string[],
	): Promise<void> {
		if (flagIds.length === 0) return;
		const visible = this.accessibleFlags(scope, {})
			.select('flag.id')
			.andWhere('flag.type = :type', { type })
			.andWhere('flag.id IN (:...flagIds)', { flagIds });
		// One statement keeps visibility checks and deletion in the same database snapshot.
		await this.table
			.managerFor({})
			.createQueryBuilder()
			.delete()
			.from(AgentAttentionFlagEntity)
			.where(`id IN (${visible.getQuery()})`)
			.setParameters(visible.getParameters())
			.execute();
	}
}
