import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { WorkflowExecuteMode, WorkflowSettings } from 'n8n-workflow';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
	RedactableExecution,
} from '@/executions/execution-redaction';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type {
	IExecutionRedactionStrategy,
	RedactionContext,
} from './execution-redaction.interfaces';
import { FullItemRedactionStrategy } from './strategies/full-item-redaction.strategy';
import { NodeDefinedFieldRedactionStrategy } from './strategies/node-defined-field-redaction.strategy';

const MANUAL_MODES: ReadonlySet<WorkflowExecuteMode> = new Set(['manual']);

/**
 * Orchestrates the execution redaction pipeline with batch permission resolution.
 *
 * Responsibilities:
 *   1. Resolve `userCanReveal` with a single DB call for any number of executions.
 *   2. Build a `RedactionContext` per execution.
 *   3. Construct the strategy pipeline based on policy and request options.
 *   4. Run each strategy in order; strategies own all data mutations.
 *
 * Policy evaluation and permission checks live here.
 * Data transformation lives in the strategies.
 */
@Service()
export class ExecutionRedactionService implements ExecutionRedaction {
	constructor(
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly eventService: EventService,
		private readonly fullItemRedactionStrategy: FullItemRedactionStrategy,
		private readonly nodeDefinedFieldRedactionStrategy: NodeDefinedFieldRedactionStrategy,
	) {}

	async init(): Promise<void> {
		this.logger.debug('Initializing ExecutionRedactionService...');
	}

	/**
	 * Thin wrapper around `processExecutions` for single-execution callers.
	 *
	 * With `keepOriginal: true`, the original execution is never mutated. Returns
	 * either the original (if no redaction needed) or a structuredClone with
	 * redaction applied. Callers can check referential equality to determine
	 * whether redaction occurred.
	 */
	async processExecution(
		execution: RedactableExecution,
		options: ExecutionRedactionOptions,
	): Promise<RedactableExecution> {
		const executions = [execution];
		await this.processExecutions(executions, options);
		return executions[0];
	}

	/**
	 * Processes a list of executions and applies redaction based on the provided options.
	 * A single DB query resolves reveal permissions for any number of executions on both
	 * the redact and reveal paths.
	 *
	 * @param executions - The executions to process (mutated in place)
	 * @param options - Options for redaction processing
	 */
	async processExecutions(
		executions: RedactableExecution[],
		options: ExecutionRedactionOptions,
	): Promise<void> {
		if (executions.length === 0) return;

		// Single DB call shared by both the reveal and redact paths.
		// Only executions where policy doesn't already grant access need a scope check.
		const needsCheck = executions.filter((e) => !this.policyAllowsReveal(e));
		let revealableIds = new Set<string>();
		if (needsCheck.length > 0) {
			const uniqueWorkflowIds = [...new Set(needsCheck.map((e) => e.workflowId))];
			revealableIds = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
				uniqueWorkflowIds,
				options.user,
				['execution:reveal'],
			);
		}

		// Reveal path: validate all permissions atomically before any processing.
		if (options.redactExecutionData === false) {
			for (const execution of needsCheck) {
				if (!revealableIds.has(execution.workflowId)) {
					// Emit audit event before throwing error
					this.eventService.emit('execution-data-reveal-failure', {
						user: options.user,
						executionId: execution.id ?? '',
						workflowId: execution.workflowId,
						ipAddress: options.ipAddress ?? '',
						userAgent: options.userAgent ?? '',
						redactionPolicy: this.resolvePolicy(execution),
						rejectionReason: 'User lacks execution:reveal scope for this workflow',
					});
					throw new ForbiddenError();
				}
			}
		}

		// Unified pipeline execution. buildPipeline excludes FullItemRedactionStrategy on the
		// reveal path (redactExecutionData === false). NodeDefinedFieldRedactionStrategy
		// always runs — node-declared sensitive fields are never revealable.

		for (let i = 0; i < executions.length; i++) {
			const execution = executions[i];
			const policyAllowsReveal = this.policyAllowsReveal(execution);
			const userCanReveal = policyAllowsReveal || revealableIds.has(execution.workflowId);
			const context: RedactionContext = {
				user: options.user,
				redactExecutionData: options.redactExecutionData,
				userCanReveal,
				memo: new Map(),
			};
			const pipeline = this.buildPipeline(execution, context, policyAllowsReveal);

			let target = execution;
			if (options.keepOriginal) {
				const needsClone = pipeline.some((s) => s.requiresRedaction(execution, context));
				if (!needsClone) continue;
				target = structuredClone(execution);
				executions[i] = target;
			}

			for (const strategy of pipeline) {
				await strategy.apply(target, context);
			}
		}

		// Emit audit events after all executions have been successfully processed.
		if (options.redactExecutionData === false) {
			for (const execution of executions) {
				this.eventService.emit('execution-data-revealed', {
					user: options.user,
					executionId: execution.id ?? '',
					workflowId: execution.workflowId,
					ipAddress: options.ipAddress ?? '',
					userAgent: options.userAgent ?? '',
					redactionPolicy: this.resolvePolicy(execution),
				});
			}
		}
	}

	/**
	 * Constructs the ordered strategy pipeline for this execution.
	 *
	 * - `FullItemRedactionStrategy` is included when items should be cleared:
	 *   explicit redact (`redactExecutionData === true`), policy=all, or
	 *   policy=non-manual on a non-manual execution mode.
	 *   It is never included on the reveal path (`redactExecutionData === false`).
	 * - `NodeDefinedFieldRedactionStrategy` is always appended last — node-declared
	 *   sensitive fields are never revealable.
	 */
	private buildPipeline(
		execution: RedactableExecution,
		context: RedactionContext,
		policyAllowsReveal: boolean,
	): IExecutionRedactionStrategy[] {
		const pipeline: IExecutionRedactionStrategy[] = [];

		const policy = this.resolvePolicy(execution);
		const shouldClearItems =
			context.redactExecutionData !== false &&
			(context.redactExecutionData === true ||
				(!policyAllowsReveal &&
					(policy === 'all' || (policy === 'non-manual' && !MANUAL_MODES.has(execution.mode)))));

		if (shouldClearItems) {
			pipeline.push(this.fullItemRedactionStrategy);
		}

		pipeline.push(this.nodeDefinedFieldRedactionStrategy);

		return pipeline;
	}

	/**
	 * Returns true when the resolved redaction policy inherently allows everyone to access
	 * unredacted data — i.e. the policy would not have redacted the execution in the first
	 * place.  The two cases are:
	 *   - policy === 'none': redaction is completely disabled.
	 *   - policy === 'non-manual' AND the execution mode is manual: manual executions are
	 *     exempt from this policy, so the data is still accessible to all.
	 */
	private policyAllowsReveal(execution: RedactableExecution): boolean {
		const policy = this.resolvePolicy(execution);
		return policy === 'none' || (policy === 'non-manual' && MANUAL_MODES.has(execution.mode));
	}

	/**
	 * Resolves the effective redaction policy for an execution.
	 *
	 * Prefers the policy captured in `runtimeData.redaction` at execution time,
	 * falls back to `workflowData.settings` for older executions, and defaults to 'none'.
	 */
	private resolvePolicy(execution: RedactableExecution): WorkflowSettings.RedactionPolicy {
		return (
			execution.data.executionData?.runtimeData?.redaction?.policy ??
			execution.workflowData.settings?.redactionPolicy ??
			'none'
		);
	}
}
