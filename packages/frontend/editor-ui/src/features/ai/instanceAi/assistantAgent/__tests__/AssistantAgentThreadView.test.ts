import { WORKFLOW_BUILDER_TOOL_NAMES, type InstanceAiNodesAttachment } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h, ref, type Ref } from 'vue';

import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import type { ArtifactThread } from '../../artifactThread';
import { INSTANCE_AI_VIEW } from '../../constants';
import { useInstanceAiStore } from '../../instanceAi.store';
import { USER_TYPED_MESSAGE } from '../../prefills';

import { createComponentRenderer } from '@/__tests__/render';

import { stashPendingAssistantAgentMessage } from '../assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgentThreads.store';
import AssistantAgentThreadView from '../AssistantAgentThreadView.vue';

const {
	panelProps,
	sendMessageFromOutside,
	telemetryTrack,
	previewProps,
	previewThread,
	appPreviewProps,
	routerPush,
	focusInput,
} = vi.hoisted(() => ({
	panelProps: { current: {} as Record<string, unknown> },
	sendMessageFromOutside: vi.fn(),
	telemetryTrack: vi.fn(),
	previewProps: { current: undefined as Record<string, unknown> | undefined },
	previewThread: { current: undefined as ArtifactThread | undefined },
	appPreviewProps: { current: undefined as Record<string, unknown> | undefined },
	routerPush: vi.fn(),
	focusInput: vi.fn(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

// The test view has no layout, so the tests set the width of the thread area.
const { threadArea } = vi.hoisted(() => ({
	threadArea: { width: undefined as Ref<number> | undefined },
}));
vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@vueuse/core')>();
	const { ref: vueRef } = await import('vue');
	const width = vueRef(0);
	threadArea.width = width;
	return { ...actual, useElementSize: () => ({ width, height: vueRef(0) }) };
});

// The chat state that the stub panel exposes, as the real panel does.
const chatMessages = ref<ChatMessage[]>([]);
const isLoadingHistory = ref(true);
const composerAttachments = ref<AgentChatComposerAttachment[]>([]);

vi.mock('@/features/agents/components/AgentChatPanel.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs, expose, slots }) {
			// A chip with the same id replaces the old one, as in the real panel.
			const addComposerAttachment = (
				chip: AgentChatComposerAttachment['chip'],
				clientContextPatch?: Record<string, unknown>,
			) => {
				composerAttachments.value = [
					...composerAttachments.value.filter((item) => item.chip.id !== chip.id),
					{ chip, clientContextPatch },
				];
			};
			const removeComposerAttachment = (id: string) => {
				composerAttachments.value = composerAttachments.value.filter((item) => item.chip.id !== id);
			};
			expose({
				sendMessageFromOutside,
				focusInput,
				addComposerAttachment,
				removeComposerAttachment,
				composerAttachments,
				messages: chatMessages,
				isStreaming: ref(false),
				isLoadingHistory,
			});
			return () => {
				panelProps.current = { ...attrs };
				return h('div', { 'data-test-id': 'agent-chat-panel-stub' }, [
					slots['composer-attachments']?.(),
				]);
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

// Picking a resource emits a fixed workflow, so the tests do not depend on the resource search.
vi.mock('../../components/InstanceAiResourcePicker.vue', () => ({
	default: defineComponent({
		props: {
			projectId: { type: String, required: true },
			contentTestId: { type: String, default: 'instance-ai-tab-picker' },
		},
		emits: ['select'],
		setup:
			(props, { emit }) =>
			() =>
				h('button', {
					'data-test-id': props.contentTestId,
					'data-project-id': props.projectId,
					onClick: () =>
						emit('select', {
							type: 'workflow',
							id: 'wf-picked',
							name: 'Picked workflow',
							icon: 'workflow',
							projectId: props.projectId,
						}),
				}),
	}),
}));

vi.mock('../../components/InstanceAiAppPreview.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs }) {
			return () => {
				appPreviewProps.current = { ...attrs };
				return h('div', { 'data-test-id': 'app-preview-stub' });
			};
		},
	}),
}));

vi.mock('../../components/InstanceAiPreviewTabBar.vue', () => ({
	default: defineComponent({
		emits: ['togglePreview', 'toggleExpanded'],
		setup:
			(_props, { emit }) =>
			() => [
				h('button', {
					'data-test-id': 'tab-bar-preview-toggle',
					onClick: () => emit('togglePreview'),
				}),
				h('button', {
					'data-test-id': 'tab-bar-expand-toggle',
					onClick: () => emit('toggleExpanded'),
				}),
			],
	}),
}));

// The real chips resolve the nodes from the workflow document, which has its own tests.
vi.mock('../../components/NodesAttachmentChips.vue', () => ({
	default: defineComponent({
		props: { attachment: { type: Object, required: true } },
		emits: ['update:attachment', 'remove-all'],
		setup:
			(props, { emit }) =>
			() =>
				h('div', { 'data-test-id': 'nodes-chips-stub' }, [
					JSON.stringify(props.attachment),
					h('button', {
						'data-test-id': 'nodes-chips-keep-first-set',
						onClick: () =>
							emit('update:attachment', {
								...props.attachment,
								sets: [(props.attachment as InstanceAiNodesAttachment).sets[0]],
							}),
					}),
					h('button', {
						'data-test-id': 'nodes-chips-remove-all',
						onClick: () => emit('remove-all'),
					}),
				]),
	}),
}));

vi.mock('../../components/InstanceAiArtifactsPanel.vue', () => ({
	default: defineComponent({
		setup: () => () => h('div', { 'data-test-id': 'artifacts-panel-stub' }),
	}),
}));

// The real header also renders the thread list, which has its own tests.
vi.mock('../../components/InstanceAiViewHeader.vue', () => ({
	default: defineComponent({
		props: { title: { type: String, default: undefined }, threadId: { type: String, default: '' } },
		setup(props, { slots }) {
			return () =>
				h('div', [h('span', { 'data-test-id': 'header-title' }, props.title), slots.actions?.()]);
		},
	}),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: routerPush }),
}));

const renderView = createComponentRenderer(AssistantAgentThreadView);

type AcceptMessage = (payload: { clientContext?: Record<string, unknown> }) => void;

function nodeSet(...names: string[]): InstanceAiNodesAttachment['sets'][number] {
	return { nodes: names.map((name) => ({ id: `id-${name}`, name })) };
}

function stagedNodes(): unknown[] {
	return composerAttachments.value.map(({ chip, clientContextPatch }) => ({
		id: chip.id,
		attachments: clientContextPatch?.attachments,
	}));
}

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
		appPreviewProps.current = undefined;
		routerPush.mockReset();
		focusInput.mockReset();
		composerAttachments.value = [];
		chatMessages.value = [];
		isLoadingHistory.value = true;
		if (threadArea.width) threadArea.width.value = 0;
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

		const onMessageAccepted = panelProps.current.onMessageAccepted as AcceptMessage;
		onMessageAccepted({ clientContext: clientContext() });
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

		const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
		const onMessageAccepted = panelProps.current.onMessageAccepted as AcceptMessage;
		onMessageAccepted({ clientContext: clientContext() });
		onMessageAccepted({ clientContext: clientContext() });

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

	it('opens the app that the Assistant commits and reloads it on the next commit', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();
		isLoadingHistory.value = false;
		await flushPromises();
		const commitMessage = (toolCallId: string): ChatMessage => ({
			id: `a-${toolCallId}`,
			role: 'assistant',
			content: '',
			toolCalls: [
				{
					tool: 'apps',
					toolCallId,
					input: { action: 'commit', appId: 'app-1', label: 'Change' },
					output: {
						app: { id: 'app-1', name: 'Todos', projectId: 'project-1' },
						versionId: toolCallId,
						buildStatus: 'succeeded',
					},
					state: 'done',
				},
			],
		});

		chatMessages.value = [commitMessage('tc-1')];
		await flushPromises();

		expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
		expect(appPreviewProps.current).toMatchObject({
			'project-id': 'project-1',
			'app-id': 'app-1',
		});
		const firstKey = appPreviewProps.current?.['refresh-key'];

		chatMessages.value = [...chatMessages.value, commitMessage('tc-2')];
		await flushPromises();

		expect(appPreviewProps.current?.['refresh-key']).toBe(Number(firstKey) + 1);
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

	it('offers a resource picker in the header while no tabs are open, and opens the picked resource', async () => {
		const { getByTestId, queryByTestId } = renderView({
			props: { threadId: 'thread-1', projectId: 'project-1' },
		});
		await flushPromises();
		// The history can open tabs for past builds, so the picker waits for it.
		expect(queryByTestId('assistant-agent-open-resource-picker')).toBeNull();

		isLoadingHistory.value = false;
		await flushPromises();

		expect(getByTestId('assistant-agent-open-resource-picker')).toHaveAttribute(
			'data-project-id',
			'project-1',
		);
		expect(queryByTestId('assistant-agent-preview-toggle')).toBeNull();

		await fireEvent.click(getByTestId('assistant-agent-open-resource-picker'));

		expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
		expect(previewProps.current).toMatchObject({ 'workflow-id': 'wf-picked' });
	});

	it('shows the preview toggle, not the picker, while tabs are open', async () => {
		const { getByTestId, queryByTestId } = renderView({
			props: { threadId: 'thread-1', projectId: 'project-1' },
		});
		await flushPromises();
		isLoadingHistory.value = false;
		await flushPromises();
		chatMessages.value = [buildMessage('tc-1')];
		await flushPromises();

		await fireEvent.click(getByTestId('tab-bar-preview-toggle'));

		expect(queryByTestId('assistant-agent-open-resource-picker')).toBeNull();
		expect(getByTestId('assistant-agent-preview-toggle')).toBeEnabled();
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

	it('shows the stored title of the thread in the header', async () => {
		useAssistantAgentThreadsStore().openedThreads = [
			{
				id: 'thread-1',
				title: 'Weekly digest',
				updatedAt: '2026-10-26T10:00:00.000Z',
				projectId: 'project-1',
			},
		];
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		chatMessages.value = [{ id: 'u1', role: 'user', content: 'Build a digest' }];
		await flushPromises();

		expect(getByTestId('header-title')).toHaveTextContent('Weekly digest');
	});

	it('titles an untitled thread with its first message', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		chatMessages.value = [{ id: 'u1', role: 'user', content: 'Build a digest' }];
		await flushPromises();

		expect(getByTestId('header-title')).toHaveTextContent('Build a digest');
	});

	it('opens a new Assistant thread from the header', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		await fireEvent.click(getByTestId('assistant-agent-new-thread'));

		expect(routerPush).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW });
	});

	describe('trace export', () => {
		afterEach(() => {
			localStorage.removeItem('instanceAi.debugMode');
		});

		it('hides the trace menu without the debug flag', async () => {
			const { queryByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			expect(queryByTestId('assistant-agent-trace-button')).not.toBeInTheDocument();
		});

		it('shows the trace menu and listens to the chat stream with the debug flag', async () => {
			localStorage.setItem('instanceAi.debugMode', 'true');
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			expect(getByTestId('assistant-agent-trace-button')).toBeInTheDocument();
			expect(panelProps.current.onStreamEvent).toEqual(expect.any(Function));
		});
	});

	describe('artifacts panel', () => {
		const userMessage: ChatMessage = { id: 'u1', role: 'user', content: 'Build a digest' };

		async function renderLoadedView(width: number, messages: ChatMessage[] = [userMessage]) {
			if (threadArea.width) threadArea.width.value = width;
			const result = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			isLoadingHistory.value = false;
			chatMessages.value = messages;
			await flushPromises();
			return result;
		}

		it('offers the panel while the thread loads, and not for an empty thread', async () => {
			const { queryByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();
			expect(queryByTestId('assistant-agent-artifacts-panel-toggle')).toBeInTheDocument();

			isLoadingHistory.value = false;
			await flushPromises();
			expect(queryByTestId('assistant-agent-artifacts-panel-toggle')).not.toBeInTheDocument();
		});

		it('shows the panel over a narrow chat only when asked for', async () => {
			const { getByTestId, queryByTestId } = await renderLoadedView(600);
			expect(queryByTestId('assistant-agent-artifacts-panel')).not.toBeInTheDocument();

			await fireEvent.click(getByTestId('assistant-agent-artifacts-panel-toggle'));
			expect(getByTestId('assistant-agent-artifacts-panel')).toBeInTheDocument();

			await fireEvent.click(getByTestId('assistant-agent-artifacts-panel-toggle'));
			expect(queryByTestId('assistant-agent-artifacts-panel')).not.toBeInTheDocument();
		});

		it('closes the panel over a narrow chat on a click outside it', async () => {
			const { getByTestId, queryByTestId } = await renderLoadedView(600);
			await fireEvent.click(getByTestId('assistant-agent-artifacts-panel-toggle'));

			await userEvent.click(getByTestId('agent-chat-panel-stub'));

			expect(queryByTestId('assistant-agent-artifacts-panel')).not.toBeInTheDocument();
		});

		it('keeps the panel beside a wide chat until the user hides it', async () => {
			const { getByTestId, queryByTestId } = await renderLoadedView(1200);
			expect(getByTestId('assistant-agent-artifacts-panel')).toBeInTheDocument();

			// A click outside the panel does not close it in a wide view.
			await userEvent.click(getByTestId('agent-chat-panel-stub'));
			expect(getByTestId('assistant-agent-artifacts-panel')).toBeInTheDocument();

			await fireEvent.click(getByTestId('assistant-agent-artifacts-panel-toggle'));
			expect(queryByTestId('assistant-agent-artifacts-panel')).not.toBeInTheDocument();
		});

		it('shows a hidden panel again when the view becomes wide again', async () => {
			const { getByTestId, queryByTestId } = await renderLoadedView(1200);
			await fireEvent.click(getByTestId('assistant-agent-artifacts-panel-toggle'));
			expect(queryByTestId('assistant-agent-artifacts-panel')).not.toBeInTheDocument();

			threadArea.width!.value = 600;
			await flushPromises();
			threadArea.width!.value = 1200;
			await flushPromises();

			expect(getByTestId('assistant-agent-artifacts-panel')).toBeInTheDocument();
		});

		it('does not bring back the panel over a narrow chat when the preview closes', async () => {
			const { getByTestId, queryByTestId } = await renderLoadedView(600);
			await fireEvent.click(getByTestId('assistant-agent-artifacts-panel-toggle'));

			chatMessages.value = [userMessage, buildMessage('tc-1')];
			await flushPromises();
			expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();

			await fireEvent.click(getByTestId('tab-bar-preview-toggle'));
			expect(getByTestId('assistant-agent-preview-panel')).not.toBeVisible();
			expect(queryByTestId('assistant-agent-artifacts-panel')).not.toBeInTheDocument();
		});

		it('opens the preview again from the header', async () => {
			const { getByTestId } = await renderLoadedView(1200);
			chatMessages.value = [userMessage, buildMessage('tc-1')];
			await flushPromises();
			await fireEvent.click(getByTestId('tab-bar-preview-toggle'));
			expect(getByTestId('assistant-agent-preview-panel')).not.toBeVisible();

			await fireEvent.click(getByTestId('assistant-agent-preview-toggle'));

			expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
			expect(previewProps.current).toMatchObject({ 'workflow-id': 'wf-1' });
		});
	});

	describe('canvas nodes', () => {
		beforeEach(() => {
			// The store moves the staged nodes for real.
			setActivePinia(createTestingPinia({ stubActions: false }));
		});

		async function renderThread() {
			const result = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			return result;
		}

		it('moves the nodes that the canvas adds to the chat into a composer chip for each workflow', async () => {
			await renderThread();
			const store = useInstanceAiStore();

			store.stageNodeSets('wf-1', [nodeSet('Webhook')]);
			await flushPromises();
			store.stageNodeSets('wf-1', [nodeSet('Slack')]);
			store.stageNodeSets('wf-2', [nodeSet('Gmail')]);
			await flushPromises();

			expect(store.pendingComposerAttachments).toEqual([]);
			expect(stagedNodes()).toEqual([
				{
					id: 'nodes:wf-1',
					attachments: [
						{ type: 'nodes', workflowId: 'wf-1', sets: [nodeSet('Webhook'), nodeSet('Slack')] },
					],
				},
				{
					id: 'nodes:wf-2',
					attachments: [{ type: 'nodes', workflowId: 'wf-2', sets: [nodeSet('Gmail')] }],
				},
			]);
		});

		it('moves the nodes that the canvas staged before the chat mounted', async () => {
			useInstanceAiStore().stageNodeSets('wf-1', [nodeSet('Webhook')]);

			await renderThread();

			expect(stagedNodes()).toEqual([
				{
					id: 'nodes:wf-1',
					attachments: [{ type: 'nodes', workflowId: 'wf-1', sets: [nodeSet('Webhook')] }],
				},
			]);
		});

		it('shows the staged nodes as node chips, which can remove some or all of them', async () => {
			const { getByTestId, queryByTestId } = await renderThread();
			useInstanceAiStore().stageNodeSets('wf-1', [nodeSet('Webhook'), nodeSet('Slack')]);
			await flushPromises();

			expect(getByTestId('nodes-chips-stub')).toHaveTextContent('Slack');

			await userEvent.click(getByTestId('nodes-chips-keep-first-set'));
			expect(stagedNodes()).toEqual([
				{
					id: 'nodes:wf-1',
					attachments: [{ type: 'nodes', workflowId: 'wf-1', sets: [nodeSet('Webhook')] }],
				},
			]);

			await userEvent.click(getByTestId('nodes-chips-remove-all'));
			expect(stagedNodes()).toEqual([]);
			expect(queryByTestId('nodes-chips-stub')).not.toBeInTheDocument();
		});

		it('shows the chat and focuses its input when the canvas asks for it', async () => {
			const { getByTestId } = await renderThread();
			await userEvent.click(getByTestId('tab-bar-expand-toggle'));
			expect(getByTestId('assistant-agent-preview-panel').style.width).toBe('');

			useInstanceAiStore().requestComposerFocus();
			await flushPromises();

			expect(getByTestId('assistant-agent-preview-panel').style.width).not.toBe('');
			expect(focusInput).toHaveBeenCalledTimes(1);
		});

		it('tracks the nodes that a sent message attached', async () => {
			await renderThread();
			const onMessageAccepted = panelProps.current.onMessageAccepted as AcceptMessage;

			onMessageAccepted({
				clientContext: {
					attachments: [
						{ type: 'workflow', id: 'wf-2', name: 'Digest' },
						{ type: 'nodes', workflowId: 'wf-1', sets: [nodeSet('Webhook', 'Slack')] },
					],
				},
			});

			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES,
				{ node_count: 2, runtime: 'agents' },
			);
		});
	});
});
