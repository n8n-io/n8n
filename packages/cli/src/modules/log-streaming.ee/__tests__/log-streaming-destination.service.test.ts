import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { EventMessageGeneric } from '@/eventbus/event-message-classes/event-message-generic';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { EventDestinationsRepository } from '../database/repositories/event-destination.repository';
import { messageEventBusDestinationFromDb } from '../destinations/message-event-bus-destination-from-db';
import type { MessageEventBusDestinationWebhook } from '../destinations/message-event-bus-destination-webhook.ee';
import { LogStreamingDestinationService } from '../log-streaming-destination.service';

jest.mock('../destinations/message-event-bus-destination-from-db');

describe('LogStreamingDestinationService', () => {
	const logger = mockInstance(Logger);
	const eventDestinationsRepository = mock<EventDestinationsRepository>();
	const eventBus = {
		on: jest.fn(),
		removeListener: jest.fn(),
		confirmSent: jest.fn(),
	} as unknown as MessageEventBus;
	const publisher = mock<Publisher>();

	let service: LogStreamingDestinationService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new LogStreamingDestinationService(
			logger,
			eventDestinationsRepository,
			eventBus,
			publisher,
		);
	});

	// Helper function to create mock destinations
	const createMockDestination = (options: {
		id: string;
		type?: MessageEventBusDestinationTypeNames;
		hasSubscribedToEvent?: boolean;
		receiveFromEventBus?: jest.Mock;
		close?: jest.Mock;
	}): MessageEventBusDestinationWebhook => {
		const {
			id,
			type = MessageEventBusDestinationTypeNames.webhook,
			hasSubscribedToEvent,
			receiveFromEventBus,
			close,
		} = options;

		return mock<MessageEventBusDestinationWebhook>({
			getId: () => id,
			serialize: () => ({ id, __type: type }) as any,
			...(hasSubscribedToEvent !== undefined && {
				hasSubscribedToEvent: jest.fn().mockReturnValue(hasSubscribedToEvent),
			}),
			...(receiveFromEventBus && { receiveFromEventBus }),
			...(close && { close }),
		});
	};

	// Helper function to create database entity objects
	const createDbEntity = (
		id: string,
		type: MessageEventBusDestinationTypeNames = MessageEventBusDestinationTypeNames.webhook,
	) => ({
		id,
		destination: {
			id,
			__type: type,
		},
	});

	describe('loadDestinationsFromDb', () => {
		it('should load destinations from database', async () => {
			const mockDestination = createMockDestination({ id: 'webhook-1' });

			// Mock database returning destination entities
			eventDestinationsRepository.find.mockResolvedValue([createDbEntity('webhook-1')] as any);

			// Mock the messageEventBusDestinationFromDb function to return our mock destination
			const mockedFromDb = jest.mocked(messageEventBusDestinationFromDb);
			mockedFromDb.mockReturnValue(mockDestination);

			// Actually call loadDestinationsFromDb
			await service.loadDestinationsFromDb();

			// Verify destinations were loaded from DB into memory
			const destinations = await service.findDestination();
			expect(destinations).toHaveLength(1);
			expect(destinations[0].id).toBe('webhook-1');
			expect(eventDestinationsRepository.find).toHaveBeenCalledWith({});
			expect(messageEventBusDestinationFromDb).toHaveBeenCalledWith(
				eventBus,
				createDbEntity('webhook-1'),
			);
		});

		it('should handle empty database', async () => {
			eventDestinationsRepository.find.mockResolvedValue([]);

			await service.loadDestinationsFromDb();

			const destinations = await service.findDestination();
			expect(destinations).toHaveLength(0);
		});

		it('should skip invalid destinations', async () => {
			eventDestinationsRepository.find.mockResolvedValue([
				{
					id: 'invalid-1',
					destination: { invalid: 'data' },
				} as any,
			]);

			// Mock the messageEventBusDestinationFromDb to return null for invalid data
			const mockedFromDb = jest.mocked(messageEventBusDestinationFromDb);
			mockedFromDb.mockReturnValue(null);

			await service.loadDestinationsFromDb();

			const destinations = await service.findDestination();
			expect(destinations).toHaveLength(0);
		});
	});

	describe('addDestination', () => {
		it('should add a destination and save to database', async () => {
			const destination = createMockDestination({ id: 'webhook-1' });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			publisher.publishCommand.mockResolvedValue();

			const result = await service.addDestination(destination);

			expect(result).toBe(destination);
			expect(eventDestinationsRepository.upsert).toHaveBeenCalled();
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'restart-event-bus',
			});
		});

		it('should not notify instances when notifyInstances is false', async () => {
			const destination = createMockDestination({ id: 'webhook-1' });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);

			await service.addDestination(destination, false);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('removeDestination', () => {
		it('should remove a destination and delete from database', async () => {
			const destination = createMockDestination({ id: 'webhook-1', close: jest.fn() });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			eventDestinationsRepository.delete.mockResolvedValue({} as any);
			publisher.publishCommand.mockResolvedValue();

			await service.addDestination(destination);
			await service.removeDestination('webhook-1');

			expect(destination.close).toHaveBeenCalled();
			expect(eventDestinationsRepository.delete).toHaveBeenCalledWith({ id: 'webhook-1' });
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'restart-event-bus',
			});
		});

		it('should not notify instances when notifyInstances is false', async () => {
			eventDestinationsRepository.delete.mockResolvedValue({} as any);

			await service.removeDestination('webhook-1', false);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('findDestination', () => {
		it('should find a specific destination by id', async () => {
			const destination1 = createMockDestination({ id: 'webhook-1' });
			const destination2 = createMockDestination({ id: 'webhook-2' });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(destination1);
			await service.addDestination(destination2);

			const result = await service.findDestination('webhook-1');

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('webhook-1');
		});

		it('should return empty array for non-existent destination', async () => {
			const destination = createMockDestination({ id: 'webhook-1' });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(destination);

			const result = await service.findDestination('non-existent');

			expect(result).toHaveLength(0);
		});

		it('should return all destinations when no id is provided', async () => {
			const destination1 = createMockDestination({ id: 'webhook-1' });
			const destination2 = createMockDestination({
				id: 'syslog-1',
				type: MessageEventBusDestinationTypeNames.syslog,
			});

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(destination1);
			await service.addDestination(destination2);

			const result = await service.findDestination();

			expect(result).toHaveLength(2);
		});
	});

	describe('testDestination', () => {
		it('should test a destination successfully', async () => {
			const destination = createMockDestination({
				id: 'webhook-1',
				receiveFromEventBus: jest.fn().mockResolvedValue(true),
			});

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(destination);

			const result = await service.testDestination('webhook-1');

			expect(result).toBe(true);
			expect(destination.receiveFromEventBus).toHaveBeenCalled();
		});

		it('should return false for non-existent destination', async () => {
			const result = await service.testDestination('non-existent');

			expect(result).toBe(false);
		});
	});

	describe('shouldSendMsg', () => {
		it('should return true when destination is subscribed to event', async () => {
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });
			const destination = createMockDestination({ id: 'webhook-1', hasSubscribedToEvent: true });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);

			await service.addDestination(destination);

			const result = service.shouldSendMsg(msg);

			expect(result).toBe(true);
		});

		it('should return false when no destinations exist', () => {
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			const result = service.shouldSendMsg(msg);

			expect(result).toBe(false);
		});
	});

	describe('initialize', () => {
		it('should initialize successfully', async () => {
			await service.initialize();

			// Service should be initialized without errors
			expect(eventBus.on).toHaveBeenCalledWith('message', expect.any(Function));
		});

		it('should not register twice', async () => {
			await service.initialize();
			await service.initialize();

			// Should only register once
			expect(eventBus.on).toHaveBeenCalledTimes(1);
		});
	});

	describe('close', () => {
		it('should close all destinations', async () => {
			const destination = createMockDestination({ id: 'webhook-1', close: jest.fn() });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(destination);
			await service.initialize();
			await service.close();

			expect(destination.close).toHaveBeenCalled();
		});
	});

	describe('restart', () => {
		it('should close, reload, and reinitialize', async () => {
			// Add a destination that we can verify gets closed
			const existingDestination = createMockDestination({ id: 'webhook-1', close: jest.fn() });

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(existingDestination);
			await service.initialize();

			// Verify destination was added
			expect((await service.findDestination()).length).toBe(1);

			// Mock the reload to return a new destination from DB
			const reloadedDestination = createMockDestination({ id: 'webhook-2' });

			eventDestinationsRepository.find.mockResolvedValue([createDbEntity('webhook-2')] as any);

			const mockedFromDb = jest.mocked(messageEventBusDestinationFromDb);
			mockedFromDb.mockReturnValue(reloadedDestination);

			// Restart the service
			await service.restart();

			// Verify close was called on existing destination
			expect(existingDestination.close).toHaveBeenCalled();
			// Verify event bus listener was removed and re-added
			expect(eventBus.removeListener).toHaveBeenCalledWith('message', expect.any(Function));
			expect(eventBus.on).toHaveBeenCalledWith('message', expect.any(Function));
			// Verify loadDestinationsFromDb was called
			expect(eventDestinationsRepository.find).toHaveBeenCalledWith({});
			// Verify new destinations were loaded
			const destinations = await service.findDestination();
			expect(destinations).toHaveLength(1);
			expect(destinations[0].id).toBe('webhook-2');
		});
	});
});
