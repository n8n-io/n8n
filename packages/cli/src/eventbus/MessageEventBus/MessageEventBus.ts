import { LoggerProxy, MessageEventBusDestinationOptions } from 'n8n-workflow';
import { DeleteResult } from 'typeorm';
import { EventMessageTypes } from '../EventMessageClasses/';
import type { MessageEventBusDestination } from '../MessageEventBusDestination/MessageEventBusDestination.ee';
import { MessageEventBusLogWriter } from '../MessageEventBusWriter/MessageEventBusLogWriter';
import EventEmitter from 'events';
import config from '@/config';
import * as Db from '@/Db';
import { messageEventBusDestinationFromDb } from '../MessageEventBusDestination/Helpers.ee';
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

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all';

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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
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
		const unsentMessages = await this.getEventsUnsent();
		LoggerProxy.debug(
			`Start logging into ${
				(await this.logWriter?.getThread()?.getLogFileName()) ?? 'unknown filename'
			} `,
		);
		await this.logWriter?.startLogging();
		await this.send(unsentMessages);

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
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			result = Object.keys(this.destinations).map((e) => this.destinations[e].serialize());
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
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
			await this.logWriter?.putMessage(msg);
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

	async confirmSent(msg: EventMessageTypes, source?: EventMessageConfirmSource) {
		await this.logWriter?.confirmMessageSent(msg.id, source);
	}

	private async emitMessage(msg: EventMessageTypes) {
		// generic emit for external modules to capture events
		// this is for internal use ONLY and not for use with custom destinations!
		this.emit('message', msg);

		LoggerProxy.debug(`Listeners: ${this.eventNames().join(',')}`);

		// if there are no set up destinations, immediately mark the event as sent
		if (!isLogStreamingEnabled() || Object.keys(this.destinations).length === 0) {
			await this.confirmSent(msg, { id: '0', name: 'eventBus' });
		} else {
			for (const destinationName of Object.keys(this.destinations)) {
				this.emit(this.destinations[destinationName].getId(), msg);
			}
		}
	}

	async getEvents(mode: EventMessageReturnMode = 'all'): Promise<EventMessageTypes[]> {
		let queryResult: EventMessageTypes[];
		switch (mode) {
			case 'all':
				queryResult = await this.logWriter?.getMessages();
				break;
			case 'sent':
				queryResult = await this.logWriter?.getMessagesSent();
				break;
			case 'unsent':
				queryResult = await this.logWriter?.getMessagesUnsent();
		}
		const filtered = uniqby(queryResult, 'id');
		return filtered;
	}

	async getEventsSent(): Promise<EventMessageTypes[]> {
		const sentMessages = await this.getEvents('sent');
		return sentMessages;
	}

	async getEventsUnsent(): Promise<EventMessageTypes[]> {
		const unSentMessages = await this.getEvents('unsent');
		return unSentMessages;
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
