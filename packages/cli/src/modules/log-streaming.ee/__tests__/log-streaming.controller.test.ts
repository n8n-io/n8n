import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageEventBusDestinationWebhookOptions } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import type { LogStreamingDestinationService } from '../log-streaming-destination.service';
import { EventBusController } from '../log-streaming.controller';

describe('EventBusController', () => {
	const eventBus = mock<MessageEventBus>();
	const destinationService = mock<LogStreamingDestinationService>();

	let controller: EventBusController;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new EventBusController(eventBus, destinationService);
	});

	describe('getDestination', () => {
		it('should get destination by id', async () => {
			const webhookOptions: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				id: 'webhook-1',
				url: 'https://example.com/webhook',
				method: 'POST',
				label: 'Test Webhook',
				enabled: true,
				subscribedEvents: ['n8n.workflow.success'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			destinationService.findDestination.mockResolvedValue([webhookOptions]);

			const req = mock<AuthenticatedRequest>();
			const result = await controller.getDestination(req, {}, { id: 'webhook-1' });

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('webhook-1');
			expect(destinationService.findDestination).toHaveBeenCalledWith('webhook-1');
		});

		it('should get all destinations when no id is provided', async () => {
			const webhookOptions: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				id: 'webhook-1',
				url: 'https://example.com/webhook',
				method: 'POST',
				label: 'Test Webhook',
				enabled: true,
				subscribedEvents: ['n8n.workflow.success'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			destinationService.findDestination.mockResolvedValue([webhookOptions]);

			const req = mock<AuthenticatedRequest>();
			const result = await controller.getDestination(req, {}, {});

			expect(result).toHaveLength(1);
			expect(destinationService.findDestination).toHaveBeenCalledWith(undefined);
		});
	});

	describe('postDestination', () => {
		it('should throw BadRequestError for invalid body', async () => {
			const req = {
				body: { invalid: 'data' },
			} as unknown as AuthenticatedRequest;

			await expect(controller.postDestination(req)).rejects.toThrow(BadRequestError);
		});

		it('should throw BadRequestError for missing required fields', async () => {
			const req = {
				body: {
					__type: MessageEventBusDestinationTypeNames.webhook,
					label: 'Test',
				},
			} as unknown as AuthenticatedRequest;

			await expect(controller.postDestination(req)).rejects.toThrow(BadRequestError);
		});
	});

	describe('sendTestMessage', () => {
		it('should send a test message to destination', async () => {
			destinationService.testDestination.mockResolvedValue(true);

			const req = mock<AuthenticatedRequest>();
			const result = await controller.sendTestMessage(req, {}, { id: 'webhook-1' });

			expect(result).toBe(true);
			expect(destinationService.testDestination).toHaveBeenCalledWith('webhook-1');
		});

		it('should return false when test fails', async () => {
			destinationService.testDestination.mockResolvedValue(false);

			const req = mock<AuthenticatedRequest>();
			const result = await controller.sendTestMessage(req, {}, { id: 'webhook-1' });

			expect(result).toBe(false);
		});
	});

	describe('deleteDestination', () => {
		it('should delete a destination', async () => {
			destinationService.removeDestination.mockResolvedValue({} as any);

			const req = mock<AuthenticatedRequest>();
			await controller.deleteDestination(req, {}, { id: 'webhook-1' });

			expect(destinationService.removeDestination).toHaveBeenCalledWith('webhook-1');
		});
	});
});
