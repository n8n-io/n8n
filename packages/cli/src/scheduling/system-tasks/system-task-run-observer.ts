import type { SystemTask } from '@n8n/decorators';

import type { EventService } from '@/events/event.service';
import type { SystemTaskMode } from '@/events/maps/system-task-metrics.event-map';

import { emitSystemTaskMetric } from './emit-system-task-metric';

/**
 * Starts one run of `task` and returns its promise. Calls `run` in the calling
 * tick, so an abort that follows the call cannot preempt the run, and rejects
 * rather than throws if `run` throws synchronously.
 */
async function startRun(task: Pick<SystemTask, 'run'>, signal: AbortSignal): Promise<void> {
	await task.run(signal);
}

/** How one observed run ended. A rejected run carries its error. */
export type SystemTaskRunOutcome =
	| { result: 'success' | 'aborted'; rejected: false }
	| { result: 'failure' | 'aborted'; rejected: true; error: unknown };

/**
 * Run one occurrence of `task` with `signal` and emit its start and its
 * settlement, paired by construction. Never rejects: a run that settles after
 * `signal` aborted ends as `aborted`, otherwise a resolution ends as `success`
 * and a rejection as `failure`.
 */
export async function observeSystemTaskRun(
	eventService: EventService,
	task: Pick<SystemTask, 'name' | 'run'>,
	mode: SystemTaskMode,
	signal: AbortSignal,
): Promise<SystemTaskRunOutcome> {
	const { name } = task;
	const startedAt = performance.now();
	emitSystemTaskMetric(eventService, 'system-task-run-started', { name, mode });
	const outcome = await startRun(task, signal).then(
		(): SystemTaskRunOutcome => ({
			result: signal.aborted ? 'aborted' : 'success',
			rejected: false,
		}),
		(error: unknown): SystemTaskRunOutcome => ({
			result: signal.aborted ? 'aborted' : 'failure',
			rejected: true,
			error,
		}),
	);
	emitSystemTaskMetric(eventService, 'system-task-run-settled', {
		name,
		mode,
		result: outcome.result,
		durationMs: performance.now() - startedAt,
	});
	return outcome;
}
