import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { DeleteResult } from '@n8n/typeorm';

import type { MessageEventBusDestinationType } from '@/eventbus/message-event-bus/message-event-bus';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { EventDestinationsRepository } from './database/repositories/event-destination.repository';
import { messageEventBusDestinationFromDb } from './destinations/message-event-bus-destination-from-db';

/**
 * Service to handle all database operations for log streaming destinations.
 * This ensures the message event bus doesn't directly access the database.
 */
@Service()
export class LogStreamingDestinationService {
	constructor(
		private readonly logger: Logger,
		private readonly eventDestinationsRepository: EventDestinationsRepository,
		private readonly eventBus: MessageEventBus,
	) {}

	/**
	 * Load all destinations from database and add them to the event bus
	 */
	async loadDestinationsFromDb(): Promise<void> {
		const savedEventDestinations = await this.eventDestinationsRepository.find({});
		if (savedEventDestinations.length > 0) {
			for (const destinationData of savedEventDestinations) {
				try {
					const destination = messageEventBusDestinationFromDb(this.eventBus, destinationData);
					if (destination) {
						await this.eventBus.addDestination(destination, false);
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
	async saveDestinationToDb(destination: MessageEventBusDestinationType) {
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
	 * Add a destination to the event bus and save to database
	 */
	async addDestination(
		destination: MessageEventBusDestinationType,
		notifyWorkers: boolean = true,
	): Promise<MessageEventBusDestinationType> {
		const addedDestination = await this.eventBus.addDestination(destination, notifyWorkers);
		await this.saveDestinationToDb(addedDestination);
		return addedDestination;
	}

	/**
	 * Remove a destination from the event bus and delete from database
	 */
	async removeDestination(id: string, notifyWorkers: boolean = true): Promise<DeleteResult> {
		await this.eventBus.removeDestination(id, notifyWorkers);
		return await this.deleteDestinationFromDb(id);
	}
}
