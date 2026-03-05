import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
	RedactableExecution,
} from '@/executions/execution-redaction';
import {
	type ExecutionError,
	type INodeExecutionData,
	type IRedactedErrorInfo,
	type ITaskDataConnections,
	type WorkflowExecuteMode,
	WorkflowSettings,
} from 'n8n-workflow';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const MANUAL_MODES: ReadonlySet<WorkflowExecuteMode> = new Set(['manual']);

/**
 * Service responsible for redacting sensitive data from executions.
 */
@Service()
export class ExecutionRedactionService implements ExecutionRedaction {
	constructor(
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly eventService: EventService,
	) {}

	async init(): Promise<void> {
		this.logger.debug('Initializing ExecutionRedactionService...');
	}

	/**
	 * Thin wrapper around `processExecutions` for single-execution callers.
	 */
	async processExecution(
		execution: RedactableExecution,
		options: ExecutionRedactionOptions,
	): Promise<RedactableExecution> {
		await this.processExecutions([execution], options);
		return execution;
	}

	/**
	 * Processes a list of executions and applies redaction based on the provided options.
	 * Resolves all user reveal permissions in a single DB query regardless of list size.
	 *
	 * @param executions - The executions to process (mutated in place)
	 * @param options - Options for redaction processing
	 */
	async processExecutions(
		executions: RedactableExecution[],
		options: ExecutionRedactionOptions,
	): Promise<void> {
		if (executions.length === 0) return;

		if (options.redactExecutionData === true) {
			// User explicitly wants redacted data — apply to all, but set canReveal correctly.
			// canReveal = policyAllowsReveal OR user has execution:reveal scope.
			// Only query DB for executions where policy doesn't already allow reveal.
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
			for (const execution of executions) {
				const canReveal =
					this.policyAllowsReveal(execution) || revealableIds.has(execution.workflowId);
				this.applyRedaction(execution, 'user_requested', canReveal);
			}
			return;
		}

		if (options.redactExecutionData === false) {
			// User explicitly wants unredacted data — allowed if the policy or scope permits it.
			const needsCheck = executions.filter((e) => !this.policyAllowsReveal(e));
			if (needsCheck.length > 0) {
				const uniqueWorkflowIds = [...new Set(needsCheck.map((e) => e.workflowId))];
				const revealableIds = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
					uniqueWorkflowIds,
					options.user,
					['execution:reveal'],
				);
				for (const execution of needsCheck) {
					if (!revealableIds.has(execution.workflowId)) {
						throw new ForbiddenError();
					}
				}
			}
			// Emit audit event for every execution the caller was permitted to reveal.
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
			return;
		}

		// Default: policy-driven redaction. Skip executions where the policy allows reveal.
		const needsRedaction = executions.filter((e) => !this.policyAllowsReveal(e));
		if (needsRedaction.length === 0) return;

		const uniqueWorkflowIds = [...new Set(needsRedaction.map((e) => e.workflowId))];
		const revealableIds = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			uniqueWorkflowIds,
			options.user,
			['execution:reveal'],
		);
		for (const execution of needsRedaction) {
			this.applyRedaction(
				execution,
				'workflow_redaction_policy',
				revealableIds.has(execution.workflowId),
			);
		}
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

	/**
	 * Mutates execution data in place, replacing all node output json with a
	 * redaction marker and removing binary data. Also sets `execution.data.redactionInfo`
	 * with metadata about the redaction.
	 */
	private applyRedaction(execution: RedactableExecution, reason: string, canReveal: boolean): void {
		const runData = execution.data.resultData.runData;
		if (runData) {
			for (const nodeName of Object.keys(runData)) {
				for (const taskData of runData[nodeName]) {
					if (taskData.data) {
						this.redactConnections(taskData.data, reason);
					}
					if (taskData.inputOverride) {
						this.redactConnections(taskData.inputOverride, reason);
					}
					if (taskData.error) {
						taskData.redactedError = this.redactError(taskData.error);
						delete taskData.error;
					}
				}
			}
		}

		const resultData = execution.data.resultData;
		if (resultData.error) {
			resultData.redactedError = this.redactError(resultData.error);
			delete resultData.error;
		}

		execution.data.redactionInfo = { isRedacted: true, reason, canReveal };
	}

	/** Walks an ITaskDataConnections structure and redacts every data item in place. */
	private redactConnections(connections: ITaskDataConnections, reason: string): void {
		for (const connectionType of Object.keys(connections)) {
			const outputs = connections[connectionType];
			for (const items of outputs) {
				if (items) {
					for (const item of items) {
						this.redactItem(item, reason);
					}
				}
			}
		}
	}

	/**
	 * Redacts all json and binary data from a single node execution data item.
	 */
	private redactItem(item: INodeExecutionData, reason: string): void {
		item.json = {};
		delete item.binary;

		const redactedError = item.error ? this.redactError(item.error) : undefined;
		delete item.error;

		item.redaction = {
			redacted: true,
			reason,
			...(redactedError !== undefined && { error: redactedError }),
		};
	}

	/**
	 * Extracts safe, non-PII technical metadata from any execution error for
	 * inclusion in the redaction marker. Handles both live class instances and
	 * deserialized plain objects (after DB round-trip via flatted.stringify/parse).
	 *
	 * Uses error.name (survives serialization) instead of error.constructor.name
	 * (returns 'Object' for plain objects) and name-based checks instead of
	 * instanceof (fails for plain objects).
	 *
	 * Preserves: error name (type classification), HTTP status code
	 * from NodeApiError (numeric code only, null if absent or unknown).
	 * Omits: message, description, messages[], cause, context, errorResponse
	 * — all of which may contain PII or sensitive credential data.
	 */
	private redactError(error: ExecutionError): IRedactedErrorInfo {
		const result: IRedactedErrorInfo = { type: error.name };
		if (error.name === 'NodeApiError') {
			result.httpCode =
				('httpCode' in error ? (error as { httpCode: string | null }).httpCode : null) ?? null;
		}
		return result;
	}
}
