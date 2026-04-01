import { Service } from '@n8n/di';
import { WorkflowsStorage } from '@mastra/core/storage';
import type {
	StorageListWorkflowRunsInput,
	WorkflowRun,
	WorkflowRuns,
	UpdateWorkflowStateOptions,
} from '@mastra/core/storage';
import type { StepResult, WorkflowRunState } from '@mastra/core/workflows';
import { jsonParse } from 'n8n-workflow';

import { InstanceAiWorkflowSnapshotRepository } from '../repositories/instance-ai-workflow-snapshot.repository';

@Service()
export class TypeORMWorkflowsStorage extends WorkflowsStorage {
	constructor(private readonly snapshotRepo: InstanceAiWorkflowSnapshotRepository) {
		super();
	}

	supportsConcurrentUpdates(): boolean {
		return false;
	}

	async dangerouslyClearAll(): Promise<void> {
		await this.snapshotRepo.clear();
	}

	async persistWorkflowSnapshot(args: {
		workflowName: string;
		runId: string;
		resourceId?: string;
		snapshot: WorkflowRunState;
		createdAt?: Date;
		updatedAt?: Date;
	}): Promise<void> {
		const existing = await this.snapshotRepo.findOneBy({
			runId: args.runId,
			workflowName: args.workflowName,
		});

		const snapshot = JSON.stringify(args.snapshot);
		const status = args.snapshot.status ?? null;

		if (existing) {
			await this.snapshotRepo.update(
				{ runId: args.runId, workflowName: args.workflowName },
				{
					snapshot,
					status,
					resourceId: args.resourceId ?? null,
				},
			);
		} else {
			const entity = this.snapshotRepo.create({
				runId: args.runId,
				workflowName: args.workflowName,
				resourceId: args.resourceId ?? null,
				status,
				snapshot,
			});
			await this.snapshotRepo.save(entity);
		}
	}

	async loadWorkflowSnapshot({
		workflowName,
		runId,
	}: {
		workflowName: string;
		runId: string;
	}): Promise<WorkflowRunState | null> {
		const entity = await this.snapshotRepo.findOneBy({ runId, workflowName });
		if (!entity) return null;
		return jsonParse<WorkflowRunState>(entity.snapshot);
	}

	async updateWorkflowState({
		workflowName,
		runId,
		opts,
	}: {
		workflowName: string;
		runId: string;
		opts: UpdateWorkflowStateOptions;
	}): Promise<WorkflowRunState | undefined> {
		const snapshot = await this.loadWorkflowSnapshot({
			workflowName,
			runId,
		});
		if (!snapshot) return undefined;

		if (opts.status !== undefined) snapshot.status = opts.status;
		if (opts.error !== undefined) snapshot.error = opts.error;
		if (opts.suspendedPaths !== undefined) {
			snapshot.suspendedPaths = opts.suspendedPaths;
		}
		if (opts.resumeLabels !== undefined) {
			snapshot.resumeLabels = opts.resumeLabels;
		}

		await this.snapshotRepo.update(
			{ runId, workflowName },
			{
				snapshot: JSON.stringify(snapshot),
				status: snapshot.status ?? null,
			},
		);
		return snapshot;
	}

	async updateWorkflowResults({
		workflowName,
		runId,
		stepId,
		result,
	}: {
		workflowName: string;
		runId: string;
		stepId: string;
		result: StepResult<unknown, unknown, unknown, unknown>;
		requestContext: Record<string, unknown>;
	}): Promise<Record<string, StepResult<unknown, unknown, unknown, unknown>>> {
		const snapshot = await this.loadWorkflowSnapshot({
			workflowName,
			runId,
		});
		if (!snapshot) return {};

		snapshot.result ??= {};
		(snapshot.result as Record<string, unknown>)[stepId] = result;

		await this.snapshotRepo.update({ runId, workflowName }, { snapshot: JSON.stringify(snapshot) });
		return snapshot.result as Record<string, StepResult<unknown, unknown, unknown, unknown>>;
	}

	async listWorkflowRuns(args?: StorageListWorkflowRunsInput): Promise<WorkflowRuns> {
		const qb = this.snapshotRepo.createQueryBuilder('s');

		if (args?.workflowName) {
			qb.andWhere('s.workflowName = :name', { name: args.workflowName });
		}
		if (args?.resourceId) {
			qb.andWhere('s.resourceId = :rid', { rid: args.resourceId });
		}
		if (args?.status) {
			qb.andWhere('s.status = :status', { status: args.status });
		}
		if (args?.fromDate) {
			qb.andWhere('s.createdAt >= :fromDate', { fromDate: args.fromDate });
		}
		if (args?.toDate) {
			qb.andWhere('s.createdAt <= :toDate', { toDate: args.toDate });
		}

		qb.orderBy('s.createdAt', 'DESC');
		const total = await qb.getCount();

		if (args?.perPage !== undefined && args?.page !== undefined) {
			const perPage = args.perPage === false ? Number.MAX_SAFE_INTEGER : args.perPage;
			qb.skip(args.page * perPage).take(perPage);
		}

		const entities = await qb.getMany();
		const runs: WorkflowRun[] = entities.map((e) => ({
			workflowName: e.workflowName,
			runId: e.runId,
			snapshot: jsonParse<WorkflowRunState>(e.snapshot),
			createdAt: e.createdAt,
			updatedAt: e.updatedAt,
			resourceId: e.resourceId ?? undefined,
		}));

		return { runs, total };
	}

	async getWorkflowRunById({
		runId,
		workflowName,
	}: {
		runId: string;
		workflowName?: string;
	}): Promise<WorkflowRun | null> {
		const where: Record<string, string> = { runId };
		if (workflowName) where.workflowName = workflowName;
		const entity = await this.snapshotRepo.findOneBy(where);
		if (!entity) return null;
		return {
			workflowName: entity.workflowName,
			runId: entity.runId,
			snapshot: jsonParse<WorkflowRunState>(entity.snapshot),
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
			resourceId: entity.resourceId ?? undefined,
		};
	}

	async deleteWorkflowRunById({
		runId,
		workflowName,
	}: {
		runId: string;
		workflowName: string;
	}): Promise<void> {
		await this.snapshotRepo.delete({ runId, workflowName });
	}

	/** Delete all snapshots for a given runId regardless of workflowName. */
	async deleteAllByRunId(runId: string): Promise<void> {
		await this.snapshotRepo.delete({ runId });
	}
}
