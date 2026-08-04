import type { DatasetRef } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

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

// Metadata only: repointing the source would change what existing runs were
// measured against, so that's a new dataset.
type UpdateAgentEvalDatasetAttrs = {
	name?: string;
	description?: string | null;
	columnMapping?: AgentEvalColumnMapping | null;
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

	async findById(id: string): Promise<AgentEvalDataset | null> {
		return await this.findOneBy({ id });
	}

	// The REST layer authorizes an agent, so lookups behind it must filter on the
	// agent — `findById` alone would expose another agent's dataset by id.
	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentEvalDataset | null> {
		return await this.findOneBy({ id, agentId });
	}

	// An absent key leaves the column alone; an explicit `null` clears it. Writes
	// only the named columns, so concurrent patches can't clobber each other.
	async updateDataset(
		id: string,
		agentId: string,
		attrs: UpdateAgentEvalDatasetAttrs,
	): Promise<AgentEvalDataset | null> {
		const patch: QueryDeepPartialEntity<AgentEvalDataset> = {
			...(attrs.name !== undefined && { name: attrs.name }),
			...(attrs.description !== undefined && { description: attrs.description }),
			...(attrs.columnMapping !== undefined && { columnMapping: attrs.columnMapping }),
		};

		// Agent-scoped so a foreign agent's patch matches no row. TypeORM rejects an
		// empty patch, and a body with no known field is a no-op anyway.
		if (Object.keys(patch).length > 0) {
			await this.update({ id, agentId }, patch);
		}

		// Authoritative for "not found": covers an unknown id and a foreign agent
		// without depending on driver-specific affected-row counts.
		return await this.findByIdAndAgentId(id, agentId);
	}

	/** Delete a dataset, scoped to its agent. Returns whether a row was removed. */
	async deleteDataset(id: string, agentId: string): Promise<boolean> {
		const result = await this.delete({ id, agentId });
		return (result.affected ?? 0) > 0;
	}
}
