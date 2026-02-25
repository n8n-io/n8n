import type { Logger } from '@n8n/backend-common';
import type { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { ChatHubCredentialsService } from '../chat-hub-credentials.service';
import type { ChatHubAuthenticationMetadata } from '../chat-hub-extractor';
import type { ChatHubToolService } from '../chat-hub-tool.service';
import { ChatHubMessage } from '../chat-hub-message.entity';
import { ChatHubSession } from '../chat-hub-session.entity';
import { ChatHubWorkflowService } from '../chat-hub-workflow.service';
import type { ChatHubSettingsService } from '../chat-hub.settings.service';

describe('ChatHubWorkflowService', () => {
	const logger = mock<Logger>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const messageRepository = mock<ChatHubMessageRepository>();
	const chatHubAgentService = mock<ChatHubAgentService>();
	const chatHubSettingsService = mock<ChatHubSettingsService>();
	const chatHubCredentialsService = mock<ChatHubCredentialsService>();
	const chatHubToolService = mock<ChatHubToolService>();
	const workflowFinderService = mock<WorkflowFinderService>();

	const mockCipher = mock<Cipher>();

	let service: ChatHubWorkflowService;

	const defaultExecutionMetadata: ChatHubAuthenticationMetadata = {
		authToken: 'test-token-123',
		browserId: 'browser-456',
		method: 'POST',
		endpoint: '/api/chat/message',
	};

	beforeEach(() => {
		jest.resetAllMocks();

		logger.scoped.mockReturnValue(logger);

		// Mock cipher encrypt to return a simple string
		mockCipher.encrypt.mockReturnValue('encrypted-metadata');

		const settingsService = mock<ChatHubSettingsService>();
		const credentialsService = mock<ChatHubCredentialsService>();

		service = new ChatHubWorkflowService(
			logger,
			workflowRepository,
			sharedWorkflowRepository,
			settingsService,
			credentialsService,
			chatHubAttachmentService,
			chatHubAgentService,
			chatHubSettingsService,
			chatHubCredentialsService,
			chatHubToolService,
			workflowFinderService,
			mockCipher,
		);

		// Mock repository methods
		const mockEntityManager = {
			save: jest.fn().mockImplementation(async (entity) => {
				// Return the entity with an ID added
				return { ...entity, id: 'workflow-123' };
			}),
		} as any;

		Object.defineProperty(workflowRepository, 'manager', {
			value: {
				transaction: jest.fn((cb) => cb(mockEntityManager)),
			},
			writable: true,
		});

		(sharedWorkflowRepository.create as jest.Mock) = jest.fn().mockReturnValue({});
	});

	describe('prepareExecutionData', () => {
		it('should encrypt executionMetadata before adding to trigger item', () => {
			const triggerNode = {
				name: 'Chat Trigger',
				type: 'n8n-nodes-base.chatTrigger',
				parameters: {},
			} as any;
			const executionMetadata: ChatHubAuthenticationMetadata = {
				authToken: 'token-123',
				browserId: 'browser-456',
				method: 'POST',
				endpoint: '/api/chat/message',
			};

			const result = service.prepareExecutionData(
				triggerNode,
				'session-123',
				{ message: 'Hello', attachments: [] },
				executionMetadata,
			);

			expect(mockCipher.encrypt).toHaveBeenCalledWith(executionMetadata);
			expect(result[0].data.main[0]![0]).toMatchObject({
				encryptedMetadata: 'encrypted-metadata',
				json: {
					sessionId: 'session-123',
					action: 'sendMessage',
					chatInput: 'Hello',
				},
			});
		});

		it('should configure context establishment hook', () => {
			const triggerNode = { name: 'Chat Trigger', parameters: {} } as any;
			const result = service.prepareExecutionData(
				triggerNode,
				'session-123',
				{ message: 'Hello', attachments: [] },
				{
					authToken: 'token',
					browserId: undefined,
					method: 'POST',
					endpoint: '/api/chat/message',
				},
			);

			expect(result[0].node.parameters).toMatchObject({
				executionsHooksVersion: 1,
				contextEstablishmentHooks: {
					hooks: [
						{
							hookName: 'ChatHubExtractor',
							isAllowedToFail: true,
						},
					],
				},
			});
		});

		it('should preserve existing node parameters', () => {
			const triggerNode = {
				name: 'Chat Trigger',
				parameters: {
					existingParam: 'value',
					nestedParam: { foo: 'bar' },
				},
			} as any;

			const result = service.prepareExecutionData(
				triggerNode,
				'session-123',
				{ message: 'Hello', attachments: [] },
				{
					authToken: 'token',
					browserId: 'browser',
					method: 'POST',
					endpoint: '/api/chat/message',
				},
			);

			expect(result[0].node.parameters).toMatchObject({
				existingParam: 'value',
				nestedParam: { foo: 'bar' },
				executionsHooksVersion: 1,
			});
		});

		it('should handle attachments correctly', () => {
			const triggerNode = { name: 'Chat Trigger', parameters: {} } as any;
			const attachments = [
				{
					id: 'attachment-1',
					mimeType: 'image/png',
					fileName: 'test.png',
					fileSize: '1024',
					data: 'test',
				},
			];

			const result = service.prepareExecutionData(
				triggerNode,
				'session-123',
				{ message: 'Hello', attachments },
				defaultExecutionMetadata,
			);

			expect(result[0].data.main[0]![0].json.files).toEqual([
				{
					id: 'attachment-1',
					mimeType: 'image/png',
					fileName: 'test.png',
					fileSize: '1024',
				},
			]);
			expect(result[0].data.main[0]![0].binary).toHaveProperty('data0');
		});
	});
});
