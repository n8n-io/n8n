import {
	BaseRepository,
	ExecutionEntity,
	SharedWorkflow,
	TransactionRunner,
	WorkflowEntity,
	WorkflowRepository,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Like } from '@n8n/typeorm';

import { InstanceAiResource } from '../../entities/instance-ai-resource.entity';

export const TEMPORARY_VERIFICATION_RETENTION_MS = 24 * 60 * 60 * 1000;
const RESOURCE_PREFIX = 'verification-workflow:';

@Service()
export class SelfHealingTemporaryWorkflowRepository extends BaseRepository<InstanceAiResource> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly workflows: WorkflowRepository,
	) {
		super(InstanceAiResource, dataSource.manager, transactionRunner);
	}

	async createTemporary(
		workflow: WorkflowEntity,
		originalWorkflowId: string,
		ctx: OperationContext,
	): Promise<WorkflowEntity> {
		const manager = this.managerFor(ctx);
		const saved = await this.workflows.createContent(workflow, ctx);

		const shares = await manager.findBy(SharedWorkflow, { workflowId: originalWorkflowId });
		await manager.insert(
			SharedWorkflow,
			shares.map(({ projectId, role }) => ({ workflowId: saved.id, projectId, role })),
		);

		// Resource markers survive thread deletion, so interrupted runs remain recoverable.
		await manager.insert(InstanceAiResource, { id: RESOURCE_PREFIX + saved.id });

		return saved;
	}

	async findAbandonedIds(before: Date): Promise<string[]> {
		const rows = await this.find({
			where: {
				id: Like(`${RESOURCE_PREFIX}%`),
				createdAt: LessThan(before),
			},
			select: { id: true },
			order: { createdAt: 'ASC', id: 'ASC' },
			take: 100,
		});

		return rows.map(({ id }) => id.slice(RESOURCE_PREFIX.length));
	}

	private async findCleanupMarker(workflowId: string) {
		const marker = await this.findOne({
			where: { id: RESOURCE_PREFIX + workflowId },
			select: { createdAt: true },
		});
		if (!marker) return undefined;

		const workflow = await this.manager.findOne(WorkflowEntity, {
			where: { id: workflowId },
			select: ['id', 'isArchived', 'activeVersionId'],
		});
		if (workflow && (!workflow.isArchived || workflow.activeVersionId)) {
			// Stop retrying cleanup for a copy the user has kept.
			await this.delete({ id: RESOURCE_PREFIX + workflowId });
			return undefined;
		}

		return marker;
	}

	async findUnfinishedExecutionIds(workflowId: string): Promise<string[]> {
		if (!(await this.findCleanupMarker(workflowId))) return [];

		const executions = await this.manager.find(ExecutionEntity, {
			where: { workflowId, status: In(['new', 'running', 'waiting', 'unknown']) },
			select: { id: true },
			take: 25,
		});

		return executions.map(({ id }) => id);
	}

	async canDelete(workflowId: string): Promise<boolean> {
		const marker = await this.findCleanupMarker(workflowId);
		if (!marker) return false;

		const executions = await this.manager.find(ExecutionEntity, {
			where: { workflowId, status: In(['new', 'running', 'waiting', 'unknown', 'canceled']) },
			select: { status: true, stoppedAt: true },
		});

		// A canceled status can precede the worker's final writes. Wait after cancellation, not creation.
		const before = Date.now() - TEMPORARY_VERIFICATION_RETENTION_MS;

		return executions.every(
			({ status, stoppedAt }) =>
				status === 'canceled' && (stoppedAt ?? marker.createdAt).getTime() < before,
		);
	}

	async deleteTemporary(workflowId: string): Promise<void> {
		await this.manager.delete(WorkflowEntity, workflowId);
		await this.delete({ id: RESOURCE_PREFIX + workflowId });
	}
}
