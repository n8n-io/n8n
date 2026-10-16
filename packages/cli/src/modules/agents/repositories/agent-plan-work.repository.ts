import type { AgentPlanTaskRef } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThanOrEqual } from '@n8n/typeorm';

import { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentPlan } from '../entities/agent-plan.entity';
import { AgentPlanHistory } from '../entities/agent-plan-history.entity';
import { AgentPlanValidationError, parseAgentPlan } from '../plans/agent-plan.schema';
import { getAgentPlanReadiness } from '../plans/agent-plan.validation';
import { planLeaves, unfinishedPlanIds } from '../plans/agent-plan-work-state';
import { AgentTaskCancellationRepository } from './agent-task-cancellation.repository';

@Service()
export class AgentPlanWorkRepository extends BaseRepository<AgentPlan> {
	constructor(
		dataSource: DataSource,
		txRunner: TransactionRunner,
		private readonly cancellations: AgentTaskCancellationRepository,
	) {
		super(AgentPlan, dataSource.manager, txRunner);
	}

	async stopForPlan(threadId: string, planId: string, ctx: OperationContext = {}) {
		const stop = await this.cancellations.latest(threadId, ctx);
		if (!stop || stop.planId !== planId) return null;
		if (stop.stoppedTaskIds !== undefined) return stop;
		const revision = await this.managerFor(ctx).findOne(AgentPlanHistory, {
			where: {
				planId,
				...(stop.planRevision
					? { revision: stop.planRevision }
					: { createdAt: LessThanOrEqual(new Date(stop.requestedAt)) }),
			},
			order: { revision: 'DESC' },
		});
		return revision
			? {
					...stop,
					stoppedTaskIds: unfinishedPlanIds(parseAgentPlan(revision.data, revision.formatVersion)),
				}
			: stop;
	}

	async jobsForPlan(planId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).find(AgentBackgroundJob, {
			where: { planId },
			order: { createdAt: 'ASC' },
		});
	}

	async jobStatesForPlan(planId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).find(AgentBackgroundJob, {
			where: { planId },
			select: ['planTaskId', 'status', 'pauseRequestId', 'notifiedAt'],
		});
	}

	async validateTask(
		threadId: string,
		ref: AgentPlanTaskRef | undefined,
		ctx: OperationContext = {},
		inherited = false,
	) {
		const manager = this.managerFor(ctx);
		const plan = ref
			? await manager.findOneBy(AgentPlan, { id: ref.planId, closedAt: IsNull() })
			: await manager.findOneBy(AgentPlan, { threadId, closedAt: IsNull() });
		if (!ref) {
			if (plan)
				throw new AgentPlanValidationError(
					'Read the plan and pass planTask with its plan ID and leaf task ID.',
				);
			return;
		}
		let owner = threadId;
		if (inherited) {
			while (owner !== plan?.threadId) {
				const thread = await manager.findOneBy(AgentExecutionThread, { id: owner });
				if (!thread?.parentThreadId) break;
				owner = thread.parentThreadId;
			}
		}
		if (!plan || plan.threadId !== owner)
			throw new AgentPlanValidationError(
				'The plan reference is stale or belongs to another conversation. Read the plan again.',
			);
		const data = parseAgentPlan(plan.data, plan.formatVersion);
		const task = data.items
			.flatMap((item) => (item.kind === 'group' ? item.tasks : [item]))
			.find((item) => item.id === ref.planTaskId);
		if (!task || !['pending', 'in_progress'].includes(task.status))
			throw new AgentPlanValidationError(
				'The plan task must be an unfinished leaf task. Read the plan again.',
			);
		if (getAgentPlanReadiness(data).blocked.some((item) => item.id === task.id))
			throw new AgentPlanValidationError(
				'The plan task has unfinished prerequisites. Complete them first.',
			);
		const stop = await this.stopForPlan(plan.threadId, plan.id, ctx);
		if (
			!inherited &&
			stop?.stoppedTaskIds?.includes(task.id) &&
			!stop.restartTaskIds?.includes(task.id)
		)
			throw new AgentPlanValidationError(
				'This task is stopped. Use resume_background_jobs only after the user asks to continue it.',
			);
	}

	async selectStoppedTasks(threadId: string, planId: string, taskIds?: string[]) {
		const plan = await this.findOneBy({ id: planId, threadId, closedAt: IsNull() });
		if (!plan)
			throw new AgentPlanValidationError('The plan reference is stale. Read the plan again.');
		const stop = await this.stopForPlan(threadId, planId);
		if (!stop?.pause.reportedAt || !stop.pause.resumedAt) return { status: 'stopping' as const };
		const data = parseAgentPlan(plan.data, plan.formatVersion);
		const leaves = planLeaves(data);
		const all = data.items.flatMap((item) =>
			item.kind === 'group' ? [item, ...item.tasks] : [item],
		);
		if (taskIds?.some((id) => !all.some((item) => item.id === id)))
			throw new AgentPlanValidationError('A selected task does not exist. Read the plan again.');
		const selected = taskIds
			? all
					.filter((item) => taskIds.includes(item.id))
					.flatMap((item) => (item.kind === 'group' && item.tasks.length ? item.tasks : [item]))
			: leaves;
		const requestedIds = [
			...new Set(
				selected
					.filter(
						(item) =>
							['pending', 'in_progress'].includes(item.status) &&
							(!stop.stoppedTaskIds || stop.stoppedTaskIds.includes(item.id)),
					)
					.map((item) => item.id),
			),
		];
		const targeted = await this.cancellations.targetedJobs(stop);
		const unlinked = targeted.filter((job) => job.pauseRequestId && !job.planId);
		if (taskIds && (unlinked.length > 0 || stop.stoppedTaskIds === undefined))
			return { status: 'task-selection-unavailable' as const };
		const blocked = getAgentPlanReadiness(data).blocked.filter((item) =>
			requestedIds.includes(item.id),
		);
		const ids = requestedIds.filter((id) => !blocked.some((item) => item.id === id));
		const jobs = [...(await this.jobsForPlan(planId)), ...(!taskIds ? unlinked : [])].filter(
			(job) => job.pauseRequestId && (!job.planTaskId || ids.includes(job.planTaskId)),
		);
		return {
			status: 'selected' as const,
			planId,
			stopId: stop.pause.id,
			// Release selected pending tasks too. Prerequisites still prevent dispatch.
			taskIds: requestedIds,
			blocked,
			jobs,
		};
	}

	async recordReplacement(ref: AgentPlanTaskRef, ctx: OperationContext) {
		const plan = await this.managerFor(ctx).findOneBy(AgentPlan, { id: ref.planId });
		if (!plan) return;
		const stop = await this.stopForPlan(plan.threadId, plan.id, ctx);
		if (!stop?.pause.resumedAt || !stop.restartTaskIds?.includes(ref.planTaskId)) return;
		stop.stoppedTaskIds = stop.stoppedTaskIds?.filter((id) => id !== ref.planTaskId);
		stop.restartTaskIds = stop.restartTaskIds.filter((id) => id !== ref.planTaskId);
		await this.cancellations.saveStop(stop, ctx);
	}

	async releaseStoppedTasks(
		threadId: string,
		planId: string,
		stopId: string,
		ids: string[],
		resumedJobIds: string[] = [],
	) {
		return await this.runInTransaction({}, async (_manager, ctx) => {
			await this.cancellations.lockScope(threadId, ctx);
			const stop = await this.stopForPlan(threadId, planId, ctx);
			if (!stop || stop.pause.id !== stopId || !stop.pause.resumedAt || !stop.stoppedTaskIds)
				return false;
			const jobs = await this.jobsForPlan(planId, ctx);
			const legacy = (await this.cancellations.targetedJobs(stop, ctx)).filter(
				(job) => !job.planId && job.pauseRequestId,
			);
			if (legacy.some((job) => ['running', 'suspended', 'paused', 'failed'].includes(job.status)))
				return false;
			const ready = ids.filter(
				(id) =>
					!jobs.some(
						(job) =>
							job.planTaskId === id &&
							job.pauseRequestId &&
							['paused', 'running', 'suspended', 'failed'].includes(job.status),
					),
			);
			const restartIds = ready.filter(
				(id) =>
					jobs.some(
						(job) =>
							job.planTaskId === id &&
							job.kind === 'workflow' &&
							job.pauseRequestId &&
							job.status === 'cancelled',
					) &&
					!jobs.some(
						(job) =>
							job.planTaskId === id &&
							!job.pauseRequestId &&
							(resumedJobIds.includes(job.id) || ['running', 'suspended'].includes(job.status)),
					),
			);
			stop.restartTaskIds = [...new Set([...(stop.restartTaskIds ?? []), ...restartIds])];
			const released = ready.filter((id) => !restartIds.includes(id));

			stop.stoppedTaskIds = stop.stoppedTaskIds.filter((id) => !released.includes(id));
			await this.cancellations.saveStop(stop, ctx);
			return true;
		});
	}
}
