import Container, { Service } from 'typedi';
import { Push } from '@/push';
import { jsonStringify, sleep } from 'n8n-workflow';
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
import { Logger } from '@/Logger';
import config from '@/config';
import { OnShutdown } from '@/decorators/OnShutdown';
import type { QueueRecoverySettings } from './execution.types';
import { OrchestrationService } from '@/services/orchestration.service';
import { EventRelay } from '@/eventbus/event-relay.service';

/**
 * Service for recovering key properties in executions.
 */
@Service()
export class ExecutionRecoveryService {
	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly executionRepository: ExecutionRepository,
		private readonly orchestrationService: OrchestrationService,
		private readonly eventRelay: EventRelay,
	) {}

	/**
	 * @important Requires `OrchestrationService` to be initialized on queue mode.
	 */
	init() {
		if (config.getEnv('executions.mode') === 'regular') return;

		const { isLeader, isMultiMainSetupEnabled } = this.orchestrationService;

		if (isLeader) this.scheduleQueueRecovery();

		if (isMultiMainSetupEnabled) {
			this.orchestrationService.multiMainSetup
				.on('leader-takeover', () => this.scheduleQueueRecovery())
				.on('leader-stepdown', () => this.stopQueueRecovery());
		}
	}

	private readonly queueRecoverySettings: QueueRecoverySettings = {
		batchSize: config.getEnv('executions.queueRecovery.batchSize'),
		waitMs: config.getEnv('executions.queueRecovery.interval') * 60 * 1000,
	};

	private isShuttingDown = false;

	/**
	 * Recover key properties of a truncated execution using event logs.
	 */
	async recoverFromLogs(executionId: string, messages: EventMessageTypes[]) {
		if (this.orchestrationService.isFollower) return;

		const amendedExecution = await this.amend(executionId, messages);

		if (!amendedExecution) return null;

		this.logger.info('[Recovery] Logs available, amended execution', {
			executionId: amendedExecution.id,
		});

		await this.executionRepository.updateExistingExecution(executionId, amendedExecution);

		await this.runHooks(amendedExecution);

		this.push.once('editorUiConnected', async () => {
			await sleep(1000);
			this.push.broadcast('executionRecovered', { executionId });
		});

		return amendedExecution;
	}

	/**
	 * Schedule a cycle to mark dangling executions as crashed in queue mode.
	 */
	scheduleQueueRecovery(waitMs = this.queueRecoverySettings.waitMs) {
		if (!this.shouldScheduleQueueRecovery()) return;

		this.queueRecoverySettings.timeout = setTimeout(async () => {
			try {
				const nextWaitMs = await this.recoverFromQueue();
				this.scheduleQueueRecovery(nextWaitMs);
			} catch (error) {
				const msg = this.toErrorMsg(error);

				this.logger.error('[Recovery] Failed to recover dangling executions from queue', { msg });
				this.logger.error('[Recovery] Retrying...');

				this.scheduleQueueRecovery();
			}
		}, waitMs);

		const wait = [this.queueRecoverySettings.waitMs / (60 * 1000), 'min'].join(' ');

		this.logger.debug(`[Recovery] Scheduled queue recovery check for next ${wait}`);
	}

	stopQueueRecovery() {
		clearTimeout(this.queueRecoverySettings.timeout);
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopQueueRecovery();
	}

	// ----------------------------------
	//             private
	// ----------------------------------

	/**
	 * Mark in-progress executions as `crashed` if stored in DB as `new` or `running`
	 * but absent from the queue. Return time until next recovery cycle.
	 */
	private async recoverFromQueue() {
		const { waitMs, batchSize } = this.queueRecoverySettings;

		const storedIds = await this.executionRepository.getInProgressExecutionIds(batchSize);

		if (storedIds.length === 0) {
			this.logger.debug('[Recovery] Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		const { Queue } = await import('@/Queue');

		const queuedIds = await Container.get(Queue).getInProgressExecutionIds();

		if (queuedIds.size === 0) {
			this.logger.debug('[Recovery] Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		const danglingIds = storedIds.filter((id) => !queuedIds.has(id));

		if (danglingIds.length === 0) {
			this.logger.debug('[Recovery] Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		await this.executionRepository.markAsCrashed(danglingIds);

		this.logger.info('[Recovery] Completed queue recovery check, recovered dangling executions', {
			danglingIds,
		});

		// if this cycle used up the whole batch size, it is possible for there to be
		// dangling executions outside this check, so speed up next cycle

		return storedIds.length >= this.queueRecoverySettings.batchSize ? waitMs / 2 : waitMs;
	}

	/**
	 * Amend `status`, `stoppedAt`, and (if possible) `data` of an execution using event logs.
	 */
	private async amend(executionId: string, messages: EventMessageTypes[]) {
		if (messages.length === 0) return await this.amendWithoutLogs(executionId);

		const { nodeMessages, workflowMessages } = this.toRelevantMessages(messages);

		if (nodeMessages.length === 0) return null;

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution || execution.status === 'success') return null;

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

		this.eventRelay.emit('workflow-post-execute', {
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

	private toErrorMsg(error: unknown) {
		return error instanceof Error
			? error.message
			: jsonStringify(error, { replaceCircularRefs: true });
	}

	private shouldScheduleQueueRecovery() {
		return (
			config.getEnv('executions.mode') === 'queue' &&
			config.getEnv('multiMainSetup.instanceType') === 'leader' &&
			!this.isShuttingDown
		);
	}
}
