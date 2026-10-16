import type { AgentPlanWorkState } from '@n8n/api-types';

import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import type { AgentTaskStop } from '../types/agent-task-stop';
import type { AgentPlanDocument } from './agent-plan.schema';

export function planLeaves(document: AgentPlanDocument) {
	return document.items.flatMap((item) =>
		item.kind === 'group' && item.tasks.length > 0 ? item.tasks : [item],
	);
}

export function unfinishedPlanIds(document: AgentPlanDocument): string[] {
	return planLeaves(document)
		.filter((item) => item.status === 'pending' || item.status === 'in_progress')
		.map((item) => item.id);
}

export function projectPlanWorkState(
	document: AgentPlanDocument,
	stop: AgentTaskStop | null,
	jobs: Array<Pick<AgentBackgroundJob, 'planTaskId' | 'status' | 'pauseRequestId' | 'notifiedAt'>>,
): AgentPlanWorkState {
	const unfinished = unfinishedPlanIds(document);
	const captured = new Set(stop?.stoppedTaskIds);
	const stoppingTaskIds: string[] = [];
	const stoppedTaskIds: string[] = [];
	for (const id of unfinished) {
		const taskJobs = jobs.filter((job) => job.planTaskId === id);
		if (!captured.has(id)) continue;
		// A reserved resume still has its pause ID and delivery receipt.
		const active = taskJobs.some(
			(job) =>
				(job.status === 'running' || job.status === 'suspended') &&
				!(job.pauseRequestId && job.notifiedAt),
		);
		if (
			active &&
			stop?.pause.resumedAt &&
			taskJobs.some((job) => !job.pauseRequestId && ['running', 'suspended'].includes(job.status))
		)
			continue;
		if (active) stoppingTaskIds.push(id);
		else stoppedTaskIds.push(id);
	}
	const taskStateAvailable = !stop || stop.stoppedTaskIds !== undefined;
	const fullyStopped =
		taskStateAvailable &&
		unfinished.length > 0 &&
		unfinished.every((id) => stoppedTaskIds.includes(id));
	return {
		stoppedTaskIds,
		stoppingTaskIds,
		fullyStopped,
		stoppedAt: fullyStopped
			? ([stop?.requestedAt, ...planLeaves(document).map((item) => item.endedAt)]
					.filter((time): time is string => Boolean(time))
					.sort()
					.at(-1) ?? null)
			: null,
		taskStateAvailable,
	};
}
