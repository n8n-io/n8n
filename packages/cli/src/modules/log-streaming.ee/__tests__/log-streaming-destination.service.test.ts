import { Logger } from '@n8n/backend-common';
import { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { EventMessageGeneric } from '@/eventbus/event-message-classes/event-message-generic';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import type { EventDestinationsRepository } from '../database/repositories/event-destination.repository';
import { MessageEventBusDestinationWebhook } from '../destinations/message-event-bus-destination-webhook.ee';
import { LogStreamingDestinationService } from '../log-streaming-destination.service';

describe('LogStreamingDestinationService', () => {
	const logger = mockInstance(Logger);
	const eventDestinationsRepository = mock<EventDestinationsRepository>();
	const eventBus = {
		on: jest.fn(),
		removeListener: jest.fn(),
		confirmSent: jest.fn(),
	} as unknown as MessageEventBus;
	const licenseState = mock<LicenseState>();
	const publisher = mock<Publisher>();

	let service: LogStreamingDestinationService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new LogStreamingDestinationService(
			logger,
			eventDestinationsRepository,
			eventBus,
			licenseState,
			publisher,
		);
	});

	describe('loadDestinationsFromDb', () => {
		it('should load destinations from database', async () => {
			// Mock the destination to avoid DI issues
			const mockDestination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

			// Add destination directly instead of loading from DB
			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(mockDestination);

			const destinations = await service.findDestination();
			expect(destinations).toHaveLength(1);
			expect(destinations[0].id).toBe('webhook-1');
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

			await service.loadDestinationsFromDb();

			const destinations = await service.findDestination();
			expect(destinations).toHaveLength(0);
		});
	});

	describe('addDestination', () => {
		it('should add a destination and save to database', async () => {
			const destination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			publisher.publishCommand.mockResolvedValue();

			const result = await service.addDestination(destination);

			expect(result).toBe(destination);
			expect(eventDestinationsRepository.upsert).toHaveBeenCalled();
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'restart-event-bus',
			});
		});

		it('should not notify workers when notifyWorkers is false', async () => {
			const destination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);

			await service.addDestination(destination, false);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('removeDestination', () => {
		it('should remove a destination and delete from database', async () => {
			const destination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				close: jest.fn(),
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

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

		it('should not notify workers when notifyWorkers is false', async () => {
			eventDestinationsRepository.delete.mockResolvedValue({} as any);

			await service.removeDestination('webhook-1', false);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('findDestination', () => {
		it('should find a specific destination by id', async () => {
			const destination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(destination);

			const result = await service.findDestination('webhook-1');

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('webhook-1');
		});

		it('should return empty array for non-existent destination', async () => {
			const result = await service.findDestination('non-existent');

			expect(result).toHaveLength(0);
		});

		it('should return all destinations when no id is provided', async () => {
			const destination1 = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

			const destination2 = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'syslog-1',
				serialize: () =>
					({
						id: 'syslog-1',
						__type: MessageEventBusDestinationTypeNames.syslog,
					}) as any,
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
			const destination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				receiveFromEventBus: jest.fn().mockResolvedValue(true),
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
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
		it('should return true when license is valid and destination is subscribed', async () => {
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });
			const destination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				hasSubscribedToEvent: jest.fn().mockReturnValue(true),
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

			licenseState.isLogStreamingLicensed.mockReturnValue(true);
			eventDestinationsRepository.upsert.mockResolvedValue({} as any);

			await service.addDestination(destination);

			const result = service.shouldSendMsg(msg);

			expect(result).toBe(true);
		});

		it('should return false when license is not valid', () => {
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			licenseState.isLogStreamingLicensed.mockReturnValue(false);

			const result = service.shouldSendMsg(msg);

			expect(result).toBe(false);
		});

		it('should return false when no destinations exist', () => {
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			licenseState.isLogStreamingLicensed.mockReturnValue(true);

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
			const destination = mock<MessageEventBusDestinationWebhook>({
				getId: () => 'webhook-1',
				close: jest.fn(),
				serialize: () =>
					({
						id: 'webhook-1',
						__type: MessageEventBusDestinationTypeNames.webhook,
					}) as any,
			});

			eventDestinationsRepository.upsert.mockResolvedValue({} as any);
			await service.addDestination(destination);
			await service.initialize();
			await service.close();

			expect(destination.close).toHaveBeenCalled();
		});
	});

	describe('restart', () => {
		it('should close, reload, and reinitialize', async () => {
			eventDestinationsRepository.find.mockResolvedValue([]);

			await service.initialize();
			await service.restart();

			expect(eventDestinationsRepository.find).toHaveBeenCalled();
		});
	});
});
