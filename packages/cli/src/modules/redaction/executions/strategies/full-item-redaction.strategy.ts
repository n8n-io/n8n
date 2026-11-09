import { Service } from '@n8n/di';
import type { INodeExecutionData, ITaskDataConnections } from 'n8n-workflow';
import { redactExecutionError } from 'n8n-workflow';

import type { RedactableExecution } from '@n8n/backend-services';

import type {
	IExecutionRedactionStrategy,
	RedactionContext,
} from '../execution-redaction.interfaces';

@Service()
export class FullItemRedactionStrategy implements IExecutionRedactionStrategy {
	readonly name = 'full-item-redaction';

	requiresRedaction(_execution: RedactableExecution, _context: RedactionContext): boolean {
		// If this strategy is in the pipeline, it always modifies (clears all items).
		return true;
	}

	async apply(execution: RedactableExecution, context: RedactionContext): Promise<void> {
		const runData = execution.data.resultData.runData;
		if (!runData) return;

		const reason = context.enforceDynCredRedaction
			? 'dynamic_credentials'
			: context.enforceCredentialUsabilityRedaction
				? 'credential_inaccessible'
				: context.redactExecutionData === true
					? 'user_requested'
					: context.redactedBySubWorkflow
						? 'sub_workflow_redaction_policy'
						: 'workflow_redaction_policy';

		for (const nodeName of Object.keys(runData)) {
			for (const taskData of runData[nodeName]) {
				if (taskData.data) {
					this.redactConnections(taskData.data, reason);
				}
				if (taskData.inputOverride) {
					this.redactConnections(taskData.inputOverride, reason);
				}
				if (taskData.error) {
					taskData.redactedError = redactExecutionError(taskData.error);
					delete taskData.error;
				}
			}
		}

		const resultData = execution.data.resultData;
		if (resultData.error) {
			resultData.redactedError = redactExecutionError(resultData.error);
			delete resultData.error;
		}

		const executionData = execution.data.executionData;

		if (executionData) {
			for (const executeData of executionData.nodeExecutionStack ?? []) {
				if (executeData.data) {
					this.redactConnections(executeData.data, reason);
				}
			}

			for (const runIndexMap of Object.values(executionData.waitingExecution ?? {})) {
				for (const waitingExecution of Object.values(runIndexMap)) {
					this.redactConnections(waitingExecution, reason);
				}
			}
		}

		execution.data.redactionInfo = {
			...execution.data.redactionInfo,
			isRedacted: true,
			reason,
			canReveal: context.userCanReveal,
			...(reason === 'credential_inaccessible' && {
				credentialIds: [...context.inaccessibleCredentialIds],
			}),
		};
	}

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

	private redactItem(item: INodeExecutionData, reason: string): void {
		const redactedError = item.error ? redactExecutionError(item.error) : undefined;
		delete item.error;
		item.json = {};
		delete item.binary;

		item.redaction = {
			redacted: true,
			reason,
			...(redactedError !== undefined && { error: redactedError }),
		};
	}
}
