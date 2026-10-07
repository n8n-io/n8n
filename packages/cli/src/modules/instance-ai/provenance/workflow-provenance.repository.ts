import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { WorkflowProvenance } from './workflow-provenance.entity';

export interface WorkflowProvenanceListRow {
	workflowId: string;
	threadId: string;
	createdAt: Date;
	name: string;
	active: boolean;
}

@Service()
export class WorkflowProvenanceRepository extends Repository<WorkflowProvenance> {
	constructor(dataSource: DataSource) {
		super(WorkflowProvenance, dataSource.manager);
	}

	/** Keeps the first record for a workflow, so a repeated call changes nothing. */
	async recordIfAbsent(workflowId: string, threadId: string, userId: string): Promise<void> {
		await this.createQueryBuilder()
			.insert()
			.values({ workflowId, threadId, createdByUserId: userId })
			.orIgnore()
			.execute();
	}

	async findForWorkflow(workflowId: string): Promise<WorkflowProvenance | null> {
		return await this.findOneBy({ workflowId });
	}

	/** Newest first. */
	async listWorkflowIdsCreatedBy(userId: string, limit: number): Promise<string[]> {
		const rows = await this.find({
			select: { workflowId: true },
			where: { createdByUserId: userId },
			order: { createdAt: 'DESC', workflowId: 'ASC' },
			take: limit,
		});
		return rows.map(({ workflowId }) => workflowId);
	}

	/** Newest first. Archived workflows are not included. */
	async listForWorkflowIds(ids: string[], limit: number): Promise<WorkflowProvenanceListRow[]> {
		if (ids.length === 0 || limit <= 0) return [];
		const rows = await this.find({
			relations: { workflow: true },
			select: {
				workflowId: true,
				threadId: true,
				createdAt: true,
				workflow: { id: true, name: true, activeVersionId: true },
			},
			where: { workflowId: In(ids), workflow: { isArchived: false } },
			order: { createdAt: 'DESC', workflowId: 'ASC' },
			take: limit,
		});
		return rows.map(({ workflowId, threadId, createdAt, workflow }) => ({
			workflowId,
			threadId,
			createdAt,
			name: workflow.name,
			active: workflow.activeVersionId !== null,
		}));
	}
}
