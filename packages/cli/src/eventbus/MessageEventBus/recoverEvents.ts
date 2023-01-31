import { parse, stringify } from 'flatted';
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';
import { NodeOperationError, WorkflowOperationError } from 'n8n-workflow';
import * as Db from '@/Db';
import type { EventMessageTypes, EventNamesTypes } from '../EventMessageClasses';
import type { DateTime } from 'luxon';

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
		let executionData: IRunExecutionData | undefined;
		let workflowError: WorkflowOperationError | undefined;
		try {
			executionData = parse(executionEntry.data) as IRunExecutionData;
		} catch {}
		if (!executionData) {
			executionData = { resultData: { runData: {} } };
		}
		let nodeNames: string[] = [];
		if (
			executionData?.resultData?.runData &&
			Object.keys(executionData.resultData.runData).length > 0
		) {
			nodeNames = Object.keys(executionData.resultData.runData);
		} else {
			if (!executionData.resultData) {
				executionData.resultData = {
					runData: {},
				};
			} else {
				if (!executionData.resultData.runData) {
					executionData.resultData.runData = {};
				}
			}
			nodeNames = executionEntry.workflowData.nodes.map((n) => n.name);
		}

		let lastNodeRunTimestamp: DateTime | undefined = undefined;

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

			const taskData: ITaskData = {
				startTime: nodeStartedMessage ? nodeStartedMessage.ts.toUnixInteger() : 0,
				executionTime,
				source: [null],
				executionStatus: 'unknown',
			};

			if (nodeStartedMessage && !nodeFinishedMessage) {
				const nodeError = new NodeOperationError(
					nodeByName,
					'Node crashed, possible out-of-memory issue',
					{
						message: 'Node crashed',
						description: 'possible out-of-memory issue',
					},
				);
				workflowError = new WorkflowOperationError(
					'Workflow did not finish, possible out-of-memory issue',
				);
				taskData.error = nodeError;
				taskData.executionStatus = 'crashed';
				executionData.resultData.lastNodeExecuted = nodeName;
				if (nodeStartedMessage) lastNodeRunTimestamp = nodeStartedMessage.ts;
			} else if (nodeStartedMessage && nodeFinishedMessage) {
				taskData.executionStatus = 'success';
			}

			executionData.resultData.runData[nodeName] = [taskData];
		}

		if (!executionData.resultData.error && workflowError) {
			executionData.resultData.error = workflowError;
		}
		if (!lastNodeRunTimestamp) {
			const workflowEndedMessage = messages.find((message) =>
				(
					[
						'n8n.workflow.success',
						'n8n.workflow.crashed',
						'n8n.workflow.failed',
					] as EventNamesTypes[]
				).includes(message.eventName),
			);
			if (workflowEndedMessage) {
				lastNodeRunTimestamp = workflowEndedMessage.ts;
			} else {
				const workflowStartedMessage = messages.find(
					(message) => message.eventName === 'n8n.workflow.started',
				);
				if (workflowStartedMessage) {
					lastNodeRunTimestamp = workflowStartedMessage.ts;
				}
			}
		}
		if (applyToDb) {
			await Db.collections.Execution.update(executionId, {
				data: stringify(executionData),
				status: 'crashed',
				stoppedAt: lastNodeRunTimestamp?.toJSDate(),
			});
		}
		return executionData;
	}
	return;
}
