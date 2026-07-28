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

/**
 * Metadata-only patch. The dataset *source* (`datasetSource` + `datasetRef`) is
 * deliberately absent: repointing a dataset at a different table would silently
 * change what its existing runs were measured against, so that's a new dataset.
 */
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

	/**
	 * Ownership-scoped read: resolves the dataset only if it belongs to `agentId`.
	 * The REST layer authorizes the *agent*, so every dataset lookup behind it
	 * must filter on the agent too — a plain `findById` would let a caller
	 * authorized for one agent address another agent's dataset by id.
	 */
	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentEvalDataset | null> {
		return await this.findOneBy({ id, agentId });
	}

	/**
	 * Patch a dataset's metadata, scoped to its agent. Only the fields present in
	 * `attrs` are applied, so an absent key leaves the column untouched while an
	 * explicit `null` clears it. Returns the updated dataset, or `null` when the
	 * id doesn't resolve for this agent.
	 *
	 * Read-modify-save rather than a bare `update`: `columnMapping` is a JSON
	 * column, which TypeORM's partial-update type can't express, and the read is
	 * needed anyway to return the current record.
	 */
	async updateDataset(
		id: string,
		agentId: string,
		attrs: UpdateAgentEvalDatasetAttrs,
	): Promise<AgentEvalDataset | null> {
		const dataset = await this.findByIdAndAgentId(id, agentId);
		if (!dataset) return null;

		if (attrs.name !== undefined) dataset.name = attrs.name;
		if (attrs.description !== undefined) dataset.description = attrs.description;
		if (attrs.columnMapping !== undefined) dataset.columnMapping = attrs.columnMapping;

		return await this.save(dataset);
	}

	/** Delete a dataset, scoped to its agent. Returns whether a row was removed. */
	async deleteDataset(id: string, agentId: string): Promise<boolean> {
		const result = await this.delete({ id, agentId });
		return (result.affected ?? 0) > 0;
	}
}
