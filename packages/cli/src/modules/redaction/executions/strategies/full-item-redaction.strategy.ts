import { Service } from '@n8n/di';
import type { INodeExecutionData, ITaskDataConnections, ITaskMetadata } from 'n8n-workflow';
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
		// No early return without node runs: the error, highlighted data and stack still need redaction.
		const runData = execution.data.resultData.runData ?? {};

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
				this.redactTaskMetadata(taskData.metadata);
			}
		}

		const resultData = execution.data.resultData;
		if (resultData.error) {
			resultData.redactedError = redactExecutionError(resultData.error);
			delete resultData.error;
		}
		// Highlighted data (`$execution.customData`) holds node payload, e.g. chat input and output.
		delete resultData.metadata;
		if (execution.customData) execution.customData = {};

		const executionData = execution.data.executionData;

		if (executionData) {
			for (const context of Object.values(executionData.contextData ?? {})) {
				delete context.agentInvocations;
			}
			for (const executeData of executionData.nodeExecutionStack ?? []) {
				if (executeData.data) {
					this.redactConnections(executeData.data, reason);
				}
				this.redactTaskMetadata(executeData.metadata);
			}

			for (const taskMetadataList of Object.values(executionData.metadata ?? {})) {
				for (const taskMetadata of taskMetadataList) {
					this.redactTaskMetadata(taskMetadata);
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

	/**
	 * An AI Agent keeps the tool-call arguments, the model reasoning and the request
	 * history in `subNodeExecutionData`. The engine reads it only from the live
	 * execution, so a response does not need it.
	 */
	private redactTaskMetadata(metadata: ITaskMetadata | undefined): void {
		if (metadata) delete metadata.subNodeExecutionData;
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
