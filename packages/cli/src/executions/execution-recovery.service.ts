import Container, { Service } from 'typedi';
import { Push } from '@/push';
import { sleep } from 'n8n-workflow';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { getWorkflowHooksMain } from '@/WorkflowExecuteAdditionalData'; // @TODO: Dependency cycle
import { InternalHooks } from '@/InternalHooks'; // @TODO: Dependency cycle if injected
import type { DateTime } from 'luxon';
import type { IRun, ITaskData } from 'n8n-workflow';
import type { EventMessageTypes } from '../eventbus/EventMessageClasses';
import type { IExecutionResponse } from '@/Interfaces';
import { NodeCrashedError } from '@/errors/node-crashed.error';
import { WorkflowCrashedError } from '@/errors/workflow-crashed.error';
import { ARTIFICIAL_TASK_DATA } from '@/constants';
import { EventSender } from '@/eventbus/event-sender';

/**
 * Service for recovering key properties in executions.
 */
@Service()
export class ExecutionRecoveryService {
	constructor(
		private readonly push: Push,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventSender: EventSender,
	) {}

	/**
	 * Recover key properties of a truncated execution using event logs.
	 */
	async recoverFromLogs(executionId: string, messages: EventMessageTypes[]) {
		const amendedExecution = await this.amend(executionId, messages);

		if (!amendedExecution) return null;

		await this.executionRepository.updateExistingExecution(executionId, amendedExecution);

		await this.runHooks(amendedExecution);

		this.push.once('editorUiConnected', async () => {
			await sleep(1000);
			this.push.broadcast('executionRecovered', { executionId });
		});

		return amendedExecution;
	}

	// ----------------------------------
	//             private
	// ----------------------------------

	/**
	 * Amend `status`, `stoppedAt`, and (if possible) `data` properties of an execution.
	 */
	private async amend(executionId: string, messages: EventMessageTypes[]) {
		if (messages.length === 0) return await this.amendWithoutLogs(executionId);

		const { nodeMessages, workflowMessages } = this.toRelevantMessages(messages);

		if (nodeMessages.length === 0) return null;

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) return null;

		const runExecutionData = execution.data ?? { resultData: { runData: {} } };

		let lastNodeRunTimestamp: DateTime | undefined;

		for (const node of execution.workflowData.nodes) {
			const nodeStartedMessage = nodeMessages.find(
				(m) => m.payload.nodeName === node.name && m.eventName === 'n8n.node.started',
			);

			if (!nodeStartedMessage) continue;

			const nodeFinishedMessage = nodeMessages.find(
				(m) => m.payload.nodeName === node.name && m.eventName === 'n8n.node.finished',
			);

			const taskData: ITaskData = {
				startTime: nodeStartedMessage.ts.toUnixInteger(),
				executionTime: -1,
				source: [null],
			};

			if (nodeFinishedMessage) {
				taskData.executionStatus = 'success';
				taskData.data ??= ARTIFICIAL_TASK_DATA;
				taskData.executionTime = nodeFinishedMessage.ts.diff(nodeStartedMessage.ts).toMillis();
				lastNodeRunTimestamp = nodeFinishedMessage.ts;
			} else {
				taskData.executionStatus = 'crashed';
				taskData.error = new NodeCrashedError(node);
				taskData.executionTime = 0;
				runExecutionData.resultData.error = new WorkflowCrashedError();
				lastNodeRunTimestamp = nodeStartedMessage.ts;
			}

			runExecutionData.resultData.lastNodeExecuted = node.name;
			runExecutionData.resultData.runData[node.name] = [taskData];
		}

		return {
			...execution,
			status: execution.status === 'error' ? 'error' : 'crashed',
			stoppedAt: this.toStoppedAt(lastNodeRunTimestamp, workflowMessages),
			data: runExecutionData,
		} as IExecutionResponse;
	}

	private async amendWithoutLogs(executionId: string) {
		const exists = await this.executionRepository.exists({ where: { id: executionId } });

		if (!exists) return null;

		await this.executionRepository.markAsCrashed(executionId);

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		return execution ?? null;
	}

	private toRelevantMessages(messages: EventMessageTypes[]) {
		return messages.reduce<{
			nodeMessages: EventMessageTypes[];
			workflowMessages: EventMessageTypes[];
		}>(
			(acc, cur) => {
				if (cur.eventName.startsWith('n8n.node.')) {
					acc.nodeMessages.push(cur);
				} else if (cur.eventName.startsWith('n8n.workflow.')) {
					acc.workflowMessages.push(cur);
				}

				return acc;
			},
			{ nodeMessages: [], workflowMessages: [] },
		);
	}

	private toStoppedAt(timestamp: DateTime | undefined, messages: EventMessageTypes[]) {
		if (timestamp) return timestamp.toJSDate();

		const WORKFLOW_END_EVENTS = new Set([
			'n8n.workflow.success',
			'n8n.workflow.crashed',
			'n8n.workflow.failed',
		]);

		return (
			messages.find((m) => WORKFLOW_END_EVENTS.has(m.eventName)) ??
			messages.find((m) => m.eventName === 'n8n.workflow.started')
		)?.ts.toJSDate();
	}

	private async runHooks(execution: IExecutionResponse) {
		execution.data ??= { resultData: { runData: {} } };

		await Container.get(InternalHooks).onWorkflowPostExecute(execution.id, execution.workflowData, {
			data: execution.data,
			finished: false,
			mode: execution.mode,
			waitTill: execution.waitTill,
			startedAt: execution.startedAt,
			stoppedAt: execution.stoppedAt,
			status: execution.status,
		});
		this.eventSender.emit('workflow-post-execute', {
			workflowId: execution.workflowData.id,
			workflowName: execution.workflowData.name,
			executionId: execution.id,
			success: execution.status === 'success',
			isManual: execution.mode === 'manual',
		});

		const externalHooks = getWorkflowHooksMain(
			{
				userId: '',
				workflowData: execution.workflowData,
				executionMode: execution.mode,
				executionData: execution.data,
				runData: execution.data.resultData.runData,
				retryOf: execution.retryOf,
			},
			execution.id,
		);

		const run: IRun = {
			data: execution.data,
			finished: false,
			mode: execution.mode,
			waitTill: execution.waitTill ?? undefined,
			startedAt: execution.startedAt,
			stoppedAt: execution.stoppedAt,
			status: execution.status,
		};

		await externalHooks.executeHookFunctions('workflowExecuteAfter', [run]);
	}
}
