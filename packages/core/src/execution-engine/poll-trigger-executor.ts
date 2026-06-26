import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INode, IPollFunctions, Workflow } from 'n8n-workflow';

import { SpanStatus, Tracing } from '@/observability';

import { TriggersAndPollers } from './triggers-and-pollers';

/** Runs a poll trigger's `poll()` once. `testingTrigger` flags the initial activation poll. */
export type PollTriggerExecuteFn = (testingTrigger?: boolean) => Promise<void>;

/**
 * Builds the runtime function that executes a poll trigger node. Kept separate
 * from {@link ActiveWorkflowTriggers} so poll-trigger runtime logs are emitted
 * under their own scope rather than the publication scope.
 */
@Service()
export class PollTriggerExecutor {
	constructor(
		private readonly logger: Logger,
		private readonly triggersAndPollers: TriggersAndPollers,
		private readonly tracing: Tracing,
	) {
		this.logger = logger.scoped('poll-trigger');
	}

	/**
	 * Creates a function that executes the poll() implementation for a poll
	 * trigger node and triggers a workflow execution based on the output.
	 *
	 * @param isCurrent Tells whether this poller is still the active registration
	 *   for its node. A scheduled poll can finish after the workflow was removed
	 *   or reactivated, so a superseded result is dropped to avoid executing the
	 *   old version.
	 */
	create(
		workflow: Workflow,
		node: INode,
		pollFunctions: IPollFunctions,
		isCurrent: () => boolean,
	): PollTriggerExecuteFn {
		return async (testingTrigger = false) => {
			return await this.tracing.startSpan(
				{
					name: 'Workflow Trigger Poll',
					op: 'trigger.poll',
					attributes: {
						...this.tracing.pickWorkflowAttributes(workflow),
						...this.tracing.pickNodeAttributes(node),
					},
				},
				async (span) => {
					this.logger.debug(`Poll trigger initiated for workflow "${workflow.name}"`, {
						workflowName: workflow.name,
						workflowId: workflow.id,
					});

					// The initial activation poll runs inside ActiveWorkflowManager's
					// outer acquireIsolate window, which also covers countTriggers
					// afterwards. Acquiring here would release the outer bridge early
					// (acquire is idempotent per caller; release deletes it). Scheduled
					// polls fire from the cron scheduler's own async context outside
					// that window and must acquire/release per tick — see CAT-3147.
					const ownsIsolate = !testingTrigger;

					// A scheduled poll can finish after the workflow was removed or
					// reactivated, so drop it if superseded to prevent executing the old version.
					if (!testingTrigger && !isCurrent()) {
						this.logger.debug(`Skipping poll for superseded workflow "${workflow.name}"`, {
							workflowId: workflow.id,
						});
						span.setStatus({ code: SpanStatus.ok });
						return;
					}

					try {
						if (ownsIsolate) await workflow.expression.acquireIsolate();

						const pollResponse = await this.triggersAndPollers.runPollFunction(
							workflow,
							node,
							pollFunctions,
						);

						// Same as the above `isCurrent` check; last chance to check before
						// potentially starting the execution. Emitting now if superseded would run
						// an execution against the old version of the workflow, so drop it.
						// Bailing out here is safe even though `poll()` may have already advanced
						// its state in the in-memory static data: persistence only happens inside
						// `__emit` (`saveStaticData`), so the dropped call leaves the stored state
						// untouched and the newly registered poller re-fetches the same events.
						if (!testingTrigger && !isCurrent()) {
							this.logger.debug(
								`Discarding in-flight poll result for superseded workflow "${workflow.name}"`,
								{ workflowId: workflow.id },
							);
							span.setStatus({ code: SpanStatus.ok });
							return;
						}

						if (pollResponse !== null) {
							pollFunctions.__emit(pollResponse);
						}

						span.setStatus({ code: SpanStatus.ok });
					} catch (error) {
						// If the poll trigger fails in the first activation
						// throw the error back so we let the user know there is
						// an issue with the trigger.
						if (testingTrigger) {
							span.setStatus({ code: SpanStatus.error });
							throw error;
						}

						// Ignore poll errors that are against a superseded workflow
						if (!isCurrent()) {
							this.logger.debug(
								`Ignoring in-flight poll error for superseded workflow "${workflow.name}"`,
								{ workflowId: workflow.id },
							);
							span.setStatus({ code: SpanStatus.ok });
							return;
						}

						span.setStatus({ code: SpanStatus.error });
						pollFunctions.__emitError(error as Error);
					} finally {
						if (ownsIsolate) await workflow.expression.releaseIsolate();
					}
				},
			);
		};
	}
}
