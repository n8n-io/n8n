import { BaseRepository, TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentPublishHistory } from '../entities/agent-publish-history.entity';
import { renderAuthor } from './agent-history.repository';

class AgentPublishHistoryTable extends BaseRepository<AgentPublishHistory> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentPublishHistory, dataSource.manager, transactionRunner);
	}
}

@Service()
export class AgentPublishHistoryRepository {
	private readonly table: AgentPublishHistoryTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentPublishHistoryTable(dataSource, transactionRunner);
	}

	async record(
		agentId: string,
		versionId: string | null,
		event: AgentPublishHistory['event'],
		user: User,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).insert(AgentPublishHistory, {
			agentId,
			versionId,
			event,
			userId: user.id,
			author: renderAuthor(user),
		});
	}

	async hasPublication(
		agentId: string,
		versionId: string | undefined,
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(AgentPublishHistory, {
			agentId,
			event: 'activated',
			...(versionId ? { versionId } : {}),
		});
	}

	async findLatestForVersions(
		agentId: string,
		versionIds: string[],
		ctx: OperationContext,
	): Promise<Map<string, AgentPublishHistory>> {
		if (versionIds.length === 0) return new Map();
		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(AgentPublishHistory, 'publication')
			.where((qb) => {
				const latest = qb
					.subQuery()
					.select('MAX(event.id)')
					.from(AgentPublishHistory, 'event')
					.where('event.agentId = :agentId', { agentId })
					.andWhere('event.versionId IN (:...versionIds)', { versionIds })
					.andWhere("event.event = 'activated'")
					.groupBy('event.versionId')
					.getQuery();
				return `publication.id IN ${latest}`;
			})
			.getMany();
		return new Map(rows.flatMap((row) => (row.versionId ? [[row.versionId, row]] : [])));
	}

	async list(
		agentId: string,
		take: number,
		skip: number,
		ctx: OperationContext,
	): Promise<AgentPublishHistory[]> {
		return await this.table
			.managerFor(ctx)
			.createQueryBuilder(AgentPublishHistory, 'publication')
			.leftJoin('publication.version', 'version')
			.addSelect(['version.versionId', 'version.name', 'version.description'])
			.where('publication.agentId = :agentId', { agentId })
			.orderBy('publication.id', 'DESC')
			.take(take)
			.skip(skip)
			.getMany();
	}
}
