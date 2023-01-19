import { parse, stringify } from 'flatted';
import {
	IRunExecutionData,
	NodeOperationError,
	WorkflowOperationError,
	ITaskData,
} from 'n8n-workflow';
import * as Db from '@/Db';
import { EventMessageTypes } from '../EventMessageClasses';

export async function recoverExecutionDataFromEventLogMessages(
	executionId: string,
	messages: EventMessageTypes[],
	applyToDb = true,
): Promise<IRunExecutionData | undefined> {
	const executionEntry = await Db.collections.Execution.findOne({
		where: {
			id: executionId,
		},
	});

	if (executionEntry && messages) {
		const executionData: IRunExecutionData | undefined = executionEntry?.data
			? (parse(executionEntry.data) as IRunExecutionData)
			: { resultData: { runData: {} } };
		let nodeNames: string[] = [];
		if (
			executionData.resultData?.runData &&
			Object.keys(executionData.resultData.runData).length > 0
		) {
			nodeNames = Object.keys(executionData.resultData.runData);
		} else {
			if (!executionData.resultData) {
				executionData.resultData = {
					runData: {},
				};
			} else {
				executionData.resultData.runData = {};
			}
			nodeNames = executionEntry.workflowData.nodes.map((n) => n.name);
		}

		for (const nodeName of nodeNames) {
			const nodeByName = executionEntry?.workflowData.nodes.find((n) => n.name === nodeName);

			if (!nodeByName) continue;

			if (['n8n-nodes-base.start', 'n8n-nodes-base.manualTrigger'].includes(nodeByName.type))
				continue;

			const nodeStartedMessage = messages.find(
				(message) =>
					message.eventName === 'n8n.node.started' && message.payload.nodeName === nodeName,
			);
			const nodeFinishedMessage = messages.find(
				(message) =>
					message.eventName === 'n8n.node.finished' && message.payload.nodeName === nodeName,
			);

			const executionTime =
				nodeStartedMessage && nodeFinishedMessage
					? nodeFinishedMessage.ts.diff(nodeStartedMessage.ts).toMillis()
					: 0;

			const error = nodeByName
				? new NodeOperationError(nodeByName, 'Node did not finish, possible Out Of Memory issue?')
				: new WorkflowOperationError('Node did not finish, possible Out Of Memory issue?');

			const iRunData: ITaskData = {
				startTime: nodeStartedMessage ? nodeStartedMessage.ts.toUnixInteger() : 0,
				executionTime,
				source: [null],
			};

			if (!nodeFinishedMessage) {
				iRunData.error = error;
				executionData.resultData.lastNodeExecuted = nodeName;
			}

			executionData.resultData.runData[nodeName] = [iRunData];
		}
		if (applyToDb) {
			await Db.collections.Execution.update(executionId, { data: stringify(executionData) });
		}
		return executionData;
	}
	return;
}
