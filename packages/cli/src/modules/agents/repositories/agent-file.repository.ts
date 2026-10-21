import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentFile } from '../entities/agent-file.entity';

export interface AgentKnowledgeTotals {
	fileCount: number;
	/** Sum of the original upload sizes, not of the stored text. */
	totalBytes: number;
}

@Service()
export class AgentFileRepository extends Repository<AgentFile> {
	constructor(dataSource: DataSource) {
		super(AgentFile, dataSource.manager);
	}

	async findByAgentId(agentId: string): Promise<AgentFile[]> {
		return await this.find({
			where: { agentId },
			// Secondary id sort keeps pagination stable when batch uploads
			// share the same createdAt timestamp.
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async hasFilesForAgent(agentId: string): Promise<boolean> {
		return await this.existsBy({ agentId });
	}

	async findByIdAndAgentId(fileId: string, agentId: string): Promise<AgentFile | null> {
		return await this.findOneBy({ id: fileId, agentId });
	}

	async getKnowledgeTotals(agentId: string): Promise<AgentKnowledgeTotals> {
		const totalsByAgentId = await this.getKnowledgeTotalsByAgentIds([agentId]);
		return totalsByAgentId.get(agentId) ?? { fileCount: 0, totalBytes: 0 };
	}

	/** Agents without files are not in the map. */
	async getKnowledgeTotalsByAgentIds(
		agentIds: string[],
	): Promise<Map<string, AgentKnowledgeTotals>> {
		const totalsByAgentId = new Map<string, AgentKnowledgeTotals>();
		if (agentIds.length === 0) {
			return totalsByAgentId;
		}

		const rows = await this.createQueryBuilder('file')
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
