import type { SystemTask } from '@n8n/decorators';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { SpanStatus, type Span, type Tracing } from 'n8n-core';

import type { EventService } from '@/events/event.service';
import type { SystemTaskMode } from '@/events/maps/system-task-metrics.event-map';

import { emitSystemTaskMetric } from './emit-system-task-metric';

/** Span attribute names for a run, the same vocabulary as the metric labels. */
const SYSTEM_TASK_ATTRIBUTES = {
	name: 'n8n.system_task.name',
	mode: 'n8n.system_task.mode',
	result: 'n8n.system_task.result',
} as const;

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
 * Run one occurrence of `task` with `signal`, emit its start and its settlement,
 * paired by construction, and record one `system_task.run` span around it. Never
 * rejects: a run that settles after `signal` aborted ends as `aborted`, otherwise
 * a resolution ends as `success` and a rejection as `failure`.
 */
export async function observeSystemTaskRun(
	eventService: EventService,
	tracing: Tracing,
	task: Pick<SystemTask, 'name' | 'run'>,
	mode: SystemTaskMode,
	signal: AbortSignal,
): Promise<SystemTaskRunOutcome> {
	const { name } = task;
	const spanOptions = {
		name: 'System task run',
		op: 'system_task.run',
		attributes: {
			[SYSTEM_TASK_ATTRIBUTES.name]: name,
			[SYSTEM_TASK_ATTRIBUTES.mode]: mode,
		},
	};
	// An in-memory run fires from a timer callback, whose async context still
	// carries whatever span was active when the timer was armed, so it needs a
	// fresh trace. A durable run parents under `scheduler.handoff`.
	const startSpan =
		mode === 'in_memory'
			? tracing.startNewTraceSpan.bind(tracing)
			: tracing.startSpan.bind(tracing);

	return await startSpan(spanOptions, async (span: Span) => {
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
		span.setAttribute(SYSTEM_TASK_ATTRIBUTES.result, outcome.result);
		// An abort is an expected shutdown, so only a real failure errors the span.
		if (outcome.result === 'failure') {
			span.setStatus({ code: SpanStatus.error, message: ensureError(outcome.error).message });
		} else {
			span.setStatus({ code: SpanStatus.ok });
		}
		return outcome;
	});
}
