import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useChatState } from './useChatState';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INode } from 'n8n-workflow';
import * as useRunWorkflowModule from '@/app/composables/useRunWorkflow';

vi.mock('@/app/composables/useRunWorkflow');
vi.mock('@/app/composables/useWorkflowHelpers', async (importOriginal) => {
	const actual: Record<string, unknown> = await importOriginal();
	return {
		...actual,
		resolveParameter: vi.fn((value) => {
			// For objects, pass through so tests can access nested properties
			if (typeof value === 'object' && value !== null) {
				return value;
			}
			return value;
		}),
	};
});
vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: vi.fn(() => ({
		setWorkflowExecutionData: vi.fn(),
		setActiveExecutionId: vi.fn(),
	})),
}));
vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn(() => ({
		updateNodesExecutionIssues: vi.fn(),
	})),
}));
vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual: Record<string, unknown> = await importOriginal();
	return {
		...actual,
		useI18n: vi.fn(() => ({
			baseText: vi.fn((key: string) => key),
		})),
	};
});
vi.mock('vue-router', async (importOriginal) => {
	const actual: Record<string, unknown> = await importOriginal();
	return {
		...actual,
		useRouter: vi.fn(() => ({
			resolve: vi.fn(() => ({ href: '/test' })),
		})),
		useRoute: vi.fn(() => ({
			params: {},
			query: {},
		})),
	};
});

describe('useChatState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let logsStore: ReturnType<typeof useLogsStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let mockRunWorkflow: ReturnType<typeof vi.fn>;

	const mockChatTriggerNode: INode = {
		id: 'chat-trigger-id',
		name: 'ChatTrigger',
		type: '@n8n/n8n-nodes-langchain.chatTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			options: {
				responseMode: 'streaming',
				allowFileUploads: true,
				allowedFilesMimeTypes: 'image/*,application/pdf',
			},
		},
	};

	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: false,
			initialState: {
				workflows: {
					workflow: {
						id: 'workflow-123',
						name: 'Test Workflow',
						active: false,
						createdAt: 1234567890,
						updatedAt: 1234567890,
						nodes: [mockChatTriggerNode],
						connections: {},
						settings: {},
						tags: [],
						pinData: {},
						versionId: '',
						isArchived: false,
					},
				},
			},
		});
		setActivePinia(pinia);
		workflowsStore = useWorkflowsStore();
		logsStore = useLogsStore();
		const rootStore = useRootStore();
		nodeTypesStore = useNodeTypesStore();

		// Mock computed getters
		vi.spyOn(logsStore, 'chatSessionId', 'get').mockReturnValue('session-456');
		vi.spyOn(rootStore, 'webhookTestUrl', 'get').mockReturnValue(
			'https://test.n8n.io/webhook-test',
		);

		mockRunWorkflow = vi.fn().mockResolvedValue({ executionId: 'test-exec-id' });
		vi.mocked(useRunWorkflowModule.useRunWorkflow).mockReturnValue({
			runWorkflow: mockRunWorkflow,
			consolidateRunDataAndStartNodes: vi.fn(),
			runEntireWorkflow: vi.fn(),
			runWorkflowApi: vi.fn(),
			stopCurrentExecution: vi.fn(),
			stopWaitingForWebhook: vi.fn(),
			sortNodesByYPosition: vi.fn(),
		});

		// Mock node type
		Object.defineProperty(nodeTypesStore, 'getNodeType', {
			value: vi.fn().mockReturnValue({
				group: [],
				properties: [
					{
						name: 'options',
						type: 'collection',
						options: [
							{ name: 'responseMode', default: 'lastNode' },
							{ name: 'allowFileUploads', default: false },
							{ name: 'allowedFilesMimeTypes', default: '*' },
						],
					},
				],
			} as never),
			writable: true,
			configurable: true,
		});
	});

	describe('basic initialization', () => {
		it('should initialize with default session ID from logsStore', () => {
			const chatState = useChatState(false);

			expect(chatState.currentSessionId.value).toBe('session-456');
		});

		it('should use provided sessionId parameter over logsStore', () => {
			const chatState = useChatState(false, () => 'custom-session-789');

			expect(chatState.webhookUrl.value).toContain('custom-session-789');
		});

		it('should find chatTriggerNode in workflow', () => {
			const chatState = useChatState(false);

			expect(chatState.chatTriggerNode.value).toEqual(mockChatTriggerNode);
		});

		it('should return null for chatTriggerNode when not present', () => {
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [];
			});

			const chatState = useChatState(false);

			expect(chatState.chatTriggerNode.value).toBeNull();
		});
	});

	describe('streaming configuration', () => {
		it('should detect streaming enabled when responseMode is "streaming"', async () => {
			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.isStreamingEnabled.value).toBe(true);
		});

		it('should detect streaming disabled when responseMode is "lastNode"', async () => {
			mockChatTriggerNode.parameters = {
				options: {
					responseMode: 'lastNode',
				},
			};

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.isStreamingEnabled.value).toBe(false);
		});

		it('should use default value for responseMode when not set', async () => {
			mockChatTriggerNode.parameters = { options: {} };

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.isStreamingEnabled.value).toBe(false);
		});
	});

	describe('file upload configuration', () => {
		it('should detect file uploads allowed from options', async () => {
			// Ensure the node in the store has the correct parameters
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [
					{
						...mockChatTriggerNode,
						parameters: {
							options: {
								allowFileUploads: true,
							},
						},
					},
				];
			});

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.isFileUploadsAllowed.value).toBe(true);
		});

		it('should detect file uploads disabled', async () => {
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [
					{
						...mockChatTriggerNode,
						parameters: {
							options: {
								allowFileUploads: false,
							},
						},
					},
				];
			});

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.isFileUploadsAllowed.value).toBe(false);
		});

		it('should get allowed MIME types from options', async () => {
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [
					{
						...mockChatTriggerNode,
						parameters: {
							options: {
								allowedFilesMimeTypes: 'image/*,application/pdf',
							},
						},
					},
				];
			});

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.allowedFilesMimeTypes.value).toBe('image/*,application/pdf');
		});

		it('should use default MIME types when not set', async () => {
			mockChatTriggerNode.parameters = { options: {} };

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.allowedFilesMimeTypes.value).toBe('*');
		});
	});

	describe('webhook URL generation', () => {
		it('should generate correct webhook URL with workflow ID and session ID', () => {
			const chatState = useChatState(false);

			expect(chatState.webhookUrl.value).toBe(
				'https://test.n8n.io/webhook-test/workflow-123/session-456',
			);
		});

		it('should use custom sessionId in webhook URL when provided', () => {
			const chatState = useChatState(false, () => 'custom-session');

			expect(chatState.webhookUrl.value).toBe(
				'https://test.n8n.io/webhook-test/workflow-123/custom-session',
			);
		});

		it('should return empty webhook URL when no chatTriggerNode', () => {
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [];
			});

			const chatState = useChatState(false);

			expect(chatState.webhookUrl.value).toBe('');
		});

		it('should return empty webhook URL when no workflow ID', () => {
			workflowsStore.$patch((state) => {
				state.workflow.id = '';
			});

			const chatState = useChatState(false);

			expect(chatState.webhookUrl.value).toBe('');
		});
	});

	describe('workflow readiness', () => {
		it('should be ready when chatTriggerNode exists and workflow has ID', () => {
			const chatState = useChatState(false);

			expect(chatState.isWorkflowReadyForChat.value).toBe(true);
		});

		it('should not be ready when no chatTriggerNode', () => {
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [];
			});

			const chatState = useChatState(false);

			expect(chatState.isWorkflowReadyForChat.value).toBe(false);
		});
	});

	describe('registerChatWebhook', () => {
		it('should call runWorkflow with correct parameters', async () => {
			const chatState = useChatState(false);

			await chatState.registerChatWebhook();

			expect(mockRunWorkflow).toHaveBeenCalledWith({
				triggerNode: 'ChatTrigger',
				source: 'RunData.ManualChatTrigger',
				sessionId: 'session-456',
			});
			expect(chatState.webhookRegistered.value).toBe(true);
		});

		it('should include destinationNode when set in workflowsStore', async () => {
			workflowsStore.chatPartialExecutionDestinationNode = 'DestinationNode';

			const chatState = useChatState(false);
			await chatState.registerChatWebhook();

			expect(mockRunWorkflow).toHaveBeenCalledWith({
				triggerNode: 'ChatTrigger',
				source: 'RunData.ManualChatTrigger',
				sessionId: 'session-456',
				destinationNode: {
					nodeName: 'DestinationNode',
					mode: 'inclusive',
				},
			});
			expect(workflowsStore.chatPartialExecutionDestinationNode).toBeNull();
		});

		it('should not register if already registering', async () => {
			const chatState = useChatState(false);

			// Start first registration
			const promise1 = chatState.registerChatWebhook();
			// Try to start second registration before first completes
			const promise2 = chatState.registerChatWebhook();

			await Promise.all([promise1, promise2]);

			// Should only call once
			expect(mockRunWorkflow).toHaveBeenCalledTimes(1);
		});

		it('should not register if no chatTriggerNode', async () => {
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [];
			});

			const chatState = useChatState(false);
			await chatState.registerChatWebhook();

			expect(mockRunWorkflow).not.toHaveBeenCalled();
			expect(chatState.webhookRegistered.value).toBe(false);
		});

		it('should use custom sessionId when provided', async () => {
			const chatState = useChatState(false, () => 'custom-session');

			await chatState.registerChatWebhook();

			expect(mockRunWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					sessionId: 'custom-session',
				}),
			);
		});
	});

	describe('chatOptions', () => {
		it('should generate correct chatOptions with all configurations', async () => {
			workflowsStore.$patch((state) => {
				state.workflow.nodes = [
					{
						...mockChatTriggerNode,
						parameters: {
							options: {
								responseMode: 'streaming',
								allowFileUploads: true,
								allowedFilesMimeTypes: 'image/*,application/pdf',
							},
						},
					},
				];
			});

			const chatState = useChatState(false);
			await nextTick();

			const options = chatState.chatOptions.value;

			expect(options.webhookUrl).toBe('https://test.n8n.io/webhook-test/workflow-123/session-456');
			expect(options.enableStreaming).toBe(true);
			expect(options.allowFileUploads).toBe(true);
			expect(options.allowedFilesMimeTypes).toBe('image/*,application/pdf');
			expect(options.sessionId).toBe('session-456');
			expect(options.chatInputKey).toBe('chatInput');
			expect(options.chatSessionKey).toBe('sessionId');
			expect(options.enableMessageActions).toBe(true);
		});

		it('should include beforeMessageSent handler', async () => {
			const chatState = useChatState(false);
			const options = chatState.chatOptions.value;

			expect(options.beforeMessageSent).toBeDefined();

			// Test beforeMessageSent calls registerChatWebhook
			await options.beforeMessageSent?.('test message');

			expect(mockRunWorkflow).toHaveBeenCalled();
			expect(logsStore.addChatMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					text: 'test message',
					sender: 'user',
				}),
			);
		});

		it('should not store messages in read-only mode', async () => {
			const chatState = useChatState(true);
			const options = chatState.chatOptions.value;

			await options.beforeMessageSent?.('test message');

			expect(logsStore.addChatMessage).not.toHaveBeenCalled();
		});
	});

	describe('refreshSession', () => {
		it('should reset session ID and clear messages', () => {
			const chatState = useChatState(false);

			chatState.refreshSession();

			expect(logsStore.resetChatSessionId).toHaveBeenCalled();
			expect(logsStore.resetMessages).toHaveBeenCalled();
		});

		it('should clear partial execution destination node', () => {
			workflowsStore.chatPartialExecutionDestinationNode = 'SomeNode';

			const chatState = useChatState(false);
			chatState.refreshSession();

			expect(workflowsStore.chatPartialExecutionDestinationNode).toBeNull();
		});
	});

	describe('displayExecution', () => {
		it('should open execution in new window', () => {
			const mockWindowOpen = vi.fn();
			window.open = mockWindowOpen;

			const chatState = useChatState(false);
			chatState.displayExecution('exec-123');

			expect(mockWindowOpen).toHaveBeenCalledWith('/test', '_blank');
		});
	});

	describe('parameter defaults', () => {
		it('should fall back to node type defaults when parameter not set', async () => {
			mockChatTriggerNode.parameters = {};

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.isStreamingEnabled.value).toBe(false); // default is 'lastNode'
			expect(chatState.isFileUploadsAllowed.value).toBe(false); // default is false
			expect(chatState.allowedFilesMimeTypes.value).toBe('*'); // default is '*'
		});

		it('should handle missing node type gracefully', async () => {
			Object.defineProperty(nodeTypesStore, 'getNodeType', {
				value: vi.fn().mockReturnValue(null),
				writable: true,
				configurable: true,
			});

			const chatState = useChatState(false);
			await nextTick();

			expect(chatState.isStreamingEnabled.value).toBe(false);
			expect(chatState.isFileUploadsAllowed.value).toBe(false);
		});
	});
});
