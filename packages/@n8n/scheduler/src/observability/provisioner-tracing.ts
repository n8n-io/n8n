import { SCHEDULER_ATTRIBUTES, SCHEDULER_PROVISION_ACTION } from './attributes';
import { SpanStatus, type Tracer } from './tracer';
import type { ProvisionSummary } from '../core/provisioning/types';

/**
 * Wraps a {@link JobProvisioner}'s `provision`/`deprovision` in tracing spans, so
 * the provisioning logic itself contains no tracing calls (the same split the
 * scheduler factory uses for its passes).
 *
 * The operation-level span records the summary counts; a per-job child span is
 * then opened for each job the call actually touched (inserted, redefined or
 * removed), so each job's provisioning is traceable on its own rather than folded
 * into a count. Each per-job span carries the job's id and name (scopes are
 * opaque to the package, but the name identifies which rule changed).
 *
 * @param tracer - The host's tracer (or a no-op when the host traces nothing).
 */
export interface ProvisionerTracing {
	provision(run: () => Promise<ProvisionSummary>): Promise<ProvisionSummary>;
	deprovision(run: () => Promise<{ removed: number }>): Promise<{ removed: number }>;
}

export function createProvisionerTracing(tracer: Tracer): ProvisionerTracing {
	return {
		async provision(run) {
			return await tracer.startSpan(
				{ name: 'Scheduler provision', op: 'scheduler.provision' },
				async (span) => {
					// A throw from `run` (a failed transaction) propagates and the tracer
					// marks the span errored.
					const summary = await run();
					span.setAttribute(SCHEDULER_ATTRIBUTES.provisionInserted, summary.inserted.length);
					span.setAttribute(SCHEDULER_ATTRIBUTES.provisionRedefined, summary.redefined.length);
					span.setAttribute(SCHEDULER_ATTRIBUTES.provisionUnchanged, summary.unchanged.length);
					span.setAttribute(SCHEDULER_ATTRIBUTES.provisionRemoved, summary.removed.length);
					span.setStatus({ code: SpanStatus.ok });
					await traceProvisionedJobs(tracer, summary);
					return summary;
				},
			);
		},

		async deprovision(run) {
			return await tracer.startSpan(
				{ name: 'Scheduler deprovision', op: 'scheduler.deprovision' },
				async (span) => {
					// `deleteAll` reports only a count, not the ids, so there is no per-job
					// span to open here; the operation span carries the removed count.
					const result = await run();
					span.setAttribute(SCHEDULER_ATTRIBUTES.deprovisionRemoved, result.removed);
					span.setStatus({ code: SpanStatus.ok });
					return result;
				},
			);
		},
	};
}

/**
 * Opens one `scheduler.job.provision` span per job a provision touched, tagged
 * with the {@link SCHEDULER_PROVISION_ACTION} that job saw. Unchanged jobs are
 * omitted: nothing happened to them. Nests under the provision span, since it
 * runs inside that span's active async context.
 */
async function traceProvisionedJobs(tracer: Tracer, summary: ProvisionSummary): Promise<void> {
	const touched = [
		...summary.inserted.map((job) => [job, SCHEDULER_PROVISION_ACTION.inserted] as const),
		...summary.redefined.map((job) => [job, SCHEDULER_PROVISION_ACTION.redefined] as const),
		...summary.removed.map((job) => [job, SCHEDULER_PROVISION_ACTION.removed] as const),
	];
	for (const [job, action] of touched) {
		await tracer.startSpan(
			{
				name: 'Scheduler job provisioned',
				op: 'scheduler.job.provision',
				attributes: {
					[SCHEDULER_ATTRIBUTES.jobId]: job.id,
					[SCHEDULER_ATTRIBUTES.jobName]: job.name,
					[SCHEDULER_ATTRIBUTES.jobAction]: action,
				},
			},
			async (span) => {
				span.setStatus({ code: SpanStatus.ok });
				await Promise.resolve();
			},
		);
	}
}
