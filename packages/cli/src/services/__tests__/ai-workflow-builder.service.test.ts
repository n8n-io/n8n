import { AiWorkflowBuilderService } from '@n8n/ai-workflow-builder';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'jest-mock-extended';
import type { IUser } from 'n8n-workflow';

import type { License } from '@/license';
import type { NodeTypes } from '@/node-types';
import type { Push } from '@/push';
import { WorkflowBuilderService } from '@/services/ai-workflow-builder.service';
import type { UrlService } from '@/services/url.service';

jest.mock('@n8n/ai-workflow-builder');
jest.mock('@n8n_io/ai-assistant-sdk');

const MockedAiWorkflowBuilderService = AiWorkflowBuilderService as jest.MockedClass<
	typeof AiWorkflowBuilderService
>;
const MockedAiAssistantClient = AiAssistantClient as jest.MockedClass<typeof AiAssistantClient>;

describe('WorkflowBuilderService', () => {
	let service: WorkflowBuilderService;
	let mockNodeTypes: NodeTypes;
	let mockLicense: License;
	let mockConfig: GlobalConfig;
	let mockLogger: Logger;
	let mockUrlService: UrlService;
	let mockPush: Push;
	let mockUser: IUser;

	beforeEach(() => {
		jest.clearAllMocks();

		mockNodeTypes = mock<NodeTypes>();
		mockLicense = mock<License>();
		mockConfig = mock<GlobalConfig>();
		mockLogger = mock<Logger>();
		mockUrlService = mock<UrlService>();
		mockPush = mock<Push>();
		mockUser = mock<IUser>();
		mockUser.id = 'test-user-id';

		// Setup default mocks
		(mockUrlService.getInstanceBaseUrl as jest.Mock).mockReturnValue('https://instance.test.com');
		(mockLicense.loadCertStr as jest.Mock).mockResolvedValue('test-cert');
		(mockLicense.getConsumerId as jest.Mock).mockReturnValue('test-consumer-id');
		mockConfig.aiAssistant = { baseUrl: '' };

		// Reset the mocked AiWorkflowBuilderService
		MockedAiWorkflowBuilderService.mockClear();
		MockedAiAssistantClient.mockClear();

		service = new WorkflowBuilderService(
			mockNodeTypes,
			mockLicense,
			mockConfig,
			mockLogger,
			mockUrlService,
			mockPush,
		);
	});

	describe('constructor', () => {
		it('should initialize without creating the service immediately', () => {
			expect(MockedAiWorkflowBuilderService).not.toHaveBeenCalled();
		});
	});

	describe('chat', () => {
		it('should create AiWorkflowBuilderService on first chat call without AI assistant client', async () => {
			const mockPayload = {
				message: 'test message',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const generator = service.chat(mockPayload, mockUser);
			const result = await generator.next();

			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledWith(
				mockNodeTypes,
				undefined, // No client when baseUrl is not set
				mockLogger,
				'https://instance.test.com',
				expect.any(Function), // onCreditsUpdated callback
			);

			expect(result.value).toEqual({ messages: ['response'] });
		});

		it('should create AiAssistantClient when baseUrl is configured', async () => {
			mockConfig.aiAssistant.baseUrl = 'https://ai-assistant.test.com';

			const mockPayload = {
				message: 'test message',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			expect(MockedAiAssistantClient).toHaveBeenCalledWith({
				licenseCert: 'test-cert',
				consumerId: 'test-consumer-id',
				baseUrl: 'https://ai-assistant.test.com',
				n8nVersion: expect.any(String),
			});

			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledWith(
				mockNodeTypes,
				expect.any(AiAssistantClient),
				mockLogger,
				'https://instance.test.com',
				expect.any(Function),
			);
		});

		it('should reuse the same service instance on subsequent calls', async () => {
			const mockPayload = {
				message: 'test message',
				workflowContext: {},
			};

			const mockChatGenerator1 = (async function* () {
				yield { messages: ['response1'] };
			})();
			const mockChatGenerator2 = (async function* () {
				yield { messages: ['response2'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock)
				.mockReturnValueOnce(mockChatGenerator1)
				.mockReturnValueOnce(mockChatGenerator2);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			// First call
			const generator1 = service.chat(mockPayload, mockUser);
			await generator1.next();

			// Second call
			const generator2 = service.chat(mockPayload, mockUser);
			await generator2.next();

			// Service should only be created once
			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledTimes(1);
		});

		it('should pass abort signal to underlying service', async () => {
			const mockPayload = {
				message: 'test message',
				workflowContext: {},
			};

			const abortController = new AbortController();
			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const generator = service.chat(mockPayload, mockUser, abortController.signal);
			await generator.next();

			expect(mockAiService.chat).toHaveBeenCalledWith(
				mockPayload,
				mockUser,
				abortController.signal,
			);
		});
	});

	describe('getSessions', () => {
		it('should create service and delegate to getSessions', async () => {
			const mockSessions = {
				sessions: [
					{
						sessionId: 'test-session',
						messages: [],
						lastUpdated: new Date(),
					},
				],
			};

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getSessions as jest.Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const result = await service.getSessions('workflow-123', mockUser);

			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledTimes(1);
			expect(mockAiService.getSessions).toHaveBeenCalledWith('workflow-123', mockUser);
			expect(result).toEqual(mockSessions);
		});

		it('should handle undefined workflowId', async () => {
			const mockSessions = { sessions: [] };

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getSessions as jest.Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const result = await service.getSessions(undefined, mockUser);

			expect(mockAiService.getSessions).toHaveBeenCalledWith(undefined, mockUser);
			expect(result).toEqual(mockSessions);
		});
	});

	describe('onCreditsUpdated callback', () => {
		it('should send push notification when credits are updated', async () => {
			const mockPayload = {
				message: 'test message',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);

			let capturedCallback:
				| ((userId: string, creditsQuota: number, creditsClaimed: number) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(
				(_nodeTypes, _client, _logger, _instanceUrl, callback) => {
					capturedCallback = callback;
					return mockAiService;
				},
			);

			// Trigger service creation
			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			// Verify callback was provided
			expect(capturedCallback).toBeDefined();

			// Simulate credits update
			capturedCallback!('user-123', 100, 5);

			// Verify push notification was sent
			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'updateBuilderCredits',
					data: {
						creditsQuota: 100,
						creditsClaimed: 5,
					},
				},
				['user-123'],
			);
		});

		it('should handle multiple credit updates', async () => {
			const mockPayload = {
				message: 'test message',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);

			let capturedCallback:
				| ((userId: string, creditsQuota: number, creditsClaimed: number) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(
				(_nodeTypes, _client, _logger, _instanceUrl, callback) => {
					capturedCallback = callback;
					return mockAiService;
				},
			);

			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			// Simulate multiple credit updates
			capturedCallback!('user-123', 100, 5);
			capturedCallback!('user-456', 50, 2);

			// Verify both notifications were sent
			expect(mockPush.sendToUsers).toHaveBeenCalledTimes(2);
			expect(mockPush.sendToUsers).toHaveBeenNthCalledWith(
				1,
				{
					type: 'updateBuilderCredits',
					data: {
						creditsQuota: 100,
						creditsClaimed: 5,
					},
				},
				['user-123'],
			);
			expect(mockPush.sendToUsers).toHaveBeenNthCalledWith(
				2,
				{
					type: 'updateBuilderCredits',
					data: {
						creditsQuota: 50,
						creditsClaimed: 2,
					},
				},
				['user-456'],
			);
		});
	});

	describe('getBuilderInstanceCredits', () => {
		it('should return builder instance credits', async () => {
			const expectedCredits = {
				creditsQuota: 100,
				creditsClaimed: 25,
			};

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getBuilderInstanceCredits as jest.Mock).mockResolvedValue(expectedCredits);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const result = await service.getBuilderInstanceCredits(mockUser);

			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledTimes(1);
			expect(mockAiService.getBuilderInstanceCredits).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(expectedCredits);
		});

		it('should reuse existing service instance', async () => {
			const expectedCredits = {
				creditsQuota: 50,
				creditsClaimed: 10,
			};

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getBuilderInstanceCredits as jest.Mock).mockResolvedValue(expectedCredits);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			// Call twice to test service reuse
			await service.getBuilderInstanceCredits(mockUser);
			const result = await service.getBuilderInstanceCredits(mockUser);

			// Should only create the service once
			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledTimes(1);
			expect(mockAiService.getBuilderInstanceCredits).toHaveBeenCalledTimes(2);
			expect(result).toEqual(expectedCredits);
		});
	});
});
