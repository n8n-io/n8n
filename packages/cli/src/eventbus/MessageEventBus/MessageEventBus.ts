import { Service } from 'typedi';
import type { DeleteResult } from '@n8n/typeorm';
import { In } from '@n8n/typeorm';
import EventEmitter from 'events';
import uniqby from 'lodash/uniqBy';
import { jsonParse } from 'n8n-workflow';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import config from '@/config';
import { EventDestinationsRepository } from '@db/repositories/eventDestinations.repository';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { OrchestrationService } from '@/services/orchestration.service';
import { Logger } from '@/Logger';

import type { EventMessageTypes } from '../EventMessageClasses/';
import type { MessageEventBusDestination } from '../MessageEventBusDestination/MessageEventBusDestination.ee';
import { MessageEventBusLogWriter } from '../MessageEventBusWriter/MessageEventBusLogWriter';
import { messageEventBusDestinationFromDb } from '../MessageEventBusDestination/MessageEventBusDestinationFromDb';
import type { EventMessageConfirmSource } from '../EventMessageClasses/EventMessageConfirm';
import type { EventMessageAuditOptions } from '../EventMessageClasses/EventMessageAudit';
import { EventMessageAudit } from '../EventMessageClasses/EventMessageAudit';
import type { EventMessageWorkflowOptions } from '../EventMessageClasses/EventMessageWorkflow';
import { EventMessageWorkflow } from '../EventMessageClasses/EventMessageWorkflow';
import { isLogStreamingEnabled } from './MessageEventBusHelper';
import type { EventMessageNodeOptions } from '../EventMessageClasses/EventMessageNode';
import { EventMessageNode } from '../EventMessageClasses/EventMessageNode';
import {
	EventMessageGeneric,
	eventMessageGenericDestinationTestEvent,
} from '../EventMessageClasses/EventMessageGeneric';
import { METRICS_EVENT_NAME } from '../MessageEventBusDestination/Helpers.ee';
import type { AbstractEventMessageOptions } from '../EventMessageClasses/AbstractEventMessageOptions';
import { getEventMessageObjectByType } from '../EventMessageClasses/Helpers';
import { ExecutionDataRecoveryService } from '../executionDataRecovery.service';
import {
	EventMessageAiNode,
	type EventMessageAiNodeOptions,
} from '../EventMessageClasses/EventMessageAiNode';

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all' | 'unfinished';

export interface MessageWithCallback {
	msg: EventMessageTypes;
	confirmCallback: (message: EventMessageTypes, src: EventMessageConfirmSource) => void;
}

export interface MessageEventBusInitializeOptions {
	skipRecoveryPass?: boolean;
	workerId?: string;
}

@Service()
export class MessageEventBus extends EventEmitter {
	private isInitialized = false;

	logWriter: MessageEventBusLogWriter;

	destinations: {
		[key: string]: MessageEventBusDestination;
	} = {};

	private pushIntervalTimer: NodeJS.Timer;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventDestinationsRepository: EventDestinationsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly orchestrationService: OrchestrationService,
		private readonly recoveryService: ExecutionDataRecoveryService,
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
	// eslint-disable-next-line complexity
	async initialize(options?: MessageEventBusInitializeOptions): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		this.logger.debug('Initializing event bus...');

		const savedEventDestinations = await this.eventDestinationsRepository.find({});
		if (savedEventDestinations.length > 0) {
			for (const destinationData of savedEventDestinations) {
				try {
					const destination = messageEventBusDestinationFromDb(this, destinationData);
					if (destination) {
						await this.addDestination(destination, false);
					}
				} catch (error) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if (error.message) this.logger.debug(error.message as string);
				}
			}
		}

		this.logger.debug('Initializing event writer');
		if (options?.workerId) {
			// only add 'worker' to log file name since the ID changes on every start and we
			// would not be able to recover the log files from the previous run not knowing it
			const logBaseName = config.getEnv('eventBus.logWriter.logBaseName') + '-worker';
			this.logWriter = await MessageEventBusLogWriter.getInstance({
				logBaseName,
			});
		} else {
			this.logWriter = await MessageEventBusLogWriter.getInstance();
		}

		if (!this.logWriter) {
			this.logger.warn('Could not initialize event writer');
		}

		if (options?.skipRecoveryPass) {
			this.logger.debug('Skipping unsent event check');
		} else {
			// unsent event check:
			// - find unsent messages in current event log(s)
			// - cycle event logs and start the logging to a fresh file
			// - retry sending events
			this.logger.debug('Checking for unsent event messages');
			const unsentAndUnfinished = await this.getUnsentAndUnfinishedExecutions();
			this.logger.debug(
				`Start logging into ${this.logWriter?.getLogFileName() ?? 'unknown filename'} `,
			);
			this.logWriter?.startLogging();
			await this.send(unsentAndUnfinished.unsentMessages);

			let unfinishedExecutionIds = Object.keys(unsentAndUnfinished.unfinishedExecutions);

			// if we are in queue mode, running jobs may still be running on a worker despite the main process
			// crashing, so we can't just mark them as crashed
			if (config.get('executions.mode') !== 'queue') {
				const dbUnfinishedExecutionIds = (
					await this.executionRepository.find({
						where: {
							status: In(['running', 'new', 'unknown']),
						},
						select: ['id'],
					})
				).map((e) => e.id);
				unfinishedExecutionIds = Array.from(
					new Set<string>([...unfinishedExecutionIds, ...dbUnfinishedExecutionIds]),
				);
			}

			if (unfinishedExecutionIds.length > 0) {
				this.logger.warn(`Found unfinished executions: ${unfinishedExecutionIds.join(', ')}`);
				this.logger.info('This could be due to a crash of an active workflow or a restart of n8n.');
				const activeWorkflows = await this.workflowRepository.find({
					where: { active: true },
					select: ['id', 'name'],
				});
				if (activeWorkflows.length > 0) {
					this.logger.info('Currently active workflows:');
					for (const workflowData of activeWorkflows) {
						this.logger.info(`   - ${workflowData.name} (ID: ${workflowData.id})`);
					}
				}
				const recoveryAlreadyAttempted = this.logWriter?.isRecoveryProcessRunning();
				if (recoveryAlreadyAttempted || config.getEnv('eventBus.crashRecoveryMode') === 'simple') {
					await this.executionRepository.markAsCrashed(unfinishedExecutionIds);
					// if we end up here, it means that the previous recovery process did not finish
					// a possible reason would be that recreating the workflow data itself caused e.g an OOM error
					// in that case, we do not want to retry the recovery process, but rather mark the executions as crashed
					if (recoveryAlreadyAttempted)
						this.logger.warn('Skipped recovery process since it previously failed.');
				} else {
					// start actual recovery process and write recovery process flag file
					this.logWriter?.startRecoveryProcess();
					for (const executionId of unfinishedExecutionIds) {
						this.logger.warn(`Attempting to recover execution ${executionId}`);
						if (!unsentAndUnfinished.unfinishedExecutions[executionId]?.length) {
							this.logger.debug(
								`No event messages found, marking execution ${executionId} as 'crashed'`,
							);
							await this.executionRepository.markAsCrashed([executionId]);
						} else {
							await this.recoveryService.recoverExecutionData(
								executionId,
								unsentAndUnfinished.unfinishedExecutions[executionId],
								true,
							);
						}
					}
				}
				// remove the recovery process flag file
				this.logWriter?.endRecoveryProcess();
			}
		}
		// if configured, run this test every n ms
		if (config.getEnv('eventBus.checkUnsentInterval') > 0) {
			if (this.pushIntervalTimer) {
				clearInterval(this.pushIntervalTimer);
			}
			this.pushIntervalTimer = setInterval(async () => {
				await this.trySendingUnsent();
			}, config.getEnv('eventBus.checkUnsentInterval'));
		}

		this.logger.debug('MessageEventBus initialized');
		this.isInitialized = true;
	}

	async addDestination(destination: MessageEventBusDestination, notifyWorkers: boolean = true) {
		await this.removeDestination(destination.getId(), false);
		this.destinations[destination.getId()] = destination;
		this.destinations[destination.getId()].startListening();
		if (notifyWorkers) {
			await this.orchestrationService.publish('restartEventBus');
		}
		return destination;
	}

	async findDestination(id?: string): Promise<MessageEventBusDestinationOptions[]> {
		let result: MessageEventBusDestinationOptions[];
		if (id && Object.keys(this.destinations).includes(id)) {
			result = [this.destinations[id].serialize()];
		} else {
			result = Object.keys(this.destinations).map((e) => this.destinations[e].serialize());
		}
		return result.sort((a, b) => (a.__type ?? '').localeCompare(b.__type ?? ''));
	}

	async removeDestination(
		id: string,
		notifyWorkers: boolean = true,
	): Promise<DeleteResult | undefined> {
		let result;
		if (Object.keys(this.destinations).includes(id)) {
			await this.destinations[id].close();
			result = await this.destinations[id].deleteFromDb();
			delete this.destinations[id];
		}
		if (notifyWorkers) {
			await this.orchestrationService.publish('restartEventBus');
		}
		return result;
	}

	async handleRedisEventBusMessage(messageString: string) {
		const eventData = jsonParse<AbstractEventMessageOptions>(messageString);
		if (eventData) {
			const eventMessage = getEventMessageObjectByType(eventData);
			if (eventMessage) {
				await this.send(eventMessage);
			}
		}
		return eventData;
	}

	private async trySendingUnsent(msgs?: EventMessageTypes[]) {
		const unsentMessages = msgs ?? (await this.getEventsUnsent());
		if (unsentMessages.length > 0) {
			this.logger.debug(`Found unsent event messages: ${unsentMessages.length}`);
			for (const unsentMsg of unsentMessages) {
				this.logger.debug(`Retrying: ${unsentMsg.id} ${unsentMsg.__type}`);
				await this.emitMessage(unsentMsg);
			}
		}
	}

	async close() {
		this.logger.debug('Shutting down event writer...');
		await this.logWriter?.close();
		for (const destinationName of Object.keys(this.destinations)) {
			this.logger.debug(
				`Shutting down event destination ${this.destinations[destinationName].getId()}...`,
			);
			await this.destinations[destinationName].close();
		}
		this.isInitialized = false;
		this.logger.debug('EventBus shut down.');
	}

	async restart() {
		await this.close();
		await this.initialize({ skipRecoveryPass: true });
	}

	async send(msgs: EventMessageTypes | EventMessageTypes[]) {
		if (!Array.isArray(msgs)) {
			msgs = [msgs];
		}
		for (const msg of msgs) {
			this.logWriter?.putMessage(msg);
			// if there are no set up destinations, immediately mark the event as sent
			if (!this.shouldSendMsg(msg)) {
				this.confirmSent(msg, { id: '0', name: 'eventBus' });
			}
			await this.emitMessage(msg);
		}
	}

	async testDestination(destinationId: string): Promise<boolean> {
		const msg = new EventMessageGeneric({
			eventName: eventMessageGenericDestinationTestEvent,
		});
		const destination = await this.findDestination(destinationId);
		if (destination.length > 0) {
			const sendResult = await this.destinations[destinationId].receiveFromEventBus({
				msg,
				confirmCallback: () => this.confirmSent(msg, { id: '0', name: 'eventBus' }),
			});
			return sendResult;
		}
		return false;
	}

	confirmSent(msg: EventMessageTypes, source?: EventMessageConfirmSource) {
		this.logWriter?.confirmMessageSent(msg.id, source);
	}

	private hasAnyDestinationSubscribedToEvent(msg: EventMessageTypes): boolean {
		for (const destinationName of Object.keys(this.destinations)) {
			if (this.destinations[destinationName].hasSubscribedToEvent(msg)) {
				return true;
			}
		}
		return false;
	}

	private async emitMessage(msg: EventMessageTypes) {
		this.emit(METRICS_EVENT_NAME, msg);

		// generic emit for external modules to capture events
		// this is for internal use ONLY and not for use with custom destinations!
		this.emitMessageWithCallback('message', msg);

		if (this.shouldSendMsg(msg)) {
			for (const destinationName of Object.keys(this.destinations)) {
				this.emitMessageWithCallback(this.destinations[destinationName].getId(), msg);
			}
		}
	}

	private emitMessageWithCallback(eventName: string, msg: EventMessageTypes): boolean {
		const confirmCallback = (message: EventMessageTypes, src: EventMessageConfirmSource) =>
			this.confirmSent(message, src);
		return this.emit(eventName, msg, confirmCallback);
	}

	shouldSendMsg(msg: EventMessageTypes): boolean {
		return (
			isLogStreamingEnabled() &&
			Object.keys(this.destinations).length > 0 &&
			this.hasAnyDestinationSubscribedToEvent(msg)
		);
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
		unfinishedExecutions: Record<string, EventMessageTypes[]>;
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
}
