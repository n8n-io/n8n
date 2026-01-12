import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { DeleteResult } from '@n8n/typeorm';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import type { MessageEventBusDestination } from '@/eventbus/message-event-bus/message-event-bus';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { messageEventBusDestinationFromDb } from './destinations/message-event-bus-destination-from-db';
import { EventDestinationsRepository } from './database/repositories/event-destination.repository';

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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if (error.message) this.logger.debug(error.message as string);
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
	 * Find destinations - returns serialized options from in-memory destinations
	 */
	async findDestination(id?: string): Promise<MessageEventBusDestinationOptions[]> {
		return await this.eventBus.findDestination(id);
	}

	/**
	 * Add a destination to the event bus and save to database
	 */
	async addDestination(
		destination: MessageEventBusDestination,
		notifyWorkers: boolean = true,
	): Promise<MessageEventBusDestination> {
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

	/**
	 * Test a destination by sending a test message
	 */
	async testDestination(id: string): Promise<boolean> {
		return await this.eventBus.testDestination(id);
	}
}
