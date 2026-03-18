import { Service } from '@n8n/di';
import type {
	ExecutionError,
	INodeExecutionData,
	IRedactedErrorInfo,
	ITaskDataConnections,
} from 'n8n-workflow';

import type { RedactableExecution } from '@/executions/execution-redaction';

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

		const reason =
			context.redactExecutionData === true ? 'user_requested' : 'workflow_redaction_policy';

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

		const resultData = execution.data.resultData;
		if (resultData.error) {
			resultData.redactedError = this.redactError(resultData.error);
			delete resultData.error;
		}

		execution.data.redactionInfo = {
			...execution.data.redactionInfo,
			isRedacted: true,
			reason,
			canReveal: context.userCanReveal,
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
		const redactedError = item.error ? this.redactError(item.error) : undefined;
		delete item.error;
		item.json = {};
		delete item.binary;

		item.redaction = {
			redacted: true,
			reason,
			...(redactedError !== undefined && { error: redactedError }),
		};
	}

	/**
	 * Extracts safe, non-PII technical metadata from any execution error.
	 * Preserves: error name (type classification), HTTP status code from NodeApiError.
	 * Omits: message, description, cause, context — may contain PII or credential data.
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
