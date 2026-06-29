import type { Mock, MockedClass } from 'vitest';
import { AiWorkflowBuilderService } from '@n8n/ai-workflow-builder';
import type { Logger } from '@n8n/backend-common';
import type { HttpTransport, OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import type { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import type { IUser, INodeTypeDescription, ITelemetryTrackProperties } from 'n8n-workflow';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { WorkflowBuilderSessionRepository } from '@/modules/workflow-builder';
import type { Push } from '@/push';
import { WorkflowBuilderService } from '@/services/ai-workflow-builder.service';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';

vi.mock('@n8n/ai-workflow-builder', () => ({
	AiWorkflowBuilderService: vi.fn(),
	// Plain function (not vi.fn) so the global `restoreMocks` doesn't wipe its
	// implementation between tests; the disabled SSRF path relies on its return value.
	createPassthroughSsrfGuard: () => ({
		validateUrl: vi.fn(),
		validateRedirectSync: vi.fn(),
		createSecureLookup: vi.fn(),
	}),
}));
vi.mock('@n8n_io/ai-assistant-sdk');

const MockedAiWorkflowBuilderService = AiWorkflowBuilderService as MockedClass<
	typeof AiWorkflowBuilderService
>;
const MockedAiAssistantClient = AiAssistantClient as MockedClass<typeof AiAssistantClient>;

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
	let mockSsrfProtectionConfig: SsrfProtectionConfig;
	let mockSsrfProtectionService: SsrfProtectionService;
	let mockOutboundHttp: OutboundHttp;
	let mockUser: IUser;

	beforeEach(() => {
		vi.clearAllMocks();

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
			postProcessLoaders: vi.fn().mockResolvedValue(undefined),
			// collectTypes returns a snapshot copy for callers that need types
			collectTypes: vi.fn().mockResolvedValue({
				nodes: mockNodeTypeDescriptions,
				credentials: [],
			}),
			addPostProcessor: vi.fn(),
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
		mockSsrfProtectionConfig = mock<SsrfProtectionConfig>();
		// Deterministic default: SSRF protection disabled (passthrough guard). Individual
		// gating tests override this.
		mockSsrfProtectionConfig.enabled = false;
		mockSsrfProtectionService = mock<SsrfProtectionService>();
		mockOutboundHttp = mock<OutboundHttp>();
		const mockTransport = mock<HttpTransport>();
		mockTransport.asCustomFetch.mockReturnValue(vi.fn() as never);
		(mockOutboundHttp.transport as Mock).mockReturnValue(mockTransport);
		mockUser = mock<IUser>();
		mockUser.id = 'test-user-id';

		// Setup default mocks
		(mockUrlService.getInstanceBaseUrl as Mock).mockReturnValue('https://instance.test.com');
		(mockLicense.loadCertStr as Mock).mockResolvedValue('test-cert');
		(mockLicense.getConsumerId as Mock).mockReturnValue('test-consumer-id');
		(mockInstanceSettings.instanceId as unknown) = 'test-instance-id';
		mockConfig.aiAssistant = { baseUrl: '' };

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
			mockSsrfProtectionConfig,
			mockSsrfProtectionService,
			mockOutboundHttp,
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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

			const generator = service.chat(mockPayload, mockUser);
			const result = await generator.next();

			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledWith(
				mockNodeTypeDescriptions,
				mockSessionRepository,
				undefined, // No client when baseUrl is not set
				mockLogger,
				'test-instance-id', // instanceId
				'https://instance.test.com', // instanceUrl
				expect.any(String), // n8nVersion
				expect.any(Function), // onCreditsUpdated callback
				expect.any(Function), // onTelemetryEvent callback
				expect.anything(), // nodeDefinitionDirs
				expect.any(Function), // resourceLocatorCallbackFactory
				expect.anything(), // ssrfGuard (passthrough when SSRF protection disabled)
				expect.any(Function), // modelFetch (proxy-aware fetch from OutboundHttp)
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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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
				mockSessionRepository,
				expect.any(AiAssistantClient),
				mockLogger,
				'test-instance-id', // instanceId
				'https://instance.test.com', // instanceUrl
				expect.any(String), // n8nVersion
				expect.any(Function), // onCreditsUpdated callback
				expect.any(Function), // onTelemetryEvent callback
				expect.anything(), // nodeDefinitionDirs
				expect.any(Function), // resourceLocatorCallbackFactory
				expect.anything(), // ssrfGuard (passthrough when SSRF protection disabled)
				expect.any(Function), // modelFetch (proxy-aware fetch from OutboundHttp)
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
			(mockAiService.chat as Mock)
				.mockReturnValueOnce(mockChatGenerator1)
				.mockReturnValueOnce(mockChatGenerator2);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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
			(mockAiService.getSessions as Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

			const result = await service.getSessions('workflow-123', mockUser);

			expect(MockedAiWorkflowBuilderService).toHaveBeenCalledTimes(1);
			expect(mockAiService.getSessions).toHaveBeenCalledWith('workflow-123', mockUser, undefined);
			expect(result).toEqual(mockSessions);
		});

		it('should handle undefined workflowId', async () => {
			const mockSessions = { sessions: [] };

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getSessions as Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

			const result = await service.getSessions(undefined, mockUser);

			expect(mockAiService.getSessions).toHaveBeenCalledWith(undefined, mockUser, undefined);
			expect(result).toEqual(mockSessions);
		});

		it('should forward the isCodeBuilder flag to the inner service', async () => {
			const mockSessions = { sessions: [] };

			const mockAiService = mock<AiWorkflowBuilderService>();
			(mockAiService.getSessions as Mock).mockResolvedValue(mockSessions);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

			await service.getSessions('workflow-123', mockUser, true);

			expect(mockAiService.getSessions).toHaveBeenCalledWith('workflow-123', mockUser, true);
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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);

			let capturedCallback:
				| ((userId: string, creditsQuota: number, creditsClaimed: number) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(function (...args: any[]) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const callback = args[7]; // onCreditsUpdated is the 8th parameter (index 7, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedCallback = callback;
				return mockAiService;
			} as any);

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);

			let capturedCallback:
				| ((userId: string, creditsQuota: number, creditsClaimed: number) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(function (...args: any[]) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const callback = args[7]; // onCreditsUpdated is the 8th parameter (index 7, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedCallback = callback;
				return mockAiService;
			} as any);

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);

			let capturedTelemetryCallback:
				| ((event: string, properties: ITelemetryTrackProperties) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(function (...args: any[]) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const telemetryCallback = args[8]; // onTelemetryEvent is the 9th parameter (index 8, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedTelemetryCallback = telemetryCallback;
				return mockAiService;
			} as any);

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);

			let capturedTelemetryCallback:
				| ((event: string, properties: ITelemetryTrackProperties) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(function (...args: any[]) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const telemetryCallback = args[8]; // onTelemetryEvent is the 9th parameter (index 8, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedTelemetryCallback = telemetryCallback;
				return mockAiService;
			} as any);

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);

			let capturedTelemetryCallback:
				| ((event: string, properties: ITelemetryTrackProperties) => void)
				| undefined;

			MockedAiWorkflowBuilderService.mockImplementation(function (...args: any[]) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const telemetryCallback = args[8]; // onTelemetryEvent is the 9th parameter (index 8, after n8nVersion)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				capturedTelemetryCallback = telemetryCallback;
				return mockAiService;
			} as any);

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

			// Capture the callback passed to onCertRefresh
			let capturedCallback: ((cert: string) => void) | undefined;
			(mockLicense.onCertRefresh as Mock).mockImplementation((cb: (cert: string) => void) => {
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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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
			(mockAiService.chat as Mock).mockReturnValue(mockChatGenerator);
			(mockAiService.updateNodeTypes as Mock).mockImplementation(() => {});
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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
			(mockLoadNodesAndCredentials.collectTypes as Mock).mockResolvedValueOnce({
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
			(mockAiService.getBuilderInstanceCredits as Mock).mockResolvedValue(expectedCredits);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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
			(mockAiService.getBuilderInstanceCredits as Mock).mockResolvedValue(expectedCredits);
			MockedAiWorkflowBuilderService.mockImplementation(function () {
				return mockAiService;
			});

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

	let tmpRoot: string;
	let packageDir: string;

	// LazyPackageDirectoryLoader lives in the externalized `n8n-core` dist and reads
	// from disk through its own `fs` binding, which Vitest module mocks can't reach
	// (unlike Jest's global module registry). So write a real fixture package and let
	// the loader exercise the full path against the real filesystem.
	beforeAll(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'n8n-ai-builder-nodes-'));
		packageDir = join(tmpRoot, 'nodes-base');
		mkdirSync(join(packageDir, 'dist', 'known'), { recursive: true });
		mkdirSync(join(packageDir, 'dist', 'types'), { recursive: true });

		writeFileSync(
			join(packageDir, 'package.json'),
			JSON.stringify({
				name: 'n8n-nodes-base',
				version: '1.0.0',
				n8n: { nodes: [], credentials: [] },
			}),
		);
		writeFileSync(
			join(packageDir, 'dist', 'known', 'nodes.json'),
			JSON.stringify({
				httpRequest: {
					className: 'HttpRequest',
					sourcePath: 'dist/nodes/HttpRequest/HttpRequest.node.js',
				},
			}),
		);
		writeFileSync(join(packageDir, 'dist', 'known', 'credentials.json'), JSON.stringify({}));
		writeFileSync(
			join(packageDir, 'dist', 'types', 'nodes.json'),
			JSON.stringify([nodeTypeDescription]),
		);
		writeFileSync(join(packageDir, 'dist', 'types', 'credentials.json'), JSON.stringify([]));
	});

	afterAll(() => {
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	beforeEach(() => {
		MockedAiWorkflowBuilderService.mockClear();
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
		(mockAiService.chat as Mock).mockReturnValue(
			(async function* () {
				yield { messages: ['response'] };
			})(),
		);
		MockedAiWorkflowBuilderService.mockImplementation(function () {
			return mockAiService;
		});

		const outboundHttp = mock<OutboundHttp>();
		const transport = mock<HttpTransport>();
		transport.asCustomFetch.mockReturnValue(vi.fn() as never);
		outboundHttp.transport.mockReturnValue(transport);

		const builderService = new WorkflowBuilderService(
			loadNodesAndCredentials,
			mock<License>({
				loadCertStr: vi.fn().mockResolvedValue('cert'),
				getConsumerId: vi.fn().mockReturnValue('consumer'),
			}),
			mock<GlobalConfig>({ aiAssistant: { baseUrl: '' } }),
			mock(),
			mock<UrlService>({ getInstanceBaseUrl: vi.fn().mockReturnValue('http://localhost') }),
			mock(),
			mock(),
			mock<InstanceSettings>({ instanceId: 'test' }),
			mock(),
			mock(),
			mock<SsrfProtectionConfig>(),
			mock<SsrfProtectionService>(),
			outboundHttp,
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
