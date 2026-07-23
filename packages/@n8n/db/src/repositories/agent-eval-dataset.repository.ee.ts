import type { DatasetRef } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentEvalDataset } from '../entities';
import type { AgentEvalColumnMapping } from '../entities/agent-eval-dataset.ee';

type CreateAgentEvalDatasetAttrs = {
	name: string;
	agentId: string;
	datasetSource: DatasetRef['datasetSource'];
	datasetRef: DatasetRef['datasetRef'];
	description?: string | null;
	columnMapping?: AgentEvalColumnMapping | null;
	createdById?: string | null;
};

@Service()
export class AgentEvalDatasetRepository extends Repository<AgentEvalDataset> {
	constructor(dataSource: DataSource) {
		super(AgentEvalDataset, dataSource.manager);
	}

	async createDataset(attrs: CreateAgentEvalDatasetAttrs): Promise<AgentEvalDataset> {
		const dataset = this.create({
			name: attrs.name,
			agentId: attrs.agentId,
			datasetSource: attrs.datasetSource,
			datasetRef: attrs.datasetRef,
			description: attrs.description ?? null,
			columnMapping: attrs.columnMapping ?? null,
			createdById: attrs.createdById ?? null,
		});

		return await this.save(dataset);
	}

	async findByAgentId(agentId: string): Promise<AgentEvalDataset[]> {
		return await this.find({ where: { agentId }, order: { createdAt: 'DESC' } });
	}
}
