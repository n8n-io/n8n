import { Logger } from '@n8n/backend-common';
import type { IExecutionDb, User } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	INodeExecutionData,
	ITaskDataConnections,
	WorkflowExecuteMode,
	WorkflowSettings,
} from 'n8n-workflow';

import {
	type ExecutionRedaction,
	type ExecutionRedactionOptions,
} from '@/executions/execution-redaction';
import { userHasScopes } from '@/permissions.ee/check-access';

const MANUAL_MODES: ReadonlySet<WorkflowExecuteMode> = new Set(['manual', 'chat']);

/**
 * Redacts all json and binary data from a single node execution data item.
 * This is the default "full" redaction strategy. Future strategies (field-level,
 * pattern-based) can replace this function without changing the traversal logic.
 */
function redactItem(item: INodeExecutionData): void {
	item.json = {};
	delete item.binary;
	item.redaction = {
		redacted: true,
	};
}

/** Walks an ITaskDataConnections structure and redacts every data item in place. */
function redactConnections(connections: ITaskDataConnections): void {
	for (const connectionType of Object.keys(connections)) {
		const outputs = connections[connectionType];
		for (const items of outputs) {
			if (items) {
				for (const item of items) {
					redactItem(item);
				}
			}
		}
	}
}

@Service()
export class ExecutionRedactionService implements ExecutionRedaction {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async init(): Promise<void> {
		this.logger.debug('ExecutionRedactionService initialized');
	}

	async processExecution(
		execution: IExecutionDb,
		options: ExecutionRedactionOptions,
	): Promise<IExecutionDb> {
		const policy = this.resolvePolicy(execution);

		if (policy === 'none') {
			return execution;
		}

		if (policy === 'non-manual' && MANUAL_MODES.has(execution.mode)) {
			return execution;
		}

		// Execution should be redacted per policy.
		// If user explicitly requests unredacted data, check permissions.
		if (options.redactExecutionData === false) {
			const allowed = await this.canUserReveal(options.user, execution);
			if (allowed) {
				return execution;
			}
		}

		this.applyRedaction(execution);
		return execution;
	}

	/**
	 * Resolves the effective redaction policy for an execution.
	 *
	 * Prefers the policy captured in `runtimeData.redaction` at execution time
	 * (from PR #26239), falls back to `workflowData.settings` for older
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
	 * Mutates execution data in place, replacing all node output json with a
	 * redaction marker and removing binary data.
	 */
	private applyRedaction(execution: IExecutionDb): void {
		const runData = execution.data.resultData.runData;
		if (!runData) return;

		for (const nodeName of Object.keys(runData)) {
			for (const taskData of runData[nodeName]) {
				if (taskData.data) {
					redactConnections(taskData.data);
				}
				if (taskData.inputOverride) {
					redactConnections(taskData.inputOverride);
				}
			}
		}
	}
}
