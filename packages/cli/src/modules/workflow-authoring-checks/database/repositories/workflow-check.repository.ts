import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import type { WorkflowCheckTypeKey } from '../../workflow-authoring-checks.constants';
import type { WorkflowAuthoringCheckSeverity } from '../../workflow-authoring-checks.types';
import { WorkflowCheck } from '../entities/workflow-check.entity';

export interface CreateWorkflowCheckInput {
	name: string;
	type: WorkflowCheckTypeKey;
	config: Record<string, unknown>;
	severity: WorkflowAuthoringCheckSeverity;
	enabled?: boolean;
}

export interface CreateWorkflowCheckWithIdInput extends CreateWorkflowCheckInput {
	id: string;
}

export interface UpdateWorkflowCheckPatch {
	name?: string;
	config?: Record<string, unknown>;
	severity?: WorkflowAuthoringCheckSeverity;
	enabled?: boolean;
}

@Service()
export class WorkflowCheckRepository extends Repository<WorkflowCheck> {
	constructor(dataSource: DataSource) {
		super(WorkflowCheck, dataSource.manager);
	}

	async findAllOrdered(): Promise<WorkflowCheck[]> {
		return await this.find({ order: { createdAt: 'ASC' } });
	}

	async createInstance(input: CreateWorkflowCheckInput): Promise<WorkflowCheck> {
		const fresh = this.create({
			name: input.name,
			type: input.type,
			config: input.config,
			severity: input.severity,
			enabled: input.enabled ?? true,
		});
		return await this.save(fresh);
	}

	async createWithId(input: CreateWorkflowCheckWithIdInput): Promise<WorkflowCheck> {
		const fresh = this.create({
			id: input.id,
			name: input.name,
			type: input.type,
			config: input.config,
			severity: input.severity,
			enabled: input.enabled ?? true,
		});
		return await this.save(fresh);
	}

	async updateInstance(id: string, patch: UpdateWorkflowCheckPatch): Promise<WorkflowCheck | null> {
		const existing = await this.findOne({ where: { id } });
		if (!existing) return null;
		if (patch.name !== undefined) existing.name = patch.name;
		if (patch.config !== undefined) existing.config = patch.config;
		if (patch.severity !== undefined) existing.severity = patch.severity;
		if (patch.enabled !== undefined) existing.enabled = patch.enabled;
		return await this.save(existing);
	}

	async deleteById(id: string): Promise<boolean> {
		const result = await this.delete({ id });
		return (result.affected ?? 0) > 0;
	}
}
