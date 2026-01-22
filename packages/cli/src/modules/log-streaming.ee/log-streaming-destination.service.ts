import { LicenseState, Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { DeleteResult } from '@n8n/typeorm';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import type { EventMessageTypes } from '@/eventbus';
import type { EventMessageConfirmSource } from '@/eventbus/event-message-classes/event-message-confirm';
import {
	EventMessageGeneric,
	eventMessageGenericDestinationTestEvent,
} from '@/eventbus/event-message-classes/event-message-generic';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { EventDestinationsRepository } from './database/repositories/event-destination.repository';
import { messageEventBusDestinationFromDb } from './destinations/message-event-bus-destination-from-db';
import { MessageEventBusDestination } from './destinations/message-event-bus-destination.ee';

/**
 * Service to handle all log streaming destination operations including:
 * - Database persistence
 * - Destination lifecycle management
 * - Event forwarding from event bus to destinations
 */
@Service()
export class LogStreamingDestinationService {
	private destinations: { [key: string]: MessageEventBusDestination } = {};

	private isListening = false;

	private readonly messageHandler: (
		msg: EventMessageTypes,
		confirmCallback: (message: EventMessageTypes, src: EventMessageConfirmSource) => void,
	) => Promise<void>;

	constructor(
		private readonly logger: Logger,
		private readonly eventDestinationsRepository: EventDestinationsRepository,
		private readonly eventBus: MessageEventBus,
		private readonly licenseState: LicenseState,
		private readonly publisher: Publisher,
	) {
		this.messageHandler = this.handleMessage.bind(this);
	}

	/**
	 * Load all destinations from database and add them to the local destinations map
	 */
	async loadDestinationsFromDb(): Promise<void> {
		const savedEventDestinations = await this.eventDestinationsRepository.find({});
		if (savedEventDestinations.length > 0) {
			for (const destinationData of savedEventDestinations) {
				try {
					const destination = messageEventBusDestinationFromDb(this.eventBus, destinationData);
					if (destination) {
						this.destinations[destination.getId()] = destination;
						this.logger.debug(`Loaded destination ${destination.getId()} from database`);
					}
				} catch (error) {
					this.logger.debug('Failed to load destination from database', { error });
				}
			}
		}
	}

	/**
	 * Save a destination to the database
	 */
	async saveDestinationToDb(destination: MessageEventBusDestination) {
		const data = {
			id: destination.getId(),
			destination: destination.serialize(),
		};
		const dbResult = await this.eventDestinationsRepository.upsert(data, {
			skipUpdateIfNoValuesChanged: true,
			conflictPaths: ['id'],
		});
		return dbResult;
	}

	/**
	 * Delete a destination from the database
	 */
	async deleteDestinationFromDb(id: string): Promise<DeleteResult> {
		return await this.eventDestinationsRepository.delete({ id });
	}

	/**
	 * Add a destination to the local map and save to database
	 */
	async addDestination(
		destination: MessageEventBusDestination,
		notifyWorkers: boolean = true,
	): Promise<MessageEventBusDestination> {
		// Remove any existing destination with the same ID
		await this.destinations[destination.getId()]?.close();

		// Add to local destinations map
		this.destinations[destination.getId()] = destination;
		this.logger.debug(`Added destination ${destination.getId()}`);

		// Save to database
		await this.saveDestinationToDb(destination);

		// Notify workers to reload destinations
		if (notifyWorkers) {
			void this.publisher.publishCommand({ command: 'restart-event-bus' });
		}

		return destination;
	}

	/**
	 * Remove a destination from the local map and delete from database
	 */
	async removeDestination(id: string, notifyWorkers: boolean = true): Promise<DeleteResult> {
		// Close and remove from local map
		if (this.destinations[id]) {
			await this.destinations[id].close();
			delete this.destinations[id];
			this.logger.debug(`Removed destination ${id}`);
		}

		// Notify workers to reload destinations
		if (notifyWorkers) {
			void this.publisher.publishCommand({ command: 'restart-event-bus' });
		}

		// Delete from database
		return await this.deleteDestinationFromDb(id);
	}

	/**
	 * Initialize the service by registering listener on event bus
	 */
	async initialize(): Promise<void> {
		if (this.isListening) {
			return;
		}

		this.logger.debug('Initializing log streaming destination service...');

		// Register listener for all messages from event bus
		this.eventBus.on('message', this.messageHandler);
		this.isListening = true;

		this.logger.debug(
			`Log streaming destination service initialized with ${Object.keys(this.destinations).length} destinations`,
		);
	}

	/**
	 * Handle messages from event bus and forward to appropriate destinations
	 */
	private async handleMessage(
		msg: EventMessageTypes,
		confirmCallback: (message: EventMessageTypes, src: EventMessageConfirmSource) => void,
	) {
		// If there are no destinations that should receive this message, mark it as sent immediately
		if (!this.shouldSendMsg(msg)) {
			this.eventBus.confirmSent(msg, { id: '0', name: 'eventBus' });
			return;
		}

		for (const destination of Object.values(this.destinations)) {
			if (destination.hasSubscribedToEvent(msg)) {
				try {
					// Call destination with circuit breaker protection
					await destination.sendMessage({ msg, confirmCallback });
				} catch (error) {
					this.logger.error(`Failed to send message to destination ${destination.getId()}`, {
						error,
					});
				}
			}
		}
	}

	/**
	 * Find destination(s) by ID
	 */
	async findDestination(id?: string): Promise<MessageEventBusDestinationOptions[]> {
		const result: MessageEventBusDestinationOptions[] = id
			? this.destinations[id]
				? [this.destinations[id].serialize()]
				: []
			: Object.values(this.destinations).map((dest) => dest.serialize());
		return result.sort((a, b) => (a.__type ?? '').localeCompare(b.__type ?? ''));
	}

	/**
	 * Test a destination by sending a test message
	 * Note: This bypasses the circuit breaker to allow testing even when circuit is open
	 */
	async testDestination(destinationId: string): Promise<boolean> {
		const msg = new EventMessageGeneric({
			eventName: eventMessageGenericDestinationTestEvent,
		});
		const destination = await this.findDestination(destinationId);
		if (destination.length > 0) {
			const sendResult = await this.destinations[destinationId].receiveFromEventBus({
				msg,
				confirmCallback: () => this.eventBus.confirmSent(msg, { id: '0', name: 'eventBus' }),
			});
			return sendResult;
		}
		return false;
	}

	/**
	 * Check if any destination is subscribed to the given event
	 */
	private hasAnyDestinationSubscribedToEvent(msg: EventMessageTypes): boolean {
		return Object.values(this.destinations).some((destination) =>
			destination.hasSubscribedToEvent(msg),
		);
	}

	/**
	 * Determine if a message should be sent to destinations
	 */
	shouldSendMsg(msg: EventMessageTypes): boolean {
		return (
			this.licenseState.isLogStreamingLicensed() &&
			Object.keys(this.destinations).length > 0 &&
			this.hasAnyDestinationSubscribedToEvent(msg)
		);
	}

	/**
	 * Close all destinations
	 */
	async close(): Promise<void> {
		this.logger.debug('Closing log streaming destination service...');

		// Stop listening to event bus
		if (this.isListening) {
			this.eventBus.removeListener('message', this.messageHandler);
			this.isListening = false;
		}

		// Close all destinations
		for (const destination of Object.values(this.destinations)) {
			this.logger.debug(`Closing destination ${destination.getId()}...`);
			await destination.close();
		}

		// Clear destinations map
		this.destinations = {};

		this.logger.debug('Log streaming destination service closed');
	}

	/**
	 * Handle restart event from pubsub
	 */
	@OnPubSubEvent('restart-event-bus')
	async restart() {
		this.logger.debug('Restarting log streaming destination service...');
		await this.close();
		await this.loadDestinationsFromDb();
		await this.initialize();
	}
}
