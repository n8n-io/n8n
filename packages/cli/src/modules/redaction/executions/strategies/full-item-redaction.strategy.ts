import type { INodeExecutionData, ITaskDataConnections } from 'n8n-workflow';

import type { RedactableExecution } from '@/executions/execution-redaction';

import type {
	IExecutionRedactionStrategy,
	RedactionContext,
} from '../execution-redaction.interfaces';

export class FullItemRedactionStrategy implements IExecutionRedactionStrategy {
	readonly name = 'full-item-redaction';

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
			}
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
		item.json = {};
		delete item.binary;
		item.redaction = { redacted: true, reason };
	}
}
