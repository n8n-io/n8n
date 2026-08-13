import { SCHEDULER_ATTRIBUTES } from './attributes';
import { SpanStatus, type Tracer } from './tracer';
import type { RecordedOccurrence } from '../core/materializer';

/**
 * Opens one `scheduler.task.create` span per row the materializer just recorded,
 * so each task's creation is traceable on its own rather than folded into the
 * pass-level `occurrences` count.
 *
 * Row identity is only as complete as the storage layer's `recordOccurrences`
 * (Postgres `RETURNING`; empty elsewhere), so this is a no-op on hosts where
 * `created` is empty.
 *
 * @param tracer - The host's tracer (or a no-op when the host traces nothing).
 * @param created - The rows newly recorded by this materialize pass.
 */
export async function traceCreatedTasks(
	tracer: Tracer,
	created: RecordedOccurrence[],
): Promise<void> {
	for (const task of created) {
		await tracer.startSpan(
			{
				name: 'Scheduler task created',
				op: 'scheduler.task.create',
				attributes: {
					[SCHEDULER_ATTRIBUTES.taskId]: task.id,
					[SCHEDULER_ATTRIBUTES.jobId]: task.jobId,
					[SCHEDULER_ATTRIBUTES.taskType]: task.taskType,
				},
			},
			async (span) => {
				span.setStatus({ code: SpanStatus.ok });
				await Promise.resolve();
			},
		);
	}
}
