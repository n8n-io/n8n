import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentFile } from '../entities/agent-file.entity';

class AgentFileTable extends BaseRepository<AgentFile> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentFile, dataSource.manager, transactionRunner);
	}
}

export interface AgentKnowledgeTotals {
	fileCount: number;
	/** Sum of the original upload sizes, not of the stored text. */
	totalBytes: number;
}

@Service()
export class AgentFileRepository {
	private readonly table: AgentFileTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentFileTable(dataSource, transactionRunner);
	}

	async findByAgentId(agentId: string, ctx: OperationContext): Promise<AgentFile[]> {
		return await this.table.managerFor(ctx).find(AgentFile, {
			where: { agentId },
			// Secondary id sort keeps pagination stable when batch uploads
			// share the same createdAt timestamp.
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async hasFilesForAgent(agentId: string, ctx: OperationContext): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(AgentFile, { agentId });
	}

	async findByIdAndAgentId(
		fileId: string,
		agentId: string,
		ctx: OperationContext,
	): Promise<AgentFile | null> {
		return await this.table.managerFor(ctx).findOneBy(AgentFile, { id: fileId, agentId });
	}

	async saveUploadedFile(
		file: Pick<
			AgentFile,
			'id' | 'agentId' | 'storedAt' | 'storageKey' | 'fileName' | 'mimeType' | 'fileSizeBytes'
		>,
		ctx: OperationContext,
	): Promise<AgentFile> {
		const manager = this.table.managerFor(ctx);
		const agentFile = manager.create(AgentFile, file);
		return await manager.save(AgentFile, agentFile);
	}

	async deleteByIdAndAgentId(
		fileId: string,
		agentId: string,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).delete(AgentFile, { id: fileId, agentId });
	}

	async deleteByAgentId(agentId: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(AgentFile, { agentId });
	}

	async getKnowledgeTotals(agentId: string, ctx: OperationContext): Promise<AgentKnowledgeTotals> {
		const totalsByAgentId = await this.getKnowledgeTotalsByAgentIds([agentId], ctx);
		return totalsByAgentId.get(agentId) ?? { fileCount: 0, totalBytes: 0 };
	}

	/** Agents without files are not in the map. */
	async getKnowledgeTotalsByAgentIds(
		agentIds: string[],
		ctx: OperationContext,
	): Promise<Map<string, AgentKnowledgeTotals>> {
		const totalsByAgentId = new Map<string, AgentKnowledgeTotals>();
		if (agentIds.length === 0) {
			return totalsByAgentId;
		}

		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(AgentFile, 'file')
			.select('file.agentId', 'agentId')
			.addSelect('COUNT(file.id)', 'fileCount')
			.addSelect('SUM(file.fileSizeBytes)', 'totalBytes')
			.where('file.agentId IN (:...agentIds)', { agentIds })
			.groupBy('file.agentId')
			.getRawMany<{ agentId: string; fileCount: number | string; totalBytes: number | string }>();

		// PostgreSQL returns COUNT and SUM as strings.
		for (const row of rows) {
			totalsByAgentId.set(row.agentId, {
				fileCount: Number(row.fileCount),
				totalBytes: Number(row.totalBytes),
			});
		}

		return totalsByAgentId;
	}
}
