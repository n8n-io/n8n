import { LoggerProxy, MessageEventBusDestinationOptions } from 'n8n-workflow';
import type { DeleteResult } from 'typeorm';
import { EventMessageTypes } from '../EventMessageClasses/';
import type { MessageEventBusDestination } from '../MessageEventBusDestination/MessageEventBusDestination.ee';
import { MessageEventBusLogWriter } from '../MessageEventBusWriter/MessageEventBusLogWriter';
import EventEmitter from 'events';
import config from '@/config';
import * as Db from '@/Db';
import {
	messageEventBusDestinationFromDb,
	incrementPrometheusMetric,
} from '../MessageEventBusDestination/Helpers.ee';
import uniqby from 'lodash.uniqby';
import { EventMessageConfirmSource } from '../EventMessageClasses/EventMessageConfirm';
import {
	EventMessageAuditOptions,
	EventMessageAudit,
} from '../EventMessageClasses/EventMessageAudit';
import {
	EventMessageWorkflowOptions,
	EventMessageWorkflow,
} from '../EventMessageClasses/EventMessageWorkflow';
import { isLogStreamingEnabled } from './MessageEventBusHelper';
import { EventMessageNode, EventMessageNodeOptions } from '../EventMessageClasses/EventMessageNode';
import {
	EventMessageGeneric,
	eventMessageGenericDestinationTestEvent,
} from '../EventMessageClasses/EventMessageGeneric';

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all' | 'unfinished';

class MessageEventBus extends EventEmitter {
	private static instance: MessageEventBus;

	isInitialized: boolean;

	logWriter: MessageEventBusLogWriter;

	destinations: {
		[key: string]: MessageEventBusDestination;
	} = {};

	private pushIntervalTimer: NodeJS.Timer;

	constructor() {
		super();
		this.isInitialized = false;
	}

	static getInstance(): MessageEventBus {
		if (!MessageEventBus.instance) {
			MessageEventBus.instance = new MessageEventBus();
		}
		return MessageEventBus.instance;
	}

	/**
	 * Needs to be called once at startup to set the event bus instance up. Will launch the event log writer and,
	 * if configured to do so, the previously stored event destinations.
	 *
	 * Will check for unsent event messages in the previous log files once at startup and try to re-send them.
	 *
	 * Sets `isInitialized` to `true` once finished.
	 */
	async initialize() {
		if (this.isInitialized) {
			return;
		}

		LoggerProxy.debug('Initializing event bus...');

		const savedEventDestinations = await Db.collections.EventDestinations.find({});
		if (savedEventDestinations.length > 0) {
			for (const destinationData of savedEventDestinations) {
				try {
					const destination = messageEventBusDestinationFromDb(destinationData);
					if (destination) {
						await this.addDestination(destination);
					}
				} catch (error) {
					console.log(error);
				}
			}
		}

		LoggerProxy.debug('Initializing event writer');
		this.logWriter = await MessageEventBusLogWriter.getInstance();

		// unsent event check:
		// - find unsent messages in current event log(s)
		// - cycle event logs and start the logging to a fresh file
		// - retry sending events
		LoggerProxy.debug('Checking for unsent event messages');
		const unsentAndUnfinished = await this.getUnsentAndUnfinishedExecutions();
		LoggerProxy.debug(
			`Start logging into ${this.logWriter?.getLogFileName() ?? 'unknown filename'} `,
		);
		this.logWriter?.startLogging();
		await this.send(unsentAndUnfinished.unsentMessages);

		if (unsentAndUnfinished.unfinishedExecutions.size > 0) {
			for (const executionId of unsentAndUnfinished.unfinishedExecutions) {
				LoggerProxy.debug(`Found unfinished execution ${executionId} in event log(s)`);
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

		LoggerProxy.debug('MessageEventBus initialized');
		this.isInitialized = true;
	}

	async addDestination(destination: MessageEventBusDestination) {
		await this.removeDestination(destination.getId());
		this.destinations[destination.getId()] = destination;
		this.destinations[destination.getId()].startListening();
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

	async removeDestination(id: string): Promise<DeleteResult | undefined> {
		let result;
		if (Object.keys(this.destinations).includes(id)) {
			await this.destinations[id].close();
			result = await this.destinations[id].deleteFromDb();
			delete this.destinations[id];
		}
		return result;
	}

	private async trySendingUnsent(msgs?: EventMessageTypes[]) {
		const unsentMessages = msgs ?? (await this.getEventsUnsent());
		if (unsentMessages.length > 0) {
			LoggerProxy.debug(`Found unsent event messages: ${unsentMessages.length}`);
			for (const unsentMsg of unsentMessages) {
				LoggerProxy.debug(`Retrying: ${unsentMsg.id} ${unsentMsg.__type}`);
				await this.emitMessage(unsentMsg);
			}
		}
	}

	async close() {
		LoggerProxy.debug('Shutting down event writer...');
		await this.logWriter?.close();
		for (const destinationName of Object.keys(this.destinations)) {
			LoggerProxy.debug(
				`Shutting down event destination ${this.destinations[destinationName].getId()}...`,
			);
			await this.destinations[destinationName].close();
		}
		LoggerProxy.debug('EventBus shut down.');
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
		const testMessage = new EventMessageGeneric({
			eventName: eventMessageGenericDestinationTestEvent,
		});
		const destination = await this.findDestination(destinationId);
		if (destination.length > 0) {
			const sendResult = await this.destinations[destinationId].receiveFromEventBus(testMessage);
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
		if (config.getEnv('endpoints.metrics.enable')) {
			await incrementPrometheusMetric(msg);
		}

		// generic emit for external modules to capture events
		// this is for internal use ONLY and not for use with custom destinations!
		this.emit('message', msg);

		// LoggerProxy.debug(`Listeners: ${this.eventNames().join(',')}`);

		if (this.shouldSendMsg(msg)) {
			for (const destinationName of Object.keys(this.destinations)) {
				this.emit(this.destinations[destinationName].getId(), msg);
			}
		}
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

	async getUnfinishedExecutions(): Promise<Set<string>> {
		const queryResult = await this.logWriter?.getUnfinishedExecutions();
		return queryResult;
	}

	async getUnsentAndUnfinishedExecutions(): Promise<{
		unsentMessages: EventMessageTypes[];
		unfinishedExecutions: Set<string>;
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
}

export const eventBus = MessageEventBus.getInstance();
