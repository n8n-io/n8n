import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { EventDestinationsRepository, ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { DeleteResult } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import EventEmitter from 'events';
import uniqby from 'lodash/uniqBy';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSyslogOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import config from '@/config';
import { License } from '@/license';
import { Publisher } from '@/scaling/pubsub/publisher.service';

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
import {
	EventMessageGeneric,
	eventMessageGenericDestinationTestEvent,
} from '../event-message-classes/event-message-generic';
import type { EventMessageNodeOptions } from '../event-message-classes/event-message-node';
import { EventMessageNode } from '../event-message-classes/event-message-node';
import type { EventMessageQueueOptions } from '../event-message-classes/event-message-queue';
import { EventMessageQueue } from '../event-message-classes/event-message-queue';
import type { EventMessageRunnerOptions } from '../event-message-classes/event-message-runner';
import { EventMessageRunner } from '../event-message-classes/event-message-runner';
import type { EventMessageWorkflowOptions } from '../event-message-classes/event-message-workflow';
import { EventMessageWorkflow } from '../event-message-classes/event-message-workflow';
import { messageEventBusDestinationFromDb } from '../message-event-bus-destination/message-event-bus-destination-from-db';
import { MessageEventBusDestinationSyslog } from '../message-event-bus-destination/message-event-bus-destination-syslog.ee';
import type { MessageEventBusDestination } from '../message-event-bus-destination/message-event-bus-destination.ee';
import { MessageEventBusLogWriter } from '../message-event-bus-writer/message-event-bus-log-writer';

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
// TODO: Convert to TypedEventEmitter
// eslint-disable-next-line n8n-local-rules/no-type-unsafe-event-emitter
export class MessageEventBus extends EventEmitter {
	private isInitialized = false;

	logWriter: MessageEventBusLogWriter;

	destinations: {
		[key: string]: MessageEventBusDestination;
	} = {};

	private pushIntervalTimer: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventDestinationsRepository: EventDestinationsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly publisher: Publisher,
		private readonly recoveryService: ExecutionRecoveryService,
		private readonly license: License,
		private readonly globalConfig: GlobalConfig,
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

		// Ensure environment-based syslog destination is created/updated if configured
		await this.ensureEnvSyslogDestination();

		this.logger.debug('Initializing event writer');
		if (options?.workerId) {
			// only add 'worker' to log file name since the ID changes on every start and we
			// would not be able to recover the log files from the previous run not knowing it
			const logBaseName = this.globalConfig.eventBus.logWriter.logBaseName + '-worker';
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
							status: In(['running', 'unknown']),
						},
						select: ['id'],
					})
				).map((e) => e.id);
				unfinishedExecutionIds = Array.from(
					new Set<string>([...unfinishedExecutionIds, ...dbUnfinishedExecutionIds]),
				);
			}

			if (unfinishedExecutionIds.length > 0) {
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

					for (const executionId of unfinishedExecutionIds) {
						const logMesssages = unsentAndUnfinished.unfinishedExecutions[executionId];
						const recoveredExecution = await this.recoveryService.recoverFromLogs(
							executionId,
							logMesssages ?? [],
						);
						if (recoveredExecution) recoveredIds.push(executionId);
					}

					if (recoveredIds.length > 0) {
						this.logger.warn(`Found unfinished executions: ${recoveredIds.join(', ')}`);
						this.logger.info(
							'This could be due to a crash of an active workflow or a restart of n8n',
						);
					}
				}

				// remove the recovery process flag file
				this.logWriter?.endRecoveryProcess();
			}
		}
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

	/**
	 * Creates a syslog destination from environment variables if configured.
	 * Returns the destination options if valid syslog configuration is found, null otherwise.
	 */
	private createSyslogDestinationFromEnv(): MessageEventBusDestinationSyslogOptions | null {
		const syslogConfig = this.globalConfig.eventBus.logWriter.syslog;

		// Check if syslog config exists and is enabled with required configuration
		if (!syslogConfig || !syslogConfig.enabled || !syslogConfig.host.trim()) {
			if (syslogConfig && syslogConfig.enabled && !syslogConfig.host.trim()) {
				this.logger.warn(
					'Syslog destination is enabled but no host specified. Set N8N_EVENTBUS_LOGWRITER_SYSLOG_HOST environment variable.',
				);
			}
			return null;
		}

		// Validate host format (basic check)
		const hostPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-.]{0,61}[a-zA-Z0-9])?$/;
		if (!hostPattern.test(syslogConfig.host)) {
			this.logger.error(
				`Invalid syslog host format: ${syslogConfig.host}. Must be a valid hostname or IP address.`,
			);
			return null;
		}

		// Validate port range (1-65535)
		if (syslogConfig.port < 1 || syslogConfig.port > 65535) {
			this.logger.error(`Invalid syslog port ${syslogConfig.port}. Must be between 1 and 65535.`);
			return null;
		}

		// Validate facility range (0-23)
		if (syslogConfig.facility < 0 || syslogConfig.facility > 23) {
			this.logger.warn(
				`Invalid syslog facility ${syslogConfig.facility}. Must be between 0 and 23. Using default 16.`,
			);
			syslogConfig.facility = 16;
		}

		// Validate protocol
		const validProtocols = ['udp', 'tcp', 'tls'];
		if (!validProtocols.includes(syslogConfig.protocol)) {
			this.logger.error(
				`Invalid syslog protocol ${syslogConfig.protocol}. Must be one of: ${validProtocols.join(', ')}.`,
			);
			return null;
		}

		// Convert TLS to TCP for syslog client compatibility
		const protocol = syslogConfig.protocol === 'tls' ? 'tcp' : syslogConfig.protocol;

		const destinationId = 'env-syslog-destination';
		const syslogOptions: MessageEventBusDestinationSyslogOptions = {
			__type: MessageEventBusDestinationTypeNames.syslog,
			id: destinationId,
			label: `Syslog (${syslogConfig.host}:${syslogConfig.port})`,
			enabled: true,
			subscribedEvents: ['n8n.workflow.success', 'n8n.workflow.failed', 'n8n.audit.user.signedup'], // Default events
			host: syslogConfig.host.trim(),
			port: syslogConfig.port,
			protocol,
			facility: syslogConfig.facility,
			app_name: syslogConfig.appName.trim() || 'n8n',
		};

		return syslogOptions;
	}

	/**
	 * Ensures an environment-based syslog destination exists if configured.
	 * Creates or updates the destination in the database and adds it to the event bus.
	 */
	private async ensureEnvSyslogDestination(): Promise<void> {
		const envSyslogOptions = this.createSyslogDestinationFromEnv();
		if (!envSyslogOptions) {
			return;
		}

		const destinationId = envSyslogOptions.id!;

		// Check if this destination already exists in the database
		const existingDestination = await this.eventDestinationsRepository.findOne({
			where: { id: destinationId },
		});

		try {
			if (existingDestination) {
				// Update existing destination with current environment configuration
				await this.eventDestinationsRepository.update(destinationId, {
					destination: envSyslogOptions,
				});
				this.logger.debug(`Updated environment syslog destination: ${destinationId}`);
			} else {
				// Create new destination in database
				await this.eventDestinationsRepository.insert({
					id: destinationId,
					destination: envSyslogOptions,
				});
				this.logger.debug(`Created environment syslog destination: ${destinationId}`);
			}

			// Create and add the destination to the event bus
			const syslogDestination = new MessageEventBusDestinationSyslog(this, envSyslogOptions);
			await this.addDestination(syslogDestination, false);

			this.logger.info(
				`Environment syslog destination configured: ${envSyslogOptions.host}:${envSyslogOptions.port} (${envSyslogOptions.protocol})`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to create environment syslog destination: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	async addDestination(destination: MessageEventBusDestination, notifyWorkers: boolean = true) {
		await this.removeDestination(destination.getId(), false);
		this.destinations[destination.getId()] = destination;
		this.destinations[destination.getId()].startListening();
		if (notifyWorkers) {
			void this.publisher.publishCommand({ command: 'restart-event-bus' });
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

	async removeDestination(id: string, notifyWorkers: boolean = true) {
		if (Object.keys(this.destinations).includes(id)) {
			await this.destinations[id].close();
			delete this.destinations[id];
		}
		if (notifyWorkers) {
			void this.publisher.publishCommand({ command: 'restart-event-bus' });
		}
	}

	async deleteDestination(id: string): Promise<DeleteResult | undefined> {
		return await this.eventDestinationsRepository.delete({
			id,
		});
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

	@OnPubSubEvent('restart-event-bus')
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
		this.emit('metrics.eventBus.event', msg);

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
			this.license.isLogStreamingEnabled() &&
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
}
