import { Logger } from '@n8n/backend-common';
import { type IExecutionDb, SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
} from '@/executions/execution-redaction';
import {
	INodeExecutionData,
	ITaskDataConnections,
	WorkflowExecuteMode,
	WorkflowSettings,
} from 'n8n-workflow';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

const MANUAL_MODES: ReadonlySet<WorkflowExecuteMode> = new Set(['manual']);

/**
 * Service responsible for redacting sensitive data from executions.
 * This service acts as a facade and delegates to the redaction module.
 */
@Service()
export class ExecutionRedactionService implements ExecutionRedaction {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/**
	 * Initializes the execution redaction service.
	 * This is a stub implementation that will be extended when the redaction module is fully implemented.
	 */
	async init(): Promise<void> {
		this.logger.debug('Initializing ExecutionRedactionService...');
	}

	/**
	 * Main entry point for redaction logic.
	 * Processes an execution and applies redaction based on the provided options.
	 *
	 * @param execution - The execution to process
	 * @param options - Options for redaction processing
	 * @returns The processed execution (currently returns unmodified execution as stub)
	 */
	async processExecution(
		execution: IExecutionDb,
		options: ExecutionRedactionOptions,
	): Promise<IExecutionDb> {
		if (options.redactExecutionData === true) {
			// user wants redacted data, this is always fine!
			this.applyRedaction(execution, 'user_requested');
		} else if (options.redactExecutionData === false) {
			// user wants unredacted data, lets see if they have the permissions to do so
			const allowed = await this.canUserReveal(options.user, execution);
			if (allowed) {
				return execution;
			} else {
				throw new ForbiddenError();
			}
		} else {
			// this should be the default case, we act based on the policy
			const policy = this.resolvePolicy(execution);

			// The policy is no redaction, so we just return the execution.
			if (policy === 'none') {
				return execution;
			}

			// The policy is to redact, non manual executions, so we return only if the mode is manual
			if (policy === 'non-manual' && MANUAL_MODES.has(execution.mode)) {
				return execution;
			}

			this.applyRedaction(execution, 'workflow_redaction_policy');
		}

		return execution;
	}

	/**
	 * Checks whether a user is allowed to view unredacted execution data.
	 *
	 * Uses the `execution:reveal` scope which is granted to:
	 * - Global owners and admins (via global role)
	 * - Project admins and personal project owners (via project role)
	 *
	 * The check finds all projects containing the workflow and verifies
	 * the user has the scope either globally or in one of those projects.
	 */
	private async canUserReveal(user: User, execution: IExecutionDb): Promise<boolean> {
		const sharedWorkflows = await this.sharedWorkflowRepository.findBy({
			workflowId: execution.workflowId,
		});

		for (const sw of sharedWorkflows) {
			if (await userHasScopes(user, ['execution:reveal'], false, { projectId: sw.projectId })) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Resolves the effective redaction policy for an execution.
	 *
	 * Prefers the policy captured in `runtimeData.redaction` at execution time,
	 * falls back to `workflowData.settings` for older
	 * executions, and defaults to 'none'.
	 */
	private resolvePolicy(execution: IExecutionDb): WorkflowSettings.RedactionPolicy {
		return (
			execution.data.executionData?.runtimeData?.redaction?.policy ??
			execution.workflowData.settings?.redactionPolicy ??
			'none'
		);
	}

	/**
	 * Mutates execution data in place, replacing all node output json with a
	 * redaction marker and removing binary data.
	 */
	private applyRedaction(execution: IExecutionDb, reason: string): void {
		const runData = execution.data.resultData.runData;
		if (!runData) return;

		for (const nodeName of Object.keys(runData)) {
			for (const taskData of runData[nodeName]) {
				if (taskData.data) {
					this.redactConnections(taskData.data, reason);
				}
				if (taskData.inputOverride) {
					this.redactConnections(taskData.inputOverride, reason);
				}
			}
		}
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
	 * This is the default "full" redaction strategy. Future strategies (field-level,
	 * pattern-based) can replace this function without changing the traversal logic.
	 */
	private redactItem(item: INodeExecutionData, reason: string): void {
		item.json = {};
		delete item.binary;
		item.redaction = {
			redacted: true,
			reason,
		};
	}
}
