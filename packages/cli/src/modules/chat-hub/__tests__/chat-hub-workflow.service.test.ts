import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository, SharedWorkflowRepository, User } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { Cipher, BinaryDataService } from 'n8n-core';
import { type IBinaryData, type INode, CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import type { ChatHubAgent } from '../chat-hub-agent.entity';
import type { ChatHubAgentRepository } from '../chat-hub-agent.repository';
import type { ChatHubCredentialsService } from '../chat-hub-credentials.service';
import type { ChatHubAuthenticationMetadata } from '../chat-hub-extractor';
import { ChatHubMessage } from '../chat-hub-message.entity';
import { ChatHubSession } from '../chat-hub-session.entity';
import type { ChatHubToolService } from '../chat-hub-tool.service';
import { ChatHubWorkflowService } from '../chat-hub-workflow.service';
import { ChatHubAttachmentService } from '../chat-hub.attachment.service';
import type { ChatHubSettingsService } from '../chat-hub.settings.service';
import type { ChatHubMessageRepository } from '../chat-message.repository';

import { NODE_NAMES } from '../chat-hub.constants';
import type { SemanticSearchOptions } from '../chat-hub.types';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('ChatHubWorkflowService', () => {
	const logger = mock<Logger>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const messageRepository = mock<ChatHubMessageRepository>();
	const chatHubAgentRepository = mock<ChatHubAgentRepository>();
	const chatHubSettingsService = mock<ChatHubSettingsService>();
	const chatHubCredentialsService = mock<ChatHubCredentialsService>();
	const chatHubToolService = mock<ChatHubToolService>();
	const workflowFinderService = mock<WorkflowFinderService>();

	const mockCipher = mock<Cipher>();

	let chatHubAttachmentService: ChatHubAttachmentService;
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

		// Create real ChatHubAttachmentService with mocked dependencies
		chatHubAttachmentService = new ChatHubAttachmentService(binaryDataService, messageRepository);

		service = new ChatHubWorkflowService(
			logger,
			workflowRepository,
			sharedWorkflowRepository,
			chatHubAttachmentService,
			chatHubAgentRepository,
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

	describe('createChatWorkflow', () => {
		describe('provider settings', () => {
			it('should set responsesApiEnabled to false on OpenAI model node when provider settings disable it', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
					undefined,
					{
						provider: 'openai',
						enabled: true,
						credentialId: 'cred-123',
						allowedModels: [],
						responsesApiEnabled: false,
						createdAt: new Date().toISOString(),
						updatedAt: null,
					},
				);

				const modelNode = result.workflowData.nodes.find((node) => node.name === 'Chat Model');
				expect(modelNode?.parameters).toHaveProperty('responsesApiEnabled', false);
			});

			it('should not set responsesApiEnabled when provider settings do not explicitly disable it', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
					undefined,
					{
						provider: 'openai',
						enabled: true,
						credentialId: 'cred-123',
						allowedModels: [],
						createdAt: new Date().toISOString(),
						updatedAt: null,
					},
				);

				const modelNode = result.workflowData.nodes.find((node) => node.name === 'Chat Model');
				expect(modelNode?.parameters).not.toHaveProperty('responsesApiEnabled');
			});

			it('should not set responsesApiEnabled when provider settings explicitly enable it', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
					undefined,
					{
						provider: 'openai',
						enabled: true,
						credentialId: 'cred-123',
						allowedModels: [],
						responsesApiEnabled: true,
						createdAt: new Date().toISOString(),
						updatedAt: null,
					},
				);

				const modelNode = result.workflowData.nodes.find((node) => node.name === 'Chat Model');
				expect(modelNode?.parameters).not.toHaveProperty('responsesApiEnabled');
			});

			it('should use custom contextWindowLength from provider settings', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
					undefined,
					{
						provider: 'openai',
						enabled: true,
						credentialId: 'cred-123',
						allowedModels: [],
						contextWindowLength: 50,
						createdAt: new Date().toISOString(),
						updatedAt: null,
					},
				);

				const memoryNode = result.workflowData.nodes.find((node) => node.name === 'Memory');
				expect(memoryNode?.parameters).toHaveProperty('contextWindowLength', 50);
			});

			it('should default contextWindowLength to 20 when not set in provider settings', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const memoryNode = result.workflowData.nodes.find((node) => node.name === 'Memory');
				expect(memoryNode?.parameters).toHaveProperty('contextWindowLength', 20);
			});
		});

		describe('vector store nodes', () => {
			const VECTOR_STORE_SEARCH = {
				agentId: 'agent-1',
				options: {
					embeddingModel: { provider: 'openai' as const, credentialId: 'embedding-cred' },
					vectorStore: {
						nodeType: 'vectorStore',
						credentialType: 'pineconeApi',
						credentialId: 'vs-cred',
					},
				},
			};

			it('should include vector store and embeddings nodes when vectorStoreSearch is provided', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					VECTOR_STORE_SEARCH,
					defaultExecutionMetadata,
				);

				const vectorStoreNode = result.workflowData.nodes.find(
					(node) => node.name === NODE_NAMES.VECTOR_STORE,
				);
				expect(vectorStoreNode).toBeDefined();
				expect(vectorStoreNode?.type).toBe(VECTOR_STORE_SEARCH.options.vectorStore.nodeType);
				expect(vectorStoreNode?.credentials).toEqual({
					[VECTOR_STORE_SEARCH.options.vectorStore.credentialType]: {
						id: VECTOR_STORE_SEARCH.options.vectorStore.credentialId,
						name: '',
					},
				});

				const embeddingsNode = result.workflowData.nodes.find(
					(node) => node.name === NODE_NAMES.EMBEDDINGS_MODEL,
				);
				expect(embeddingsNode).toBeDefined();
				expect(embeddingsNode?.type).toBe('@n8n/n8n-nodes-langchain.embeddingsOpenAi');
			});

			it('should wire vector store to agent and embeddings to vector store', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					VECTOR_STORE_SEARCH,
					defaultExecutionMetadata,
				);

				const { connections } = result.workflowData;
				expect(connections[NODE_NAMES.VECTOR_STORE]?.ai_tool?.[0]).toContainEqual(
					expect.objectContaining({ node: NODE_NAMES.REPLY_AGENT }),
				);
				expect(connections[NODE_NAMES.EMBEDDINGS_MODEL]?.ai_embedding?.[0]).toContainEqual(
					expect.objectContaining({ node: NODE_NAMES.VECTOR_STORE }),
				);
			});

			it('should not include vector store nodes when vectorStoreSearch is null', async () => {
				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					[],
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const nodeNames = result.workflowData.nodes.map((n) => n.name);
				expect(nodeNames).not.toContain(NODE_NAMES.VECTOR_STORE);
				expect(nodeNames).not.toContain(NODE_NAMES.EMBEDDINGS_MODEL);
			});
		});

		describe('message history handling', () => {
			it('should handle empty history', async () => {
				const mockHistory: ChatHubMessage[] = [];

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();

				const messageValues = (restoreMemoryNode?.parameters?.messages as any)?.messageValues;
				expect(messageValues).toHaveLength(0);
			});

			it('should handle multiple messages', async () => {
				const message1 = new ChatHubMessage();
				message1.id = 'msg-1';
				message1.content = 'First message';
				message1.type = 'human';
				message1.attachments = [];
				message1.sessionId = 'session-456';
				message1.session = new ChatHubSession();
				message1.status = 'running';

				const message2 = new ChatHubMessage();
				message2.id = 'msg-2';
				message2.content = 'Second message';
				message2.type = 'ai';
				message2.attachments = [];
				message2.sessionId = 'session-456';
				message2.session = new ChatHubSession();
				message2.status = 'running';

				const message3 = new ChatHubMessage();
				message3.id = 'msg-3';
				message3.content = 'Third message';
				message3.type = 'human';
				message3.attachments = [];
				message3.sessionId = 'session-456';
				message3.session = new ChatHubSession();
				message3.status = 'running';

				const mockHistory: ChatHubMessage[] = [message1, message2, message3];

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();

				const messageValues = (restoreMemoryNode?.parameters?.messages as any)?.messageValues;
				expect(messageValues).toHaveLength(3);
				expect(messageValues[0]).toEqual({
					type: 'user',
					message: 'First message',
					hideFromUI: false,
				});
				expect(messageValues[1]).toEqual({
					type: 'ai',
					message: 'Second message',
					hideFromUI: false,
				});
				expect(messageValues[2]).toEqual({
					type: 'user',
					message: 'Third message',
					hideFromUI: false,
				});
			});
		});

		describe('attachment files', () => {
			it('should convert binary data to data URL when attachment has id', async () => {
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

				const mockImageBuffer = Buffer.from('fake-image-data', 'base64');
				binaryDataService.getAsBuffer.mockResolvedValue(mockImageBuffer);

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				expect(binaryDataService.getAsBuffer).toHaveBeenCalledWith(mockAttachment);

				const expectedDataUrl = `data:${mockAttachment.mimeType};base64,${mockImageBuffer.toString('base64')}`;
				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check this image' },
					{ type: 'image_url', image_url: expectedDataUrl },
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
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check this image' },
					{ type: 'image_url', image_url: mockAttachment.data },
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

				const mockImageBuffer = Buffer.from('fake-image-data-1', 'base64');
				binaryDataService.getAsBuffer.mockResolvedValue(mockImageBuffer);

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				expect(binaryDataService.getAsBuffer).toHaveBeenCalledTimes(1);
				expect(binaryDataService.getAsBuffer).toHaveBeenCalledWith(mockAttachmentWithId);
				expect(binaryDataService.createSignedToken).not.toHaveBeenCalled();

				const expectedDataUrl = `data:${mockAttachmentWithId.mimeType};base64,${mockImageBuffer.toString('base64')}`;
				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();
				expect((restoreMemoryNode?.parameters?.messages as any)?.messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check these images' },
					{ type: 'image_url', image_url: expectedDataUrl },
					{ type: 'image_url', image_url: mockAttachmentWithData.data },
				]);
			});

			it('should omit attachments that exceed maxTotalPayloadSize limit', async () => {
				// Create a large data URL that, when added to another attachment, will exceed the 20MB limit (90% of 20MB = 18MB)
				const largeDataUrl = 'data:image/png;base64,' + 'A'.repeat(10 * 1024 * 1024);
				const smallDataUrl = 'data:image/png;base64,' + 'B'.repeat(9 * 1024 * 1024);

				const mockAttachment1: IBinaryData = {
					data: largeDataUrl,
					mimeType: 'image/png',
					fileName: 'large.png',
				};

				const mockAttachment2: IBinaryData = {
					data: smallDataUrl,
					mimeType: 'image/png',
					fileName: 'small.png',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Check these images';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachment1, mockAttachment2];
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
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();

				const messageContent = (restoreMemoryNode?.parameters?.messages as any)?.messageValues[0]
					.message;

				// Should include text and only the first attachment since the second would exceed the limit
				expect(messageContent).toEqual([
					{ type: 'text', text: 'Check these images' },
					{ type: 'image_url', image_url: largeDataUrl },
					{ type: 'text', text: 'File: small.png\n(Content omitted due to size limit)' },
				]);
			});

			it('should omit attachments across multiple messages when total size exceeds limit', async () => {
				const attachment1DataUrl = 'data:image/png;base64,' + 'A'.repeat(5 * 1024 * 1024);
				const mockAttachment1: IBinaryData = {
					data: attachment1DataUrl,
					mimeType: 'image/png',
					fileName: 'first.png',
				};

				const message1 = new ChatHubMessage();
				message1.id = 'msg-1';
				message1.content = 'First message with attachment';
				message1.type = 'human';
				message1.attachments = [mockAttachment1];
				message1.sessionId = 'session-456';
				message1.session = new ChatHubSession();
				message1.status = 'running';

				const attachment2DataUrl = 'data:image/jpeg;base64,' + 'B'.repeat(8 * 1024 * 1024);
				const mockAttachment2: IBinaryData = {
					data: attachment2DataUrl,
					mimeType: 'image/jpeg',
					fileName: 'second.jpg',
				};

				const message2 = new ChatHubMessage();
				message2.id = 'msg-2';
				message2.content = 'Second message';
				message2.type = 'ai';
				message2.attachments = [mockAttachment2];
				message2.sessionId = 'session-456';
				message2.session = new ChatHubSession();
				message2.status = 'running';

				const attachment3DataUrl = 'data:image/png;base64,' + 'C'.repeat(6 * 1024 * 1024);
				const mockAttachment3: IBinaryData = {
					data: attachment3DataUrl,
					mimeType: 'image/png',
					fileName: 'third.png',
				};

				const message3 = new ChatHubMessage();
				message3.id = 'msg-3';
				message3.content = 'Third message';
				message3.type = 'human';
				message3.attachments = [mockAttachment3];
				message3.sessionId = 'session-456';
				message3.session = new ChatHubSession();
				message3.status = 'running';

				const mockHistory: ChatHubMessage[] = [message1, message2, message3];

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();

				const messageValues = (restoreMemoryNode?.parameters?.messages as any)?.messageValues;
				expect(messageValues).toHaveLength(3);

				// First message attachment is skipped due to cumulative size limit (processed last, size limit reached)
				expect(messageValues[0].message).toEqual([
					{ type: 'text', text: 'First message with attachment' },
					{ type: 'text', text: 'File: first.png\n(Content omitted due to size limit)' },
				]);

				// Second message includes attachment
				expect(messageValues[1].message).toEqual([
					{ type: 'text', text: 'Second message' },
					{ type: 'image_url', image_url: attachment2DataUrl },
				]);

				// Third message includes attachment (processed first)
				expect(messageValues[2].message).toEqual([
					{ type: 'text', text: 'Third message' },
					{ type: 'image_url', image_url: attachment3DataUrl },
				]);
			});

			it('should include omitted content message when attachment exceeds size limit', async () => {
				const largeDataUrl = 'data:image/png;base64,' + 'A'.repeat(17 * 1024 * 1024);

				const mockAttachment: IBinaryData = {
					data: largeDataUrl,
					mimeType: 'image/png',
					fileName: 'large-image.png',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Check this large image';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachment];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const anotherAttachment: IBinaryData = {
					data: 'data:image/jpeg;base64,' + 'B'.repeat(2 * 1024 * 1024),
					mimeType: 'image/jpeg',
					fileName: 'small-image.jpg',
				};

				const mockMessage2 = new ChatHubMessage();
				mockMessage2.id = 'msg-2';
				mockMessage2.content = 'And this small one';
				mockMessage2.type = 'human';
				mockMessage2.attachments = [anotherAttachment];
				mockMessage2.sessionId = 'session-456';
				mockMessage2.session = new ChatHubSession();
				mockMessage2.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage, mockMessage2];

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();

				const messageValues = (restoreMemoryNode?.parameters?.messages as any)?.messageValues;

				expect(messageValues[0].message).toEqual([
					{ type: 'text', text: 'Check this large image' },
					{ type: 'text', text: 'File: large-image.png\n(Content omitted due to size limit)' },
				]);

				expect(messageValues[1].message).toEqual([
					{ type: 'text', text: 'And this small one' },
					{ type: 'image_url', image_url: anotherAttachment.data },
				]);
			});

			it('should handle text file attachments as text blocks', async () => {
				const textContent = 'This is the content of the text file.\nIt has multiple lines.';
				const mockAttachment: IBinaryData = {
					id: 'filesystem-v2:chat-hub/sessions/session-456/messages/msg-1/binary_data/text-1',
					data: 'filesystem-v2',
					mimeType: 'text/plain',
					fileName: 'document.txt',
					fileSize: '60',
					fileExtension: 'txt',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Here is a text file';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAttachment];
				mockMessage.sessionId = 'session-456';
				mockMessage.session = new ChatHubSession();
				mockMessage.status = 'running';

				const mockHistory: ChatHubMessage[] = [mockMessage];

				// Mock getAsBuffer to return the text content
				binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from(textContent, 'utf-8'));

				const result = await service.createChatWorkflow(
					'user-123',
					'session-456',
					'project-789',
					mockHistory,
					'Hello',
					[],
					{ openAiApi: { id: 'cred-123', name: 'OpenAI' } },
					{ provider: 'openai', model: 'gpt-4-turbo' },
					undefined,
					[],
					'UTC',
					null,
					defaultExecutionMetadata,
				);

				expect(binaryDataService.getAsBuffer).toHaveBeenCalledWith(mockAttachment);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();

				const messageValues = (restoreMemoryNode?.parameters?.messages as any)?.messageValues;
				expect(messageValues[0].message).toEqual([
					{ type: 'text', text: 'Here is a text file' },
					{ type: 'text', text: `File: document.txt\nContent: \n${textContent}` },
				]);
			});

			it('should replace unsupported attachment with unsupported message', async () => {
				const mockAudioAttachment: IBinaryData = {
					data: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA',
					mimeType: 'audio/mp3',
					fileName: 'audio.mp3',
				};

				const mockMessage = new ChatHubMessage();
				mockMessage.id = 'msg-1';
				mockMessage.content = 'Listen to this audio';
				mockMessage.type = 'human';
				mockMessage.attachments = [mockAudioAttachment];
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
					null,
					defaultExecutionMetadata,
				);

				const restoreMemoryNode = result.workflowData.nodes.find(
					(node) => node.name === 'Restore Chat Memory',
				);
				expect(restoreMemoryNode?.parameters?.messages).toBeDefined();

				const messageValues = (restoreMemoryNode?.parameters?.messages as any)?.messageValues;
				expect(messageValues[0].message).toEqual([
					{ type: 'text', text: 'Listen to this audio' },
					{ type: 'text', text: 'File: audio.mp3\n(Unsupported file type)' },
				]);
			});
		});
	});

	describe('resolveWorkflowAttachmentPolicy', () => {
		const makeNode = (params: Record<string, unknown> = {}) =>
			({
				type: CHAT_TRIGGER_NODE_TYPE,
				parameters: params,
			}) as INode;

		it('should return allowFileUploads true and specific mime types when configured', () => {
			const nodes = [
				makeNode({
					options: {
						allowFileUploads: true,
						allowedFilesMimeTypes: 'image/png, audio/mp3, application/pdf',
					},
				}),
			];

			const result = service.resolveWorkflowAttachmentPolicy(nodes);

			expect(result).toEqual({
				allowFileUploads: true,
				allowedFilesMimeTypes: 'image/png, audio/mp3, application/pdf',
			});
		});

		it('should return wildcard mime types when allowFileUploads is true and mime types is */*', () => {
			const nodes = [
				makeNode({
					options: {
						allowFileUploads: true,
						allowedFilesMimeTypes: '*/*',
					},
				}),
			];

			const result = service.resolveWorkflowAttachmentPolicy(nodes);

			expect(result).toEqual({
				allowFileUploads: true,
				allowedFilesMimeTypes: '*/*',
			});
		});

		it('should return wildcard mime types when allowFileUploads is true and mime types is not set', () => {
			const nodes = [
				makeNode({
					options: {
						allowFileUploads: true,
					},
				}),
			];

			const result = service.resolveWorkflowAttachmentPolicy(nodes);

			expect(result).toEqual({
				allowFileUploads: true,
				allowedFilesMimeTypes: '*/*',
			});
		});

		it('should return allowFileUploads false and empty mime types when file uploads disabled', () => {
			const nodes = [
				makeNode({
					options: {
						allowFileUploads: false,
					},
				}),
			];

			const result = service.resolveWorkflowAttachmentPolicy(nodes);

			expect(result).toEqual({
				allowFileUploads: false,
				allowedFilesMimeTypes: '',
			});
		});

		it('should return allowFileUploads false when options are not set', () => {
			const nodes = [makeNode({})];

			const result = service.resolveWorkflowAttachmentPolicy(nodes);

			expect(result).toEqual({
				allowFileUploads: false,
				allowedFilesMimeTypes: '',
			});
		});

		it('should return allowFileUploads false when no chat trigger node exists', () => {
			const nodes = [{ type: 'n8n-nodes-base.someOtherNode', parameters: {} } as any];

			const result = service.resolveWorkflowAttachmentPolicy(nodes);

			expect(result).toEqual({
				allowFileUploads: false,
				allowedFilesMimeTypes: '',
			});
		});

		it('should return allowFileUploads false for empty nodes array', () => {
			const result = service.resolveWorkflowAttachmentPolicy([]);

			expect(result).toEqual({
				allowFileUploads: false,
				allowedFilesMimeTypes: '',
			});
		});
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
				'Hello',
				[],
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
			const result = service.prepareExecutionData(triggerNode, 'session-123', 'Hello', [], {
				authToken: 'token',
				browserId: undefined,
				method: 'POST',
				endpoint: '/api/chat/message',
			});

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

			const result = service.prepareExecutionData(triggerNode, 'session-123', 'Hello', [], {
				authToken: 'token',
				browserId: 'browser',
				method: 'POST',
				endpoint: '/api/chat/message',
			});

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
				'Hello',
				attachments,
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

	describe('createEmbeddingsInsertionWorkflow', () => {
		const SEMANTIC_SEARCH_OPTIONS: SemanticSearchOptions = {
			embeddingModel: { provider: 'openai', credentialId: 'embedding-cred' },
			vectorStore: {
				nodeType: 'vectorStore',
				credentialType: 'pineconeApi',
				credentialId: 'vs-cred',
			},
		};

		let trx: ReturnType<typeof mock<EntityManager>>;

		beforeEach(() => {
			trx = mock<EntityManager>();
			trx.save.mockImplementation(async (entity) => entity as never);
		});

		const attachment = {
			attachment: {
				data: 'base64data',
				mimeType: 'application/pdf',
				fileName: 'doc.pdf',
			} as IBinaryData,
			knowledgeId: 'knowledge-1',
		};

		it('should include a vector store node with the configured node type and credentials', async () => {
			const result = await service.createEmbeddingsInsertionWorkflow(
				mock<User>({ id: 'user-1' }),
				'project-1',
				[attachment],
				'agent-1',
				SEMANTIC_SEARCH_OPTIONS,
				trx,
				'workflow-1',
			);

			const vectorStoreNode = result.workflowData.nodes.find(
				(node) => node.name === NODE_NAMES.VECTOR_STORE,
			);
			expect(vectorStoreNode).toBeDefined();
			expect(vectorStoreNode?.type).toBe(SEMANTIC_SEARCH_OPTIONS.vectorStore.nodeType);
			expect(vectorStoreNode?.credentials).toEqual({
				[SEMANTIC_SEARCH_OPTIONS.vectorStore.credentialType]: {
					id: SEMANTIC_SEARCH_OPTIONS.vectorStore.credentialId,
					name: '',
				},
			});
		});

		it('should include an embeddings model node with the provider node type', async () => {
			const result = await service.createEmbeddingsInsertionWorkflow(
				mock<User>({ id: 'user-1' }),
				'project-1',
				[attachment],
				'agent-1',
				SEMANTIC_SEARCH_OPTIONS,
				trx,
				'workflow-1',
			);

			const embeddingsNode = result.workflowData.nodes.find(
				(node) => node.name === NODE_NAMES.EMBEDDINGS_MODEL,
			);
			expect(embeddingsNode).toBeDefined();
			expect(embeddingsNode?.type).toBe('@n8n/n8n-nodes-langchain.embeddingsOpenAi');
		});
	});

	describe('system message building', () => {
		async function getAgentNodeSystemMessage(agent: ChatHubAgent): Promise<string> {
			const serviceWithRepo = new ChatHubWorkflowService(
				logger,
				workflowRepository,
				sharedWorkflowRepository,
				chatHubAttachmentService,
				chatHubAgentRepository,
				chatHubSettingsService,
				chatHubCredentialsService,
				chatHubToolService,
				workflowFinderService,
				mockCipher,
			);

			const mockTrx = mock<EntityManager>();
			mockTrx.save.mockImplementation(
				async (entity) => ({ ...(entity as object), id: 'workflow-123' }) as any,
			);

			chatHubAgentRepository.getOneById.mockResolvedValue(agent);
			chatHubToolService.getToolDefinitionsForAgent.mockResolvedValue([]);
			chatHubSettingsService.getSemanticSearchOptions.mockResolvedValue(null);
			chatHubSettingsService.ensureModelIsAllowed.mockResolvedValue(undefined);
			chatHubCredentialsService.findPersonalProject.mockResolvedValue({ id: 'project-789' } as any);
			jest.spyOn(serviceWithRepo, 'getSystemMessageMetadata').mockReturnValue('__metadata__');

			const result = await serviceWithRepo.prepareReplyWorkflow(
				{ id: 'user-123' } as User,
				'session-456' as any,
				{},
				{ provider: 'custom-agent', agentId: 'agent-1' } as any,
				[],
				'Hello',
				[],
				[],
				'UTC',
				mockTrx,
				defaultExecutionMetadata,
			);

			const agentNode = result.workflowData.nodes.find((n) => n.name === NODE_NAMES.REPLY_AGENT);
			return (agentNode?.parameters?.options as any)?.systemMessage;
		}

		it('should include agent system prompt and file list in the AI Agent node system message', async () => {
			const agent = mock<ChatHubAgent>({
				id: 'agent-1',
				provider: 'openai',
				model: 'gpt-4',
				credentialId: 'cred-1',
				systemPrompt: `You are a product expert assistant.
When answering questions, follow these rules:
- Be concise and accurate
- Always cite which document you used
- If unsure, say so explicitly
- Never invent information`,
				files: [
					{
						id: 'k1',
						type: 'embedding',
						provider: 'openai',
						fileName: 'technical-spec.pdf',
						mimeType: 'application/pdf',
					},
					{
						id: 'k2',
						type: 'embedding',
						provider: 'openai',
						fileName: 'product-roadmap.pdf',
						mimeType: 'application/pdf',
					},
					{
						id: 'k3',
						type: 'embedding',
						provider: 'openai',
						fileName: 'onboarding-guide.pdf',
						mimeType: 'application/pdf',
					},
				],
			});

			expect(await getAgentNodeSystemMessage(agent)).toMatchInlineSnapshot(`
"Combine provided tools and knowledge to answer questions.

__metadata__

## Instructions from the user

> You are a product expert assistant.
> When answering questions, follow these rules:
> - Be concise and accurate
> - Always cite which document you used
> - If unsure, say so explicitly
> - Never invent information

## Context Files

You have access to the following user-uploaded files as a searchable context for the conversation:

- technical-spec.pdf
- product-roadmap.pdf
- onboarding-guide.pdf

Use context_files_search tool to search these documents when answering questions that may be related to them.
Do not proactively mention these files to the user.
When you use information from these files, always cite the source using markdown footnote syntax (e.g. "Some fact.[^1]" with "[^1]: example.pdf, page 3" at the end of your response)."
`);
		});

		it('should omit instruction and knowledge sections when system prompt is empty and no files', async () => {
			const agent = mock<ChatHubAgent>({
				id: 'agent-1',
				provider: 'openai',
				model: 'gpt-4',
				credentialId: 'cred-1',
				systemPrompt: '',
				files: [],
			});

			expect(await getAgentNodeSystemMessage(agent)).toMatchInlineSnapshot(`
"Combine provided tools and knowledge to answer questions.

__metadata__"
`);
		});
	});
});
