import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import InstanceAiAgentsConversation from '../InstanceAiAgentsConversation.vue';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';
import { fetchThread, fetchThreadMessages } from '../../instanceAi.memory.api';

const chatState = vi.hoisted(() => ({
	messages: null as unknown as { value: ChatMessage[] },
	isStreaming: null as unknown as { value: boolean },
	isLoadingHistory: null as unknown as { value: boolean },
}));

vi.mock('@/features/agents/components/AgentChatPanel.vue', async () => {
	const { defineComponent: define, h: render } = await import('vue');
	return {
		default: define({
			name: 'AgentChatPanelStub',
			props: { projectId: { type: String, required: true } },
			setup(props, { expose }) {
				expose({
					messages: chatState.messages,
					isStreaming: chatState.isStreaming,
					isLoadingHistory: chatState.isLoadingHistory,
					sendMessageFromOutside: vi.fn(),
				});
				return () => render('div', { 'data-test-id': 'chat-panel' }, props.projectId);
			},
		}),
	};
});

vi.mock('../../instanceAi.memory.api', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../instanceAi.memory.api')>()),
	fetchThread: vi.fn(),
	fetchThreadMessages: vi.fn(),
}));

const threadInfo = (title: string) => ({
	thread: {
		id: 'thread-1',
		title,
		resourceId: 'user-1',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
});

let runtime: ThreadRuntime;

const Host = defineComponent({
	setup() {
		runtime = provideThread('thread-1');
		return () => h(InstanceAiAgentsConversation);
	},
});

const renderComponent = createComponentRenderer(Host);

describe('InstanceAiAgentsConversation', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		setActivePinia(createTestingPinia({ stubActions: false }));
		chatState.messages = ref<ChatMessage[]>([]);
		chatState.isStreaming = ref(false);
		chatState.isLoadingHistory = ref(true);
		vi.mocked(fetchThread).mockResolvedValue(threadInfo('First title'));
		vi.mocked(fetchThreadMessages).mockResolvedValue({
			threadId: 'thread-1',
			projectId: 'project-1',
			messages: [],
			nextEventId: 0,
		});
	});

	afterEach(() => {
		useInstanceAiStore().disposeRuntime('thread-1');
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('resolves the project without the legacy history and mounts the chat', async () => {
		const { findByTestId } = renderComponent();
		expect(runtime.agentsChatMode).toBe(true);
		expect(runtime.hydrationStatus).toBe('hydrating');

		expect((await findByTestId('chat-panel')).textContent).toBe('project-1');
		expect(runtime.projectId).toBe('project-1');
		expect(fetchThreadMessages).toHaveBeenCalledWith(expect.anything(), 'thread-1', 1);
		expect(useInstanceAiStore().threads[0].title).toBe('First title');
		expect(runtime.sseState).toBe('disconnected');
	});

	it('mirrors the chat into the thread runtime once the history has loaded', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');

		chatState.messages.value = [
			{ id: 'u-1', role: 'user', content: 'Build it' },
			{
				id: 'a-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{
						tool: 'build-workflow',
						toolCallId: 'tc-1',
						state: 'done',
						output: { success: true, workflowId: 'wf-1', workflowName: 'Orders' },
					},
				],
			},
		];
		await flushPromises();
		expect(runtime.hydrationStatus).toBe('hydrating');

		chatState.isLoadingHistory.value = false;
		await flushPromises();
		expect(runtime.hydrationStatus).toBe('ready');
		expect(runtime.messages).toHaveLength(2);
		expect(runtime.producedArtifacts.get('wf-1')?.name).toBe('Orders');

		chatState.isStreaming.value = true;
		await flushPromises();
		expect(runtime.isStreaming).toBe(true);
	});

	it('refreshes the thread title when a turn finishes and again after the refine delay', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');
		chatState.isLoadingHistory.value = false;
		await flushPromises();
		vi.mocked(fetchThread).mockClear();

		chatState.isStreaming.value = true;
		await flushPromises();
		expect(fetchThread).not.toHaveBeenCalled();

		vi.mocked(fetchThread).mockResolvedValue(threadInfo('Heuristic title'));
		chatState.isStreaming.value = false;
		await flushPromises();
		expect(fetchThread).toHaveBeenCalledTimes(1);
		expect(useInstanceAiStore().threads[0].title).toBe('Heuristic title');

		vi.mocked(fetchThread).mockResolvedValue(threadInfo('Refined title'));
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fetchThread).toHaveBeenCalledTimes(2);
		expect(useInstanceAiStore().threads[0].title).toBe('Refined title');
	});

	it('reports a missing thread', async () => {
		const { ResponseError } = await import('@n8n/rest-api-client');
		const error = new ResponseError('Not found', { httpStatusCode: 404 });
		vi.mocked(fetchThread).mockRejectedValue(error);
		const onMissing = vi.fn();
		const MissingHost = defineComponent({
			setup() {
				runtime = provideThread('thread-1');
				return () => h(InstanceAiAgentsConversation, { onThreadMissing: onMissing });
			},
		});

		createComponentRenderer(MissingHost)();
		await flushPromises();

		expect(onMissing).toHaveBeenCalled();
	});
});
