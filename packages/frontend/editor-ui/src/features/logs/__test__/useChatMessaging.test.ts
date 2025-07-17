import { createTestingPinia } from '@pinia/testing';
import { useChatMessaging } from '../composables/useChatMessaging';
import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { IRunExecutionData } from 'n8n-workflow';
import type { IExecutionPushResponse, INodeUi } from '@/Interface';
import type { RunWorkflowChatPayload } from '../composables/useChatMessaging';
import { vi } from 'vitest';
import type { ChatMessage } from '@n8n/chat/types';

vi.mock('../logs.utils', () => {
	return {
		extractBotResponse: vi.fn(() => 'Last node response'),
		getInputKey: vi.fn(),
		processFiles: vi.fn(),
	};
});

describe('useChatMessaging', () => {
	let chatMessaging: ReturnType<typeof useChatMessaging>;
	let chatTrigger: Ref<INodeUi | null>;
	let messages: Ref<ChatMessage[]>;
	let sessionId: Ref<string>;
	let executionResultData: ComputedRef<IRunExecutionData['resultData'] | undefined>;
	let onRunChatWorkflow: (
		payload: RunWorkflowChatPayload,
	) => Promise<IExecutionPushResponse | undefined>;
	let ws: Ref<WebSocket | null>;
	let executionData: IRunExecutionData['resultData'] | undefined = undefined;

	beforeEach(() => {
		executionData = undefined;
		createTestingPinia();
		chatTrigger = ref(null);
		messages = ref([]);
		sessionId = ref('session-id');
		executionResultData = computed(() => executionData);
		onRunChatWorkflow = vi.fn().mockResolvedValue({
			executionId: 'execution-id',
		} as IExecutionPushResponse);
		ws = ref(null);

		chatMessaging = useChatMessaging({
			chatTrigger,
			messages,
			sessionId,
			executionResultData,
			onRunChatWorkflow,
			ws,
		});
	});

	it('should initialize correctly', () => {
		expect(chatMessaging).toBeDefined();
		expect(chatMessaging.previousMessageIndex.value).toBe(0);
		expect(chatMessaging.isLoading.value).toBe(false);
	});

	it('should send a message and add it to messages', async () => {
		const messageText = 'Hello, world!';
		await chatMessaging.sendMessage(messageText);

		expect(messages.value).toHaveLength(1);
	});

	it('should send message via WebSocket if open', async () => {
		const messageText = 'Hello, WebSocket!';
		ws.value = {
			readyState: WebSocket.OPEN,
			send: vi.fn(),
		} as unknown as WebSocket;

		await chatMessaging.sendMessage(messageText);

		expect(ws.value.send).toHaveBeenCalledWith(
			JSON.stringify({
				sessionId: sessionId.value,
				action: 'sendMessage',
				chatInput: messageText,
			}),
		);
	});

	it('should startWorkflowWithMessage and add message to messages with final message', async () => {
		const messageText = 'Hola!';
		chatTrigger.value = {
			id: 'trigger-id',
			name: 'Trigger',
			typeVersion: 1.1,
			parameters: { options: {} },
		} as unknown as INodeUi;

		(onRunChatWorkflow as jest.Mock).mockResolvedValue({
			executionId: 'execution-id',
		} as IExecutionPushResponse);

		executionData = {
			runData: {},
		} as unknown as IRunExecutionData['resultData'];

		await chatMessaging.sendMessage(messageText);
		expect(messages.value).toHaveLength(2);
	});

	it('should startWorkflowWithMessage and not add final message if responseMode is responseNode and version is 1.3', async () => {
		const messageText = 'Hola!';
		chatTrigger.value = {
			id: 'trigger-id',
			name: 'Trigger',
			typeVersion: 1.3,
			parameters: { options: { responseMode: 'responseNodes' } },
		} as unknown as INodeUi;

		(onRunChatWorkflow as jest.Mock).mockResolvedValue({
			executionId: 'execution-id',
		} as IExecutionPushResponse);

		executionData = {
			runData: {},
		} as unknown as IRunExecutionData['resultData'];

		await chatMessaging.sendMessage(messageText);
		expect(messages.value).toHaveLength(1);
	});
});
