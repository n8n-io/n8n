import type { WorkflowRepository, SharedWorkflowRepository } from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService } from 'n8n-core';
import type { IBinaryData } from 'n8n-workflow';

import { ChatHubWorkflowService } from '../chat-hub-workflow.service';
import type { UrlService } from '@/services/url.service';
import { ChatHubMessage } from '../chat-hub-message.entity';
import { ChatHubSession } from '../chat-hub-session.entity';
import { ChatHubAttachmentService } from '../chat-hub.attachment.service';
import type { ChatHubMessageRepository } from '../chat-message.repository';

describe('ChatHubWorkflowService', () => {
	const logger = mock<Logger>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const urlService = mock<UrlService>();
	const globalConfig = mock<GlobalConfig>();
	const messageRepository = mock<ChatHubMessageRepository>();

	let chatHubAttachmentService: ChatHubAttachmentService;
	let service: ChatHubWorkflowService;

	beforeEach(() => {
		jest.resetAllMocks();

		// Create real ChatHubAttachmentService with mocked dependencies
		chatHubAttachmentService = new ChatHubAttachmentService(
			binaryDataService,
			messageRepository,
			urlService,
			globalConfig,
		);

		service = new ChatHubWorkflowService(
			logger,
			workflowRepository,
			sharedWorkflowRepository,
			chatHubAttachmentService,
		);

		// Default mock values
		globalConfig.endpoints = { rest: 'rest' } as any;

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

	describe('createChatWorkflow', () => {
		describe('attachment handling with binary data URLs', () => {
			it('should generate binary data URL using getInstanceBaseUrl when attachment has id', async () => {
				const mockAttachment: IBinaryData = {
					id: 'filesystem-v2:chat-hub/sessions/session-456/messages/msg-1/binary_data/bin-1',
					data: 'filesystem-v2',
					mimeType: 'image/png',
					fileName: 'test.png',
					fileSize: '100 kB',
					fileExtension: 'png',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Check this image';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachment];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage];

				const mockToken = 'signed-token-abc';
				const mockBaseUrl = 'https://example.com';

				binaryDataService.createSignedToken.mockReturnValue(mockToken);
				urlService.getInstanceBaseUrl.mockReturnValue(mockBaseUrl);

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4' },
					undefined,
					[],
					'UTC',
				);

				expect(binaryDataService.createSignedToken).toHaveBeenCalledWith(mockAttachment, '1 hour');
				expect(urlService.getInstanceBaseUrl).toHaveBeenCalled();

				const expectedUrl = `${mockBaseUrl}/rest/binary-data/signed?token=${mockToken}`;
				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check this image' },
					{ type: 'image_url', image_url: expectedUrl },
				]);
			});

			it('should use data URL directly when attachment has data but no id', async () => {
				const mockAttachment: IBinaryData = {
					data: 'data:image/png;base64,iVBORw0KGgoAAAANS',
					mimeType: 'image/png',
					fileName: 'test.png',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Check this image';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachment];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage];

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4' },
					undefined,
					[],
					'UTC',
				);

				expect(binaryDataService.createSignedToken).not.toHaveBeenCalled();
				expect(urlService.getInstanceBaseUrl).not.toHaveBeenCalled();

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check this image' },
					{ type: 'image_url', image_url: mockAttachment.data },
				]);
			});

			it('should skip attachment when it has neither id nor data', async () => {
				const mockAttachment: IBinaryData = {
					mimeType: 'image/png',
					fileName: 'test.png',
					data: '',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Check this image';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachment];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage];

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4' },
					undefined,
					[],
					'UTC',
				);

				expect(binaryDataService.createSignedToken).not.toHaveBeenCalled();
				expect(urlService.getInstanceBaseUrl).not.toHaveBeenCalled();

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check this image' },
				]);
			});

			it('should handle multiple attachments correctly', async () => {
				const mockAttachmentWithId: IBinaryData = {
					id: 'filesystem-v2:chat-hub/sessions/session-456/messages/msg-1/binary_data/bin-2',
					data: 'filesystem-v2',
					mimeType: 'image/png',
					fileName: 'test1.png',
					fileSize: '150 kB',
					fileExtension: 'png',
				};

				const mockAttachmentWithData: IBinaryData = {
					data: 'data:image/jpeg;base64,/9j/4AAQ',
					mimeType: 'image/jpeg',
					fileName: 'test2.jpg',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Check these images';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachmentWithId, mockAttachmentWithData];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage];

				const mockToken = 'signed-token-xyz';
				const mockBaseUrl = 'https://example.com';

				binaryDataService.createSignedToken.mockReturnValue(mockToken);
				urlService.getInstanceBaseUrl.mockReturnValue(mockBaseUrl);

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4' },
					undefined,
					[],
					'UTC',
				);

				expect(binaryDataService.createSignedToken).toHaveBeenCalledTimes(1);
				expect(binaryDataService.createSignedToken).toHaveBeenCalledWith(
					mockAttachmentWithId,
					'1 hour',
				);

				const expectedUrl = `${mockBaseUrl}/rest/binary-data/signed?token=${mockToken}`;
				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check these images' },
					{ type: 'image_url', image_url: expectedUrl },
					{ type: 'image_url', image_url: mockAttachmentWithData.data },
				]);
			});

			it('should return simple message when no attachments', async () => {
				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Hello';
				mockMessage.type = 'human';
				mockMessage.attachments = [];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage];

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4' },
					undefined,
					[],
					'UTC',
				);

				expect(binaryDataService.createSignedToken).not.toHaveBeenCalled();
				expect(urlService.getInstanceBaseUrl).not.toHaveBeenCalled();

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0]).toEqual({
					type: 'user',
					message: 'Hello',
					hideFromUI: false,
				});
			});

			it('should use custom rest endpoint from config', async () => {
				globalConfig.endpoints = { rest: 'api/v1' } as any;

				const mockAttachment: IBinaryData = {
					id: 'filesystem-v2:chat-hub/sessions/session-456/messages/msg-1/binary_data/bin-3',
					data: 'filesystem-v2',
					mimeType: 'image/png',
					fileName: 'test.png',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Image test';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachment];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage];

				const mockToken = 'token-custom';
				const mockBaseUrl = 'https://api.example.com';

				binaryDataService.createSignedToken.mockReturnValue(mockToken);
				urlService.getInstanceBaseUrl.mockReturnValue(mockBaseUrl);

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4' },
					undefined,
					[],
					'UTC',
				);

				const expectedUrl = `${mockBaseUrl}/api/v1/binary-data/signed?token=${mockToken}`;
				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Image test' },
					{ type: 'image_url', image_url: expectedUrl },
				]);
			});
		});
	});
});
