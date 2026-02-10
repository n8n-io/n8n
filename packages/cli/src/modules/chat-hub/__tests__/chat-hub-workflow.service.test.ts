import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository, SharedWorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Cipher, BinaryDataService } from 'n8n-core';
import type { IBinaryData } from 'n8n-workflow';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { ChatHubAgentService } from '../chat-hub-agent.service';
import type { ChatHubCredentialsService } from '../chat-hub-credentials.service';
import type { ChatHubAuthenticationMetadata } from '../chat-hub-extractor';
import { ChatHubMessage } from '../chat-hub-message.entity';
import { ChatHubSession } from '../chat-hub-session.entity';
import { ChatHubWorkflowService } from '../chat-hub-workflow.service';
import { ChatHubAttachmentService } from '../chat-hub.attachment.service';
import type { ChatHubSettingsService } from '../chat-hub.settings.service';
import type { ChatHubMessageRepository } from '../chat-message.repository';

describe('ChatHubWorkflowService', () => {
	const logger = mock<Logger>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const messageRepository = mock<ChatHubMessageRepository>();
	const chatHubAgentService = mock<ChatHubAgentService>();
	const chatHubSettingsService = mock<ChatHubSettingsService>();
	const chatHubCredentialsService = mock<ChatHubCredentialsService>();
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
			chatHubAgentService,
			chatHubSettingsService,
			chatHubCredentialsService,
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
});
