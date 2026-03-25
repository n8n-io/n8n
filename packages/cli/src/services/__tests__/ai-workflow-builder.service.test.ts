import { AiWorkflowBuilderService } from '@n8n/ai-workflow-builder';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import type * as fs from 'node:fs';
import type * as fsp from 'node:fs/promises';
import type { IUser, INodeTypeDescription, ITelemetryTrackProperties } from 'n8n-workflow';

import type { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Push } from '@/push';
import { WorkflowBuilderService } from '@/services/ai-workflow-builder.service';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowBuilderSessionRepository } from '@/modules/workflow-builder';

jest.mock('@n8n/ai-workflow-builder');
jest.mock('@n8n_io/ai-assistant-sdk');

const MockedAiWorkflowBuilderService = AiWorkflowBuilderService as jest.MockedClass<
	typeof AiWorkflowBuilderService
>;
const MockedAiAssistantClient = AiAssistantClient as jest.MockedClass<typeof AiAssistantClient>;

describe('WorkflowBuilderService', () => {
	let service: WorkflowBuilderService;
	let mockLoadNodesAndCredentials: LoadNodesAndCredentials;
	let mockNodeTypeDescriptions: INodeTypeDescription[];
	let mockLicense: License;
	let mockConfig: GlobalConfig;
	let mockLogger: Logger;
	let mockUrlService: UrlService;
	let mockPush: Push;
	let mockTelemetry: Telemetry;
	let mockInstanceSettings: InstanceSettings;
	let mockDynamicNodeParametersService: DynamicNodeParametersService;
	let mockSessionRepository: WorkflowBuilderSessionRepository;
	let mockUser: IUser;

	beforeEach(() => {
		jest.clearAllMocks();

		mockNodeTypeDescriptions = [
			{
				name: 'TestNode',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [],
				group: ['transform'],
			} as INodeTypeDescription,
		];

		mockLoadNodesAndCredentials = {
			types: {
				nodes: [],
				credentials: [],
			},
			// postProcessLoaders always releases types from memory
			postProcessLoaders: jest.fn().mockResolvedValue(undefined),
			// collectTypes returns a snapshot copy for callers that need types
			collectTypes: jest.fn().mockResolvedValue({
				nodes: mockNodeTypeDescriptions,
				credentials: [],
			}),
			addPostProcessor: jest.fn(),
		} as unknown as LoadNodesAndCredentials;

		mockLicense = mock<License>();
		mockConfig = mock<GlobalConfig>();
		mockLogger = mock<Logger>();
		mockUrlService = mock<UrlService>();
		mockPush = mock<Push>();
		mockTelemetry = mock<Telemetry>();
		mockInstanceSettings = mock<InstanceSettings>();
		mockDynamicNodeParametersService = mock<DynamicNodeParametersService>();
		mockSessionRepository = mock<WorkflowBuilderSessionRepository>();
		mockUser = mock<IUser>();
		mockUser.id = 'test-user-id';

		// Setup default mocks
		(mockUrlService.getInstanceBaseUrl as jest.Mock).mockReturnValue('https://instance.test.com');
		(mockLicense.loadCertStr as jest.Mock).mockResolvedValue('test-cert');
		(mockLicense.getConsumerId as jest.Mock).mockReturnValue('test-consumer-id');
		(mockInstanceSettings.instanceId as unknown) = 'test-instance-id';
		mockConfig.aiAssistant = { baseUrl: '' };
		(mockConfig.ai as { persistBuilderSessions: boolean }) = { persistBuilderSessions: false };

		// Reset the mocked AiWorkflowBuilderService
		MockedAiWorkflowBuilderService.mockClear();
		MockedAiAssistantClient.mockClear();

		service = new WorkflowBuilderService(
			mockLoadNodesAndCredentials,
			mockLicense,
			mockConfig,
			mockLogger,
			mockUrlService,
			mockPush,
			mockTelemetry,
			mockInstanceSettings,
			mockDynamicNodeParametersService,
			mockSessionRepository,
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
				id: '12345',
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
				mockNodeTypeDescriptions,
				undefined, // No session storage when persistBuilderSessions is false
				undefined, // No client when baseUrl is not set
				mockLogger,
				'test-instance-id', // instanceId
				'https://instance.test.com', // instanceUrl
				expect.any(String), // n8nVersion
				expect.any(Function), // onCreditsUpdated callback
				expect.any(Function), // onTelemetryEvent callback
				expect.anything(), // nodeDefinitionDirs
				expect.any(Function), // resourceLocatorCallbackFactory
			);

			expect(result.value).toEqual({ messages: ['response'] });
		});

		it('should create AiAssistantClient when baseUrl is configured', async () => {
			mockConfig.aiAssistant.baseUrl = 'https://ai-assistant.test.com';

			const mockPayload = {
				message: 'test message',
				id: '12345',
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
				instanceId: 'test-instance-id',
			});

			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledWith(
				mockNodeTypeDescriptions,
				undefined, // No session storage when persistBuilderSessions is false
				expect.any(AiAssistantClient),
				mockLogger,
				'test-instance-id', // instanceId
				'https://instance.test.com', // instanceUrl
				expect.any(String), // n8nVersion
				expect.any(Function), // onCreditsUpdated callback
				expect.any(Function), // onTelemetryEvent callback
				expect.anything(), // nodeDefinitionDirs
				expect.any(Function), // resourceLocatorCallbackFactory
			);
		});

		it('should reuse the same service instance on subsequent calls', async () => {
			const mockPayload = {
				message: 'test message',
				id: '12345',
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
				id: '12345',
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
			expect(mockAiService.getSessions).toHaveBeenCalledWith('workflow-123', mockUser, undefined);
			expect(result).toEqual(mockSessions);
		});

		it('should handle undefined workflowId', async () => {
			const mockSessions = { sessions: [] };

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getSessions as jest.Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const result = await service.getSessions(undefined, mockUser);

			expect(mockAiService.getSessions).toHaveBeenCalledWith(undefined, mockUser, undefined);
			expect(result).toEqual(mockSessions);
		});

		it('should pass codeBuilder flag to underlying service', async () => {
			const mockSessions = {
				sessions: [{ sessionId: 'test-session-code', messages: [], lastUpdated: new Date() }],
			};

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getSessions as jest.Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const result = await service.getSessions('workflow-123', mockUser, true);

			expect(mockAiService.getSessions).toHaveBeenCalledWith('workflow-123', mockUser, true);
			expect(result).toEqual(mockSessions);
		});

		it('should pass codeBuilder=false to underlying service', async () => {
			const mockSessions = { sessions: [] };

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getSessions as jest.Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			const result = await service.getSessions('workflow-123', mockUser, false);

			expect(mockAiService.getSessions).toHaveBeenCalledWith('workflow-123', mockUser, false);
			expect(result).toEqual(mockSessions);
		});
	});

	describe('onCreditsUpdated callback', () => {
		it('should send push notification when credits are updated', async () => {
			const mockPayload = {
				message: 'test message',
				id: '12345',
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

			MockedAiWorkflowBuilderService.mockImplementation(((...args: any[]) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const callback = args[7]; // onCreditsUpdated is the 8th parameter (index 7, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedCallback = callback;
				return mockAiService;
			}) as any);

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
				id: '12345',
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

			MockedAiWorkflowBuilderService.mockImplementation(((...args: any[]) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const callback = args[7]; // onCreditsUpdated is the 8th parameter (index 7, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedCallback = callback;
				return mockAiService;
			}) as any);

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

	describe('onTelemetryEvent callback', () => {
		it('should call telemetry.track when telemetry event is triggered', async () => {
			const mockPayload = {
				message: 'test message',
				id: '12345',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);

			let capturedTelemetryCallback:
				| ((event: string, properties: ITelemetryTrackProperties) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(((...args: any[]) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const telemetryCallback = args[8]; // onTelemetryEvent is the 9th parameter (index 8, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedTelemetryCallback = telemetryCallback;
				return mockAiService;
			}) as any);

			// Trigger service creation
			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			// Verify callback was provided
			expect(capturedTelemetryCallback).toBeDefined();

			// Simulate telemetry event
			const testEvent = 'ai_builder_workflow_created';
			const testProperties = {
				workflow_id: 'workflow-123',
				node_count: 5,
				user_id: 'user-123',
			};

			capturedTelemetryCallback!(testEvent, testProperties);

			// Verify telemetry.track was called
			expect(mockTelemetry.track).toHaveBeenCalledWith(testEvent, testProperties);
		});

		it('should handle multiple telemetry events', async () => {
			const mockPayload = {
				message: 'test message',
				id: '12345',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);

			let capturedTelemetryCallback:
				| ((event: string, properties: ITelemetryTrackProperties) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(((...args: any[]) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const telemetryCallback = args[8]; // onTelemetryEvent is the 9th parameter (index 8, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedTelemetryCallback = telemetryCallback;
				return mockAiService;
			}) as any);

			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			// Simulate multiple telemetry events
			const event1 = 'ai_builder_chat_started';
			const properties1 = { session_id: 'session-1' };

			const event2 = 'ai_builder_node_added';
			const properties2 = { node_type: 'http_request', workflow_id: 'workflow-123' };

			capturedTelemetryCallback!(event1, properties1);
			capturedTelemetryCallback!(event2, properties2);

			// Verify both telemetry events were tracked
			expect(mockTelemetry.track).toHaveBeenCalledTimes(2);
			expect(mockTelemetry.track).toHaveBeenNthCalledWith(1, event1, properties1);
			expect(mockTelemetry.track).toHaveBeenNthCalledWith(2, event2, properties2);
		});

		it('should handle telemetry events with empty properties', async () => {
			const mockPayload = {
				message: 'test message',
				id: '12345',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);

			let capturedTelemetryCallback:
				| ((event: string, properties: ITelemetryTrackProperties) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(((...args: any[]) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const telemetryCallback = args[8]; // onTelemetryEvent is the 9th parameter (index 8, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedTelemetryCallback = telemetryCallback;
				return mockAiService;
			}) as any);

			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			// Simulate telemetry event with empty properties
			const testEvent = 'ai_builder_session_ended';
			const emptyProperties = {};

			capturedTelemetryCallback!(testEvent, emptyProperties);

			// Verify telemetry.track was called with empty properties
			expect(mockTelemetry.track).toHaveBeenCalledWith(testEvent, emptyProperties);
		});
	});

	describe('license certificate refresh', () => {
		it('should register for license certificate updates when client is created', async () => {
			mockConfig.aiAssistant.baseUrl = 'https://ai-assistant.test.com';

			const mockPayload = {
				message: 'test message',
				id: '12345',
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

			expect(mockLicense.onCertRefresh).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should update client license cert when callback is invoked', async () => {
			mockConfig.aiAssistant.baseUrl = 'https://ai-assistant.test.com';

			const mockPayload = {
				message: 'test message',
				id: '12345',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			// Capture the callback passed to onCertRefresh
			let capturedCallback: ((cert: string) => void) | undefined;
			(mockLicense.onCertRefresh as jest.Mock).mockImplementation((cb: (cert: string) => void) => {
				capturedCallback = cb;
				return () => {};
			});

			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			expect(capturedCallback).toBeDefined();

			// Get the mocked client instance
			const mockClientInstance = MockedAiAssistantClient.mock.instances[0];

			// Invoke the callback with a new cert
			capturedCallback!('new-cert-value');

			expect(mockClientInstance.updateLicenseCert).toHaveBeenCalledWith('new-cert-value');
		});

		it('should not register for license updates when no baseUrl is configured', async () => {
			mockConfig.aiAssistant.baseUrl = '';

			const mockPayload = {
				message: 'test message',
				id: '12345',
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

			expect(mockLicense.onCertRefresh).not.toHaveBeenCalled();
		});
	});

	describe('refreshNodeTypes', () => {
		it('should call updateNodeTypes on the existing service', async () => {
			const mockPayload = {
				message: 'test message',
				id: '12345',
				workflowContext: {},
			};

			const mockChatGenerator = (async function* () {
				yield { messages: ['response'] };
			})();

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.chat as jest.Mock).mockReturnValue(mockChatGenerator);
			(mockAiService.updateNodeTypes as jest.Mock).mockImplementation(() => {});
			MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

			// First call - creates the service
			const generator1 = service.chat(mockPayload, mockUser);
			await generator1.next();
			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledTimes(1);

			// Simulate new community node being added
			const newNodeType = {
				name: 'n8n-nodes-community.elevenLabs',
				displayName: 'ElevenLabs',
				description: 'ElevenLabs community node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [],
				group: ['transform'],
			} as INodeTypeDescription;

			const updatedNodeTypes = [...mockNodeTypeDescriptions, newNodeType];
			(mockLoadNodesAndCredentials.collectTypes as jest.Mock).mockResolvedValueOnce({
				nodes: updatedNodeTypes,
				credentials: [],
			});

			// Trigger refresh (simulating post-processor callback after community package install)
			await service.refreshNodeTypes();

			// Verify updateNodeTypes was called on existing service with new node types
			expect(mockAiService.updateNodeTypes).toHaveBeenCalledWith(updatedNodeTypes);

			// Verify service was NOT recreated
			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledTimes(1);
		});

		it('should do nothing if service is not yet initialized', async () => {
			// Trigger refresh before service is initialized - should not throw
			await expect(service.refreshNodeTypes()).resolves.not.toThrow();

			// collectTypes should not be called since service doesn't exist yet
			expect(mockLoadNodesAndCredentials.collectTypes).not.toHaveBeenCalled();

			// Verify no service was created
			expect(MockedAiWorkflowBuilderService).not.toHaveBeenCalled();
		});

		it('should register as a post-processor on LoadNodesAndCredentials', () => {
			expect(mockLoadNodesAndCredentials.addPostProcessor).toHaveBeenCalledWith(
				expect.any(Function),
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

describe('WorkflowBuilderService - node type loading', () => {
	const packageDir = '/test/nodes-base';

	const nodeTypeDescription = {
		name: 'httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes an HTTP request',
		version: 1,
		defaults: { name: 'HTTP Request' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		group: ['output'],
	};

	beforeEach(() => {
		MockedAiWorkflowBuilderService.mockClear();

		// Mock node:fs so LazyPackageDirectoryLoader can "read" from disk
		const fsModule = require('node:fs') as jest.Mocked<typeof fs>;
		const fspModule = require('node:fs/promises') as jest.Mocked<typeof fsp>;

		fsModule.realpathSync.mockReturnValue(packageDir);
		fsModule.readFileSync.mockImplementation((filePath: unknown) => {
			if (String(filePath).endsWith('package.json')) {
				return JSON.stringify({
					name: 'n8n-nodes-base',
					version: '1.0.0',
					n8n: { nodes: [], credentials: [] },
				});
			}
			throw new Error(`Unexpected readFileSync: ${String(filePath)}`);
		});

		fspModule.readFile.mockImplementation(async (filePath: unknown) => {
			const p = String(filePath);
			if (p.endsWith('known/nodes.json')) {
				return JSON.stringify({
					httpRequest: {
						className: 'HttpRequest',
						sourcePath: 'dist/nodes/HttpRequest/HttpRequest.node.js',
					},
				});
			}
			if (p.endsWith('known/credentials.json')) return JSON.stringify({});
			if (p.endsWith('types/nodes.json')) return JSON.stringify([nodeTypeDescription]);
			if (p.endsWith('types/credentials.json')) return JSON.stringify([]);
			throw new Error(`Unexpected readFile: ${p}`);
		});
	});

	it('should load node types through real postProcessLoaders and pass them to AiWorkflowBuilderService', async () => {
		// Real LoadNodesAndCredentials — not mocked
		const loadNodesAndCredentials = new LoadNodesAndCredentials(
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);

		// Real LazyPackageDirectoryLoader reading from the mocked filesystem
		const loader = new LazyPackageDirectoryLoader(packageDir);
		await loader.loadAll();
		loadNodesAndCredentials.loaders[loader.packageName] = loader;

		const mockAiService = mock<AiWorkflowBuilderService>();
		(mockAiService.chat as jest.Mock).mockReturnValue(
			(async function* () {
				yield { messages: ['response'] };
			})(),
		);
		MockedAiWorkflowBuilderService.mockImplementation(() => mockAiService);

		const builderService = new WorkflowBuilderService(
			loadNodesAndCredentials,
			mock<License>({
				loadCertStr: jest.fn().mockResolvedValue('cert'),
				getConsumerId: jest.fn().mockReturnValue('consumer'),
			}),
			mock<GlobalConfig>({ aiAssistant: { baseUrl: '' } }),
			mock(),
			mock<UrlService>({ getInstanceBaseUrl: jest.fn().mockReturnValue('http://localhost') }),
			mock(),
			mock(),
			mock<InstanceSettings>({ instanceId: 'test' }),
			mock(),
			mock(),
		);

		const mockUser = mock<IUser>();
		mockUser.id = 'test-user';

		const generator = builderService.chat(
			{ id: '1', message: 'test', workflowContext: {} },
			mockUser,
		);
		await generator.next();

		// Verify AiWorkflowBuilderService received the node types from the real loading chain
		const constructorCall = MockedAiWorkflowBuilderService.mock.calls[0];
		const nodeTypes = constructorCall[0];

		expect(nodeTypes).toHaveLength(1);
		expect(nodeTypes[0].name).toBe('n8n-nodes-base.httpRequest');
		expect(nodeTypes[0].displayName).toBe('HTTP Request');
	});
});
