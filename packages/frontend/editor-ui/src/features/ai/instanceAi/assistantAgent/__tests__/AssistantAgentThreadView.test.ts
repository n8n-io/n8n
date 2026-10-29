import { WORKFLOW_BUILDER_TOOL_NAMES } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import type { ArtifactThread } from '../../artifactThread';
import { USER_TYPED_MESSAGE } from '../../prefills';

import { createComponentRenderer } from '@/__tests__/render';

import { stashPendingAssistantAgentMessage } from '../assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgentThreads.store';
import AssistantAgentThreadView from '../AssistantAgentThreadView.vue';

const { panelProps, sendMessageFromOutside, telemetryTrack, previewProps, previewThread } =
	vi.hoisted(() => ({
		panelProps: { current: {} as Record<string, unknown> },
		sendMessageFromOutside: vi.fn(),
		telemetryTrack: vi.fn(),
		previewProps: { current: undefined as Record<string, unknown> | undefined },
		previewThread: { current: undefined as ArtifactThread | undefined },
	}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

// The chat state that the stub panel exposes, as the real panel does.
const chatMessages = ref<ChatMessage[]>([]);
const isLoadingHistory = ref(true);

vi.mock('@/features/agents/components/AgentChatPanel.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs, expose }) {
			expose({
				sendMessageFromOutside,
				messages: chatMessages,
				isStreaming: ref(false),
				isLoadingHistory,
			});
			return () => {
				panelProps.current = { ...attrs };
				return h('div', { 'data-test-id': 'agent-chat-panel-stub' });
			};
		},
	}),
}));

vi.mock('../../components/InstanceAiWorkflowPreview.vue', async () => {
	const { useArtifactThread } = await import('../../artifactThread');
	return {
		default: defineComponent({
			inheritAttrs: false,
			setup(_props, { attrs }) {
				// The real preview asks the Assistant through the injected thread.
				previewThread.current = useArtifactThread();
				return () => {
					previewProps.current = { ...attrs };
					return h('div', { 'data-test-id': 'workflow-preview-stub' });
				};
			},
		}),
	};
});

vi.mock('../../components/InstanceAiPreviewTabBar.vue', () => ({
	default: defineComponent({ setup: () => () => h('div') }),
}));

const renderView = createComponentRenderer(AssistantAgentThreadView);

function buildMessage(toolCallId: string): ChatMessage {
	return {
		id: `a-${toolCallId}`,
		role: 'assistant',
		content: '',
		toolCalls: [
			{
				tool: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
				toolCallId,
				input: {},
				output: { success: true, workflowId: 'wf-1' },
				state: 'done',
			},
		],
	};
}

describe('AssistantAgentThreadView', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		sendMessageFromOutside.mockReset();
		telemetryTrack.mockReset();
		panelProps.current = {};
		previewProps.current = undefined;
		previewThread.current = undefined;
		chatMessages.value = [];
		isLoadingHistory.value = true;
	});

	it('opens the chat of the Assistant agent on the system channel', async () => {
		renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		expect(panelProps.current).toMatchObject({
			'project-id': 'project-1',
			'agent-id': 'assistant',
			'continue-session-id': 'thread-1',
			'new-session': false,
			channel: 'system',
		});
		expect(panelProps.current['interaction-extensions']).toEqual([
			expect.objectContaining({ key: 'assistant_confirmation' }),
		]);
		expect(sendMessageFromOutside).not.toHaveBeenCalled();
	});

	it('adds a thread opened by URL to the lists right away', async () => {
		renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		expect(useAssistantAgentThreadsStore().loadThread).toHaveBeenCalledWith('thread-1');
	});

	it('adds a new thread to the lists once the server accepts its first message', async () => {
		stashPendingAssistantAgentMessage({
			threadId: 'thread-new',
			text: 'Build a digest',
			files: [],
			references: [],
		});
		renderView({ props: { threadId: 'thread-new', projectId: 'project-1' } });
		await flushPromises();
		const threadsStore = useAssistantAgentThreadsStore();
		// The thread does not exist on the server before its first message.
		expect(threadsStore.loadThread).not.toHaveBeenCalled();

		const onSessionCreated = panelProps.current.onSessionCreated as () => void;
		onSessionCreated();

		expect(threadsStore.loadThread).toHaveBeenCalledWith('thread-new');
	});

	it('sends the first message of a new thread, with its references until the message is accepted', async () => {
		const file = new File(['data'], 'report.pdf', { type: 'application/pdf' });
		const reference = { type: 'workflow' as const, id: 'wf-1', name: 'Digest' };
		stashPendingAssistantAgentMessage({
			threadId: 'thread-2',
			text: 'Build a digest',
			files: [file],
			references: [reference],
		});

		renderView({ props: { threadId: 'thread-2', projectId: 'project-1' } });
		await flushPromises();

		expect(panelProps.current['new-session']).toBe(true);
		expect(sendMessageFromOutside).toHaveBeenCalledWith('Build a digest', [file]);

		const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
		expect(clientContext()).toMatchObject({
			timeZone: expect.any(String),
			attachments: [reference],
		});
		// A send that the server refuses can be sent again, with the same references.
		expect(clientContext()).toMatchObject({ attachments: [reference] });

		const onMessageAccepted = panelProps.current.onMessageAccepted as () => void;
		onMessageAccepted();
		expect(clientContext()).not.toHaveProperty('attachments');
		expect(telemetryTrack).not.toHaveBeenCalled();
	});

	it('tracks the attached nodes of the first message once the server accepts it', async () => {
		stashPendingAssistantAgentMessage({
			threadId: 'thread-3',
			text: 'Fix these nodes',
			files: [],
			references: [
				{
					type: 'nodes',
					workflowId: 'wf-1',
					sets: [
						{
							nodes: [
								{ id: 'n1', name: 'Webhook' },
								{ id: 'n2', name: 'Slack' },
							],
						},
					],
				},
			],
		});

		renderView({ props: { threadId: 'thread-3', projectId: 'project-1' } });
		await flushPromises();
		expect(telemetryTrack).not.toHaveBeenCalled();

		const onMessageAccepted = panelProps.current.onMessageAccepted as () => void;
		onMessageAccepted();
		onMessageAccepted();

		expect(telemetryTrack).toHaveBeenCalledTimes(1);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES,
			{ node_count: 2, runtime: 'agents' },
		);
	});

	it('opens the workflow that the Assistant builds in this session', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();
		isLoadingHistory.value = false;
		await flushPromises();

		chatMessages.value = [buildMessage('tc-1')];
		await flushPromises();

		expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
		expect(previewProps.current).toMatchObject({ 'workflow-id': 'wf-1' });
	});

	it('does not open the preview for a workflow built before the thread loaded', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		chatMessages.value = [buildMessage('tc-1')];
		isLoadingHistory.value = false;
		await flushPromises();

		expect(getByTestId('assistant-agent-preview-panel')).not.toBeVisible();
		expect(previewProps.current).toBeUndefined();
	});

	it('sends a question from a preview with its context for that message only', async () => {
		renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();
		isLoadingHistory.value = false;
		await flushPromises();
		chatMessages.value = [buildMessage('tc-1')];
		await flushPromises();

		const context = { source: 'setup-panel-execute' as const, workflowId: 'wf-1' };
		await previewThread.current?.sendMessage('Test the workflow', {
			authorship: USER_TYPED_MESSAGE,
			handoffContext: context,
		});

		expect(sendMessageFromOutside).toHaveBeenCalledWith('Test the workflow', [], { context });
		const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
		expect(clientContext()).not.toHaveProperty('context');
	});
});
