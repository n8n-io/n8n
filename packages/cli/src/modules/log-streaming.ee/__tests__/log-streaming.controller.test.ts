import type { OutboundHttp } from '@n8n/backend-network';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest, CredentialsEntity, User } from '@n8n/db';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import type { MessageEventBusDestination } from '../destinations/message-event-bus-destination.ee';
import type { LogStreamingDestinationService } from '../log-streaming-destination.service';
import { EventBusController } from '../log-streaming.controller';

describe('EventBusController', () => {
	const eventBus = mock<MessageEventBus>();
	const destinationService = mock<LogStreamingDestinationService>();
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
		logStreamingManagedByEnv: false,
	});
	const outboundHttp = mock<OutboundHttp>();
	const credentialsFinderService = mock<CredentialsFinderService>();

	let controller: EventBusController;

	beforeEach(() => {
		vi.clearAllMocks();
		instanceSettingsLoaderConfig.logStreamingManagedByEnv = false;
		destinationService.findDestination.mockResolvedValue([]);
		controller = new EventBusController(
			eventBus,
			destinationService,
			instanceSettingsLoaderConfig,
			outboundHttp,
			credentialsFinderService,
		);
	});

	describe('getEventNames', () => {
		it('should include MCP event names', async () => {
			const result = await controller.getEventNames();

			expect(result).toEqual(
				expect.arrayContaining([
					'n8n.audit.mcp.oauth.completed',
					'n8n.audit.mcp.tool.called',
					'n8n.audit.mcp.access.updated',
				]),
			);
		});
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

		it('rejects a destination referencing a credential the user cannot access', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			const req = {
				user: mock<User>(),
				body: {
					__type: MessageEventBusDestinationTypeNames.webhook,
					label: 'Test',
					url: 'https://example.com/webhook',
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My cred' } },
				},
			} as unknown as AuthenticatedRequest;

			await expect(controller.postDestination(req)).rejects.toThrow(ForbiddenError);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'cred-1',
				req.user,
				['credential:read'],
			);
			expect(destinationService.addDestination).not.toHaveBeenCalled();
		});

		it('creates a destination when the user can access the referenced credential', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());
			const created = mock<MessageEventBusDestination>();
			created.serialize.mockReturnValue({ id: 'webhook-1' } as MessageEventBusDestinationOptions);
			destinationService.addDestination.mockResolvedValue(created);

			const req = {
				user: mock<User>(),
				body: {
					__type: MessageEventBusDestinationTypeNames.webhook,
					label: 'Test',
					url: 'https://example.com/webhook',
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My cred' } },
				},
			} as unknown as AuthenticatedRequest;

			await controller.postDestination(req);

			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'cred-1',
				req.user,
				['credential:read'],
			);
			expect(destinationService.addDestination).toHaveBeenCalled();
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

		it('rejects testing a destination whose credentials the user cannot access', async () => {
			destinationService.findDestination.mockResolvedValue([
				{
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'x' } },
				} as unknown as MessageEventBusDestinationOptions,
			]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			const req = { user: mock<User>() } as unknown as AuthenticatedRequest;

			await expect(controller.sendTestMessage(req, {}, { id: 'webhook-1' })).rejects.toThrow(
				ForbiddenError,
			);
			expect(destinationService.testDestination).not.toHaveBeenCalled();
		});

		it('tests a destination when the user can access its credentials', async () => {
			destinationService.findDestination.mockResolvedValue([
				{
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'x' } },
				} as unknown as MessageEventBusDestinationOptions,
			]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());
			destinationService.testDestination.mockResolvedValue(true);

			const req = { user: mock<User>() } as unknown as AuthenticatedRequest;
			const result = await controller.sendTestMessage(req, {}, { id: 'webhook-1' });

			expect(result).toBe(true);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'cred-1',
				req.user,
				['credential:read'],
			);
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

	describe('when logStreamingManagedByEnv is true', () => {
		beforeEach(() => {
			instanceSettingsLoaderConfig.logStreamingManagedByEnv = true;
		});

		it('rejects postDestination with ForbiddenError', async () => {
			const req = {
				body: {
					__type: MessageEventBusDestinationTypeNames.webhook,
					label: 'Test',
					url: 'https://example.com/webhook',
				},
			} as unknown as AuthenticatedRequest;

			await expect(controller.postDestination(req)).rejects.toThrow(ForbiddenError);
			expect(destinationService.addDestination).not.toHaveBeenCalled();
		});

		it('rejects deleteDestination with ForbiddenError', async () => {
			const req = mock<AuthenticatedRequest>();

			await expect(controller.deleteDestination(req, {}, { id: 'webhook-1' })).rejects.toThrow(
				ForbiddenError,
			);
			expect(destinationService.removeDestination).not.toHaveBeenCalled();
		});

		it('still allows getDestination', async () => {
			destinationService.findDestination.mockResolvedValue([]);
			const req = mock<AuthenticatedRequest>();

			await expect(controller.getDestination(req, {}, {})).resolves.toEqual([]);
			expect(destinationService.findDestination).toHaveBeenCalled();
		});

		it('still allows sendTestMessage', async () => {
			destinationService.testDestination.mockResolvedValue(true);
			const req = mock<AuthenticatedRequest>();

			await expect(controller.sendTestMessage(req, {}, { id: 'webhook-1' })).resolves.toBe(true);
			expect(destinationService.testDestination).toHaveBeenCalledWith('webhook-1');
		});
	});
});
