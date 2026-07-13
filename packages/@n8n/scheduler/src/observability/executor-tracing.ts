import {
	SCHEDULER_ATTRIBUTES,
	SCHEDULER_FIRE_OUTCOME,
	pickSchedulerTaskAttributes,
} from './attributes';
import { SpanStatus, type Tracer } from './tracer';
import type { ExecutorTracing, FireResult, TaskHandler } from '../core/executor';

/**
 * Builds the tracing hook the executor runs every fire through: it opens a
 * `scheduler.fire` span around the fire and closes it based on the returned
 * {@link FireResult}. A failure outcome ('rescheduled', 'dead-lettered')
 * closes the span as errored with the handler's message; every other outcome
 * closes it as ok, since skips are expected and harmless.
 *
 * This is the only place that knows how a fire outcome translates to span
 * attributes and status; the executor itself contains no tracing code.
 *
 * @param tracer - The host's tracer (or a no-op when the host traces nothing).
 */
export function createExecutorTracing(tracer: Tracer): ExecutorTracing {
	return {
		async fire(host, task, run) {
			return await tracer.startSpan(
				{
					name: 'Scheduler fire',
					op: 'scheduler.fire',
					attributes: { ...pickSchedulerTaskAttributes(task), [SCHEDULER_ATTRIBUTES.host]: host },
					// `fire` runs from inside a timer callback armed while the claim span
					// (`scheduler.claim`) was active; the async context still carries that
					// span here, so without a fresh trace the fire span would be parented
					// under a claim span that may already have closed and been sent.
					newTrace: true,
				},
				async (span) => {
					// If `run` throws (e.g. writing the outcome to storage failed), the
					// error propagates and the tracer marks the span as errored.
					const result = await run();
					span.setAttribute(SCHEDULER_ATTRIBUTES.outcome, fireOutcomeAttribute(result.outcome));
					if ('errorMessage' in result) {
						span.setStatus({ code: SpanStatus.error, message: result.errorMessage });
					} else {
						span.setStatus({ code: SpanStatus.ok });
					}
					return result;
				},
			);
		},
	};
}

/**
 * Wraps a task handler so every execution runs inside a `scheduler.handoff`
 * span. The span becomes a child of the fire span automatically, because the
 * real tracer keeps track of which span is currently active.
 *
 * Handlers are wrapped when they are registered (see `createScheduler`), so
 * the executor calls them without knowing about the span. An error thrown by
 * the handler still propagates (that is how the executor detects a failed
 * attempt) and marks the span as errored.
 *
 * @param tracer - The host's tracer (or a no-op when the host traces nothing).
 * @param handler - The task handler to wrap.
 * @returns A handler with the same behavior, plus the span around each run.
 */
export function withHandoffTracing(tracer: Tracer, handler: TaskHandler): TaskHandler {
	return {
		async execute(task) {
			await tracer.startSpan(
				{
					name: 'Scheduler handoff',
					op: 'scheduler.handoff',
					attributes: {
						[SCHEDULER_ATTRIBUTES.taskId]: task.id,
						[SCHEDULER_ATTRIBUTES.jobId]: task.jobId,
						[SCHEDULER_ATTRIBUTES.taskType]: task.taskType,
					},
				},
				async (span) => {
					await handler.execute(task);
					span.setStatus({ code: SpanStatus.ok });
				},
			);
		},
	};
}

/**
 * Translates a fire outcome into the value recorded on the fire span's `outcome` attribute.
 */
function fireOutcomeAttribute(outcome: FireResult['outcome']): string {
	switch (outcome) {
		case 'completed':
			return SCHEDULER_FIRE_OUTCOME.completed;
		case 'rescheduled':
			return SCHEDULER_FIRE_OUTCOME.rescheduled;
		case 'dead-lettered':
			return SCHEDULER_FIRE_OUTCOME.deadLettered;
		case 'skipped-no-handler':
			return SCHEDULER_FIRE_OUTCOME.skippedNoHandler;
		case 'skipped-not-owned':
			return SCHEDULER_FIRE_OUTCOME.skippedNotOwned;
	}
}
