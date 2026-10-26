import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import {
	AgentPlanValidationError,
	type AgentPlanDocument,
	type AgentPlanGroup,
	type AgentPlanStatus,
	type AgentPlanTask,
	type StoredAgentPlanDocument,
} from './agent-plan.schema';

export type PlanJobState = Pick<
	AgentBackgroundJob,
	'id' | 'status' | 'createdAt' | 'settledAt' | 'pauseRequestId' | 'notifiedAt'
>;

export function jobTaskStatus(job: PlanJobState): AgentPlanStatus {
	if (job.status === 'completed') return 'done';
	if (job.status === 'running') return 'in_progress';
	if (job.status === 'suspended') {
		// A reservation holds capacity. The job has not resumed yet.
		return job.pauseRequestId && job.notifiedAt ? 'paused' : 'in_progress';
	}
	return job.status;
}

export function derivePlanGroups(document: AgentPlanDocument): AgentPlanDocument {
	return {
		...document,
		items: document.items.map((item): AgentPlanTask | AgentPlanGroup => {
			if (item.kind === 'task') return item;
			const replaced = new Set<string>();
			const byId = new Map(item.tasks.map((task) => [task.id, task]));
			for (const task of item.tasks.filter((task) => task.status === 'done')) {
				let original = task.fallbackFor;
				while (original && !replaced.has(original)) {
					replaced.add(original);
					original = byId.get(original)?.fallbackFor;
				}
			}
			const tasks = item.tasks.filter((task) => !replaced.has(task.id));
			const status: AgentPlanStatus =
				tasks.length === 0
					? 'pending'
					: ((['in_progress', 'paused', 'pending', 'failed', 'cancelled'] as const).find(
							(candidate) => tasks.some((task) => task.status === candidate),
						) ?? 'done');
			return {
				...item,
				status,
				startedAt:
					item.tasks.flatMap((task) => (task.startedAt ? [task.startedAt] : [])).sort()[0] ?? null,
				endedAt: ['pending', 'in_progress'].includes(status)
					? null
					: (item.tasks
							.flatMap((task) => (task.endedAt ? [task.endedAt] : []))
							.sort()
							.at(-1) ?? null),
			};
		}),
	};
}

export function resolveAgentPlan(
	document: StoredAgentPlanDocument,
	jobs: PlanJobState[],
): AgentPlanDocument {
	const byId = new Map(jobs.map((job) => [job.id, job]));
	const taskState = (task: StoredAgentPlanDocument['items'][number]): AgentPlanTask => {
		if (task.kind !== 'task') throw new AgentPlanValidationError('Expected a leaf task');
		if (!('jobId' in task)) return task;
		const job = byId.get(task.jobId);
		if (!job) throw new AgentPlanValidationError(`The job for plan task ${task.id} is missing`);
		return {
			...task,
			status: jobTaskStatus(job),
			startedAt: job.createdAt.toISOString(),
			endedAt: job.settledAt?.toISOString() ?? null,
		};
	};
	return derivePlanGroups({
		...document,
		items: document.items.map((item) =>
			item.kind === 'task'
				? taskState(item)
				: {
						...item,
						status: 'pending',
						startedAt: null,
						endedAt: null,
						tasks: item.tasks.map(taskState),
					},
		),
	});
}

export function planLeaves(document: AgentPlanDocument) {
	return document.items.flatMap((item) =>
		item.kind === 'group' && item.tasks.length > 0 ? item.tasks : [item],
	);
}
