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
	let sessionId: string;
	let executionResultData: ComputedRef<IRunExecutionData['resultData'] | undefined>;
	let onRunChatWorkflow: (
		payload: RunWorkflowChatPayload,
	) => Promise<IExecutionPushResponse | undefined>;
	let ws: Ref<WebSocket | null>;
	let executionData: IRunExecutionData['resultData'] | undefined = undefined;
	let onNewMessage: (message: ChatMessage) => void;

	beforeEach(() => {
		executionData = undefined;
		createTestingPinia();
		chatTrigger = ref(null);
		sessionId = 'session-id';
		executionResultData = computed(() => executionData);
		onRunChatWorkflow = vi.fn().mockResolvedValue({
			executionId: 'execution-id',
		} as IExecutionPushResponse);
		onNewMessage = vi.fn();
		ws = ref(null);

		chatMessaging = useChatMessaging({
			chatTrigger,
			sessionId,
			executionResultData,
			onRunChatWorkflow,
			onNewMessage,
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

		expect(onNewMessage).toHaveBeenCalledTimes(1);
		expect(onNewMessage).toHaveBeenCalledWith({
			id: expect.any(String),
			sender: 'user',
			sessionId: 'session-id',
			text: messageText,
		});
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
				sessionId,
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
		expect(onNewMessage).toHaveBeenCalledTimes(2);
		expect(onNewMessage).toHaveBeenCalledWith({
			id: expect.any(String),
			sender: 'user',
			sessionId: 'session-id',
			text: messageText,
		});
		expect(onNewMessage).toHaveBeenCalledWith('Last node response');
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
		expect(onNewMessage).toHaveBeenCalledTimes(1);
		expect(onNewMessage).toHaveBeenCalledWith({
			id: expect.any(String),
			sender: 'user',
			sessionId: 'session-id',
			text: messageText,
		});
	});
});
