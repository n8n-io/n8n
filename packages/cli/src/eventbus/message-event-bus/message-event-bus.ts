import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, IsNull, Not } from '@n8n/typeorm';
import EventEmitter from 'events';
import uniqby from 'lodash/uniqBy';
import { InstanceSettings } from 'n8n-core';
import { existsSync } from 'node:fs';

import { ExecutionRecoveryService } from '../../executions/execution-recovery.service';
import type { EventMessageTypes } from '../event-message-classes/';
import {
	EventMessageAiNode,
	type EventMessageAiNodeOptions,
} from '../event-message-classes/event-message-ai-node';
import type { EventMessageAuditOptions } from '../event-message-classes/event-message-audit';
import { EventMessageAudit } from '../event-message-classes/event-message-audit';
import type { EventMessageConfirmSource } from '../event-message-classes/event-message-confirm';
import type { EventMessageExecutionOptions } from '../event-message-classes/event-message-execution';
import { EventMessageExecution } from '../event-message-classes/event-message-execution';
import type { EventMessageNodeOptions } from '../event-message-classes/event-message-node';
import { EventMessageNode } from '../event-message-classes/event-message-node';
import type { EventMessageQueueOptions } from '../event-message-classes/event-message-queue';
import { EventMessageQueue } from '../event-message-classes/event-message-queue';
import type { EventMessageRunnerOptions } from '../event-message-classes/event-message-runner';
import { EventMessageRunner } from '../event-message-classes/event-message-runner';
import type { EventMessageWorkflowOptions } from '../event-message-classes/event-message-workflow';
import { EventMessageWorkflow } from '../event-message-classes/event-message-workflow';
import { MessageEventBusLogWriter } from '../message-event-bus-writer/message-event-bus-log-writer';
import {
	resolveEventLogPath,
	type EventLogProcessType,
} from '../message-event-bus-writer/resolve-event-log-path';

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all' | 'unfinished';

export interface MessageWithCallback {
	msg: EventMessageTypes;
	confirmCallback: (message: EventMessageTypes, src: EventMessageConfirmSource) => void;
}

export interface MessageEventBusInitializeOptions {
	workerId?: string;
	webhookProcessorId?: string;
}

@Service()
// TODO: Convert to TypedEventEmitter
// eslint-disable-next-line n8n-local-rules/no-type-unsafe-event-emitter
export class MessageEventBus extends EventEmitter {
	private isInitialized = false;

	logWriter: MessageEventBusLogWriter;

	private pushIntervalTimer: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly recoveryService: ExecutionRecoveryService,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {
		super();
	}

	/**
	 * Needs to be called once at startup to set the event bus instance up. Will launch the event log writer and,
	 * if configured to do so, the previously stored event destinations.
	 *
	 * Will check for unsent event messages in the previous log files once at startup and try to re-send them.
	 *
	 * Sets `isInitialized` to `true` once finished.
	 */
	async initialize(options?: MessageEventBusInitializeOptions): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		this.logger.debug('Initializing event bus...');

		this.logger.debug('Initializing event writer');
		const processType: EventLogProcessType = options?.workerId
			? 'worker'
			: options?.webhookProcessorId
				? 'webhook-processor'
				: 'main';

		const resolved = resolveEventLogPath({
			logFullPath: this.globalConfig.eventBus.logWriter.logFullPath,
			logBaseName: this.globalConfig.eventBus.logWriter.logBaseName,
			instanceDir: this.instanceSettings.n8nFolder,
			processType,
		});

		if (this.globalConfig.eventBus.logWriter.logFullPath) {
			this.warnIfDefaultLocationEventLogsCoexist(processType);
		}

		this.logWriter = await MessageEventBusLogWriter.getInstance({
			resolvedPath: { logFullBasePath: resolved.logFullBasePath },
		});

		if (!this.logWriter) {
			this.logger.warn('Could not initialize event writer');
		}

		await this.performStartupRecovery();

		// if configured, run this test every n ms
		if (this.globalConfig.eventBus.checkUnsentInterval > 0) {
			if (this.pushIntervalTimer) {
				clearInterval(this.pushIntervalTimer);
			}
			this.pushIntervalTimer = setInterval(async () => {
				await this.trySendingUnsent();
			}, this.globalConfig.eventBus.checkUnsentInterval);
		}

		this.logger.debug('MessageEventBus initialized');
		this.isInitialized = true;
	}

	private warnIfDefaultLocationEventLogsCoexist(processType: EventLogProcessType): void {
		const { logFullBasePath: defaultBase, logFileName: defaultLogFile } = resolveEventLogPath({
			logFullPath: '',
			logBaseName: this.globalConfig.eventBus.logWriter.logBaseName,
			instanceDir: this.instanceSettings.n8nFolder,
			processType,
		});
		const candidates = [
			defaultLogFile,
			...Array.from(
				{ length: this.globalConfig.eventBus.logWriter.keepLogCount },
				(_, i) => `${defaultBase}-${i + 1}.log`,
			),
		];
		const stale = candidates.filter((p) => existsSync(p));
		if (stale.length > 0) {
			this.logger.warn(
				`N8N_EVENTBUS_LOGWRITER_LOGFULLPATH is set, but event log file(s) at the default location still exist: ${stale.join(', ')}. ` +
					'These files are no longer being written to and may contain unsent events from a previous run. ' +
					'Drain or relocate them as part of the migration.',
			);
		}
	}

	private async trySendingUnsent(msgs?: EventMessageTypes[]) {
		const unsentMessages = msgs ?? (await this.getEventsUnsent());
		if (unsentMessages.length > 0) {
			this.logger.debug(`Found unsent event messages: ${unsentMessages.length}`);
			for (const unsentMsg of unsentMessages) {
				this.logger.debug(`Retrying: ${unsentMsg.id} ${unsentMsg.__type}`);
				this.emitMessageWithCallback('message', unsentMsg);
			}
		}
	}

	async close() {
		this.logger.debug('Shutting down event writer...');
		await this.logWriter?.close();
		this.isInitialized = false;
		this.logger.debug('EventBus shut down.');
	}

	async send(msgs: EventMessageTypes | EventMessageTypes[]) {
		if (!Array.isArray(msgs)) {
			msgs = [msgs];
		}
		for (const msg of msgs) {
			// 1. Write the message to the log file
			this.logWriter?.putMessage(msg);

			// 2. Emit for internal metrics (e.g. Prometheus)
			this.emit('metrics.eventBus.event', msg);

			// 3. Emit for external destinations (e.g. log-streaming to syslog/webhook/sentry).
			//    Returns true if at least one listener is registered, false otherwise.
			const hasDestinationListener = this.emitMessageWithCallback('message', msg);

			// 4. If no external listener is registered (e.g. log-streaming module
			//    not licensed), confirm it immediately to prevent unbounded log accumulation.
			if (!hasDestinationListener) {
				this.confirmMessageDelivered(msg, { id: '0', name: 'eventBus' });
			}
		}
	}

	confirmMessageDelivered(msg: EventMessageTypes, source?: EventMessageConfirmSource) {
		this.logWriter?.confirmMessageSent(msg.id, source);
	}

	private emitMessageWithCallback(eventName: string, msg: EventMessageTypes): boolean {
		const confirmCallback = (message: EventMessageTypes, src: EventMessageConfirmSource) =>
			this.confirmMessageDelivered(message, src);
		return this.emit(eventName, msg, confirmCallback);
	}

	async getEventsAll(): Promise<EventMessageTypes[]> {
		const queryResult = await this.logWriter?.getMessagesAll();
		const filtered = uniqby(queryResult, 'id');
		return filtered;
	}

	async getEventsSent(): Promise<EventMessageTypes[]> {
		const queryResult = await this.logWriter?.getMessagesSent();
		const filtered = uniqby(queryResult, 'id');
		return filtered;
	}

	async getEventsUnsent(): Promise<EventMessageTypes[]> {
		const queryResult = await this.logWriter?.getMessagesUnsent();
		const filtered = uniqby(queryResult, 'id');
		return filtered;
	}

	async getUnfinishedExecutions(): Promise<Record<string, EventMessageTypes[]>> {
		const queryResult = await this.logWriter?.getUnfinishedExecutions();
		return queryResult;
	}

	async getUnsentAndUnfinishedExecutions(): Promise<{
		unsentMessages: EventMessageTypes[];
		unfinishedExecutions: Record<string, EventMessageTypes[] | undefined>;
	}> {
		const queryResult = await this.logWriter?.getUnsentAndUnfinishedExecutions();
		return queryResult;
	}

	/**
	 * This will pull all events for a given execution id from the event log files. Note that this can be a very expensive operation, depending on the number of events and the size of the log files.
	 * @param executionId id to look for
	 * @param logHistory defaults to 1, which means it will look at the current log file AND the previous one.
	 * @returns Array of EventMessageTypes
	 */
	async getEventsByExecutionId(
		executionId: string,
		logHistory?: number,
	): Promise<EventMessageTypes[]> {
		const result = await this.logWriter?.getMessagesByExecutionId(executionId, logHistory);
		return result;
	}
	/**
	 * Convenience Methods
	 */

	async sendAuditEvent(options: EventMessageAuditOptions) {
		await this.send(new EventMessageAudit(options));
	}

	async sendWorkflowEvent(options: EventMessageWorkflowOptions) {
		await this.send(new EventMessageWorkflow(options));
	}

	async sendNodeEvent(options: EventMessageNodeOptions) {
		await this.send(new EventMessageNode(options));
	}

	async sendAiNodeEvent(options: EventMessageAiNodeOptions) {
		await this.send(new EventMessageAiNode(options));
	}

	async sendExecutionEvent(options: EventMessageExecutionOptions) {
		await this.send(new EventMessageExecution(options));
	}

	async sendRunnerEvent(options: EventMessageRunnerOptions) {
		await this.send(new EventMessageRunner(options));
	}

	async sendQueueEvent(options: EventMessageQueueOptions) {
		await this.send(new EventMessageQueue(options));
	}

	/**
	 * Does the following at startup:
	 * - checks for unsent messages in the log files and tries to resend them
	 * - cycles event logs and start the logging to a fresh file
	 * - checks for unfinished executions (executions for which we have events in the log files,
	 *   but no final execution event) and tries to recover them if needed
	 */
	private async performStartupRecovery() {
		this.logger.debug('Checking for unsent event messages');
		const unsentAndUnfinished = await this.getUnsentAndUnfinishedExecutions();
		this.logger.debug(
			`Start logging into ${this.logWriter?.getLogFileName() ?? 'unknown filename'} `,
		);
		this.logWriter?.startLogging();
		await this.send(unsentAndUnfinished.unsentMessages);

		const unfinishedExecutionIds = await this.collectUnfinishedExecutionIds(
			unsentAndUnfinished.unfinishedExecutions,
		);
		if (unfinishedExecutionIds.length === 0) {
			return;
		}

		await this.logActiveWorkflows();

		const recoveryAlreadyAttempted = this.logWriter?.isRecoveryProcessRunning();
		if (recoveryAlreadyAttempted || this.globalConfig.eventBus.crashRecoveryMode === 'simple') {
			await this.executionRepository.markAsCrashed(unfinishedExecutionIds);
			// if we end up here, it means that the previous recovery process did not finish
			// a possible reason would be that recreating the workflow data itself caused e.g an OOM error
			// in that case, we do not want to retry the recovery process, but rather mark the executions as crashed
			if (recoveryAlreadyAttempted)
				this.logger.warn('Skipped recovery process since it previously failed.');
		} else {
			// start actual recovery process and write recovery process flag file
			this.logWriter?.startRecoveryProcess();
			const recoveredIds: string[] = [];
			const crashedWorkflowIds: Set<string> = new Set();

			for (const executionId of unfinishedExecutionIds) {
				const logMessages = unsentAndUnfinished.unfinishedExecutions[executionId];
				const recoveredExecution = await this.recoveryService.recoverFromLogs(
					executionId,
					logMessages ?? [],
				);
				if (recoveredExecution) {
					if (recoveredExecution.status === 'crashed') {
						crashedWorkflowIds.add(recoveredExecution.workflowId);
					}
					recoveredIds.push(executionId);
				}
			}

			if (recoveredIds.length > 0) {
				this.logger.warn(`Found unfinished executions: ${recoveredIds.join(', ')}`);
				this.logger.info('This could be due to a crash of an active workflow or a restart of n8n');
			}

			if (
				this.globalConfig.executions.recovery.workflowDeactivationEnabled &&
				crashedWorkflowIds.size > 0
			) {
				await this.recoveryService.autoDeactivateWorkflowsIfNeeded(crashedWorkflowIds);
			}
		}

		// remove the recovery process flag file
		this.logWriter?.endRecoveryProcess();
	}

	/**
	 * Logs the currently active workflows
	 */
	private async logActiveWorkflows() {
		const activeWorkflows = await this.workflowRepository.find({
			where: { activeVersionId: Not(IsNull()) },
			select: ['id', 'name'],
		});

		if (activeWorkflows.length > 0) {
			this.logger.info('Currently active workflows:');
			for (const workflowData of activeWorkflows) {
				this.logger.info(`   - ${workflowData.name} (ID: ${workflowData.id})`);
			}
		}
	}

	/**
	 * Collects the execution ids of all unfinished executions. This includes all executions
	 * for which we have events in the log files, but no final execution event, as well as
	 * all executions in the database with status 'running' or 'unknown' (if we are not in queue mode).
	 */
	private async collectUnfinishedExecutionIds(
		unfinishedExecutions: Record<string, EventMessageTypes[] | undefined>,
	): Promise<string[]> {
		const unfinishedExecutionIds = Object.keys(unfinishedExecutions);

		// if we are in queue mode, running jobs may still be running on a worker despite the main process
		// crashing, so we can't just mark them as crashed
		if (this.globalConfig.executions.mode === 'queue') {
			return unfinishedExecutionIds;
		}

		const dbUnfinishedExecutions = await this.executionRepository.find({
			where: {
				status: In(['running', 'unknown']),
			},
			select: ['id'],
		});

		return Array.from(
			new Set([...unfinishedExecutionIds, ...dbUnfinishedExecutions.map((e) => e.id)]),
		);
	}
}
