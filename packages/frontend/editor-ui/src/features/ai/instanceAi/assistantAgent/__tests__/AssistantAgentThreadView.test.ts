import {
	EXTENDED_PROMPT_MAX_LENGTH,
	WORKFLOW_BUILDER_TOOL_NAMES,
	type AssistantAgentTargetsState,
	type AssistantThreadTabsState,
	type InstanceAiElementAttachment,
	type InstanceAiNodesAttachment,
} from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h, inject, ref, type Ref } from 'vue';

import {
	mergeClientContextPatches,
	type AgentChatComposerAttachment,
} from '@/features/agents/utils/composer-attachments';
import { EMPTY_ASSISTANT_MENTION_COUNTS } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import type { ArtifactAgentTargets } from '../../artifactAgentTargets';
import type { ArtifactThread } from '../../artifactThread';
import type { WorkflowFailuresReport } from '../../components/InstanceAiWorkflowPreview.vue';
import { INSTANCE_AI_THREAD_SESSION_VIEW, INSTANCE_AI_VIEW } from '../../constants';
import { useAssistantCreditsStore } from '../../assistantCredits.store';
import { useInstanceAiStore } from '../../instanceAi.store';
import { USER_TYPED_MESSAGE } from '../../prefills';

import { createComponentRenderer } from '@/__tests__/render';
import {
	AGENT_TOOL_STEP_LABEL_KEY,
	type AgentToolStepLabeler,
} from '@/features/agents/components/agentChatInjectionKeys';
import { mockedStore } from '@/__tests__/utils';
import { INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

import {
	getPendingComposerDraft,
	getPendingWorkflowAttachment,
	stashPendingDraftAttachment,
	stashPendingComposerDraft,
	stashPendingFirstMessage,
	stashPendingWorkflowAttachment,
} from '../../composables/useInstanceAiHandoff';
import {
	getAssistantAgentLaunch,
	stashAssistantAgentLaunch,
	stashPendingAssistantAgentMessage,
} from '../assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgentThreads.store';
import AssistantAgentThreadView from '../AssistantAgentThreadView.vue';

const {
	panelProps,
	panelSlots,
	sendMessageFromOutside,
	sendHostMessage,
	telemetryTrack,
	previewProps,
	previewThread,
	appPreviewProps,
	routerPush,
	focusInput,
	openFilePicker,
	composerBlocked,
	setDraft,
	isDirty,
	agentPreview,
} = vi.hoisted(() => ({
	panelProps: { current: {} as Record<string, unknown> },
	panelSlots: { current: [] as string[] },
	sendMessageFromOutside: vi.fn(),
	sendHostMessage: vi.fn(),
	telemetryTrack: vi.fn(),
	previewProps: { current: undefined as Record<string, unknown> | undefined },
	previewThread: { current: undefined as ArtifactThread | undefined },
	appPreviewProps: { current: undefined as Record<string, unknown> | undefined },
	routerPush: vi.fn(),
	focusInput: vi.fn(),
	openFilePicker: vi.fn(),
	composerBlocked: { current: false },
	setDraft: vi.fn(),
	isDirty: vi.fn(() => false),
	agentPreview: {
		props: undefined as Record<string, unknown> | undefined,
		emit: undefined as ((event: string, ...args: unknown[]) => void) | undefined,
		targets: undefined as ArtifactAgentTargets | undefined,
		thread: undefined as ArtifactThread | undefined,
	},
}));

const { routeQuery } = vi.hoisted(() => ({ routeQuery: {} as Record<string, string> }));

const { fetchTabs, saveTabs } = vi.hoisted(() => ({
	fetchTabs: vi.fn(),
	saveTabs: vi.fn(),
}));
vi.mock('../assistantAgentTabs.api', () => ({
	fetchAssistantAgentThreadTabs: fetchTabs,
	saveAssistantAgentThreadTabs: saveTabs,
}));

const { fetchTargets, bindTarget, persistAgent } = vi.hoisted(() => ({
	fetchTargets: vi.fn(),
	bindTarget: vi.fn(),
	persistAgent: vi.fn(),
}));
vi.mock('../assistantAgentTargets.api', () => ({
	fetchAssistantAgentTargets: fetchTargets,
	bindAssistantAgentTarget: bindTarget,
	persistAssistantPendingAgent: persistAgent,
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage: vi.fn() }),
}));

const { postFeedback } = vi.hoisted(() => ({
	postFeedback: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../assistantAgentFeedback.api', () => ({
	postAssistantAgentFeedback: postFeedback,
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
const isBusy = ref(false);
const isPanelStreaming = ref(false);
const isAwaitingUserAnswer = ref(false);
const isAwaitingUserApproval = ref(false);
const focusOpenInteraction = vi.fn();
// The tool step labeler that the view gives the chat.
const panelToolStepLabel: { current?: AgentToolStepLabeler } = {};
const composerAttachments = ref<AgentChatComposerAttachment[]>([]);
// The user message whose references the stub panel renders through its slot.
const referencedMessage = ref<ChatMessage>();

vi.mock('@/features/agents/components/AgentChatPanel.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs, expose, slots }) {
			panelToolStepLabel.current = inject(AGENT_TOOL_STEP_LABEL_KEY, undefined);
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
				sendHostMessage,
				focusInput,
				openFilePicker,
				setDraft,
				isDirty,
				addComposerAttachment,
				removeComposerAttachment,
				composerAttachments,
				messages: chatMessages,
				isStreaming: isPanelStreaming,
				isAwaitingUserAnswer,
				isAwaitingUserApproval,
				focusOpenInteraction,
				isSubmitting: ref(false),
				isBusy,
				isLoadingHistory,
				getInputElement: () => undefined,
			});
			return () => {
				panelProps.current = { ...attrs };
				panelSlots.current = Object.keys(slots);
				// The real list shows the message actions under each finished answer.
				const answers = chatMessages.value.filter((message) => message.role === 'assistant');
				return h('div', { 'data-test-id': 'agent-chat-panel-stub' }, [
					...answers.map((message) =>
						h('div', { 'data-test-id': `message-actions-${message.id}` }, [
							slots['message-actions']?.({ message, executionId: message.executionId }),
						]),
					),
					slots['inline-offers']?.(),
					slots['above-input']?.(),
					slots['composer-attachments']?.(),
					slots['footer-start']?.({ disabled: composerBlocked.current }),
					slots['composer-actions']?.(),
					referencedMessage.value
						? slots['user-message-references']?.({ message: referencedMessage.value })
						: undefined,
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

// The real draft preview renders a canvas, which has its own tests.
vi.mock('../../components/InstanceAiWorkflowDraftPreview.vue', () => ({
	default: defineComponent({
		props: { draft: { type: Object, required: true }, building: Boolean },
		setup: (props) => () =>
			h('div', {
				'data-test-id': 'workflow-draft-preview-stub',
				'data-file-path': (props.draft as { filePath: string }).filePath,
			}),
	}),
}));

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

// The real preview renders the Agent Builder, which has its own tests.
vi.mock('../../components/InstanceAiAgentPreview.vue', async () => {
	const { useArtifactThread } = await import('../../artifactThread');
	const { useArtifactAgentTargets } = await import('../../artifactAgentTargets');
	return {
		default: defineComponent({
			inheritAttrs: false,
			emits: ['preview-open-change', 'assistant-handoff'],
			setup(_props, { attrs, emit }) {
				agentPreview.thread = useArtifactThread();
				agentPreview.targets = useArtifactAgentTargets();
				agentPreview.emit = emit as (event: string, ...args: unknown[]) => void;
				return () => {
					agentPreview.props = { ...attrs };
					return h('div', { 'data-test-id': 'agent-preview-stub' });
				};
			},
		}),
	};
});

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

// The real editor has its own tests. The stub keeps a local draft, so a remount loses it.
vi.mock('../../components/InstanceAiSkillPreview.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs }) {
			const draft = ref('');
			return () =>
				h(
					'div',
					{
						'data-test-id': 'skill-preview-stub',
						'data-skill-id': attrs['skill-id'],
						'data-refresh-key': attrs['refresh-key'],
					},
					[
						h('input', {
							'data-test-id': 'skill-preview-draft',
							value: draft.value,
							onInput: (event: Event) => {
								if (event.target instanceof HTMLInputElement) draft.value = event.target.value;
							},
						}),
					],
				);
		},
	}),
}));

// The tab that the `tab-bar-open-tab` button opens.
const { tabBarTabToOpen } = vi.hoisted(() => ({
	tabBarTabToOpen: { current: undefined as unknown },
}));
vi.mock('../../components/InstanceAiPreviewTabBar.vue', () => ({
	default: defineComponent({
		emits: ['togglePreview', 'toggleExpanded', 'openTab'],
		setup:
			(_props, { emit }) =>
			() => [
				h('button', {
					'data-test-id': 'tab-bar-open-tab',
					onClick: () => emit('openTab', tabBarTabToOpen.current),
				}),
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

// The real menu reads the MCP and browser use stores, which have their own tests.
vi.mock('../../components/InstanceAiInputMenu.vue', () => ({
	default: defineComponent({
		props: { disabled: { type: Boolean, default: false } },
		emits: ['attachFiles'],
		setup:
			(props, { emit }) =>
			() =>
				h('button', {
					'data-test-id': 'input-menu-attach',
					disabled: props.disabled,
					onClick: () => emit('attachFiles'),
				}),
	}),
}));

// The real selector reads the settings store, which has its own tests.
vi.mock('../../components/ApprovalModeSelector.vue', () => ({
	default: defineComponent({
		setup: () => () => h('div', { 'data-test-id': 'approval-mode-selector-stub' }),
	}),
}));

// The real notice reads the settings and users stores, and has its own tests.
vi.mock('../../components/LimitedModeNotice.vue', () => ({
	default: defineComponent({
		setup: () => () => h('div', { 'data-test-id': 'limited-mode-notice-stub' }),
	}),
}));

// The real banner reads the cloud plan stores, and has its own tests. Like the real
// banner, the stub shows the dismiss button only when the banner is dismissible.
vi.mock('@/features/ai/assistant/components/Agent/CreditWarningBanner.vue', () => ({
	default: defineComponent({
		props: {
			message: { type: String, default: undefined },
			dismissible: { type: Boolean, default: true },
		},
		emits: ['dismiss', 'upgrade-click'],
		setup:
			(props, { emit }) =>
			() =>
				h(
					'div',
					{ 'data-test-id': 'credit-warning-banner-stub', 'data-dismissible': props.dismissible },
					[
						props.message,
						props.dismissible
							? h('button', {
									'data-test-id': 'credit-warning-banner-dismiss',
									onClick: () => emit('dismiss'),
								})
							: null,
					],
				),
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
		setup() {
			// The real panel opens a skill row through this injected opener.
			const openSkillPreview = inject<((id: string) => boolean) | undefined>(
				'openSkillPreview',
				undefined,
			);
			return () =>
				h('div', { 'data-test-id': 'artifacts-panel-stub' }, [
					h('button', {
						'data-test-id': 'artifacts-panel-open-skill',
						onClick: () => openSkillPreview?.('skill-1'),
					}),
				]);
		},
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

// The real picker searches the project, which its own tests cover. The stub emits the
// selection that a test sets, and shows the props that the view passes.
const { mentionsEnabled, mentionSelection, mentionPickerProps } = vi.hoisted(() => ({
	mentionsEnabled: { current: true },
	mentionSelection: { current: undefined as unknown },
	mentionPickerProps: { current: undefined as Record<string, unknown> | undefined },
}));
vi.mock('@/features/ai/assistant-at-mentions/AssistantAtMentionPicker.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		emits: ['select'],
		setup(_props, { attrs, emit, expose }) {
			expose({
				handleExternalKeydown: () => false,
				getOpenMetrics: () => ({}),
				flushEmptySearch: () => {},
			});
			return () => {
				mentionPickerProps.current = { ...attrs };
				return h('button', {
					'data-test-id': 'mention-picker-stub',
					onClick: () => emit('select', mentionSelection.current),
				});
			};
		},
	}),
}));
vi.mock(
	'@/features/ai/assistant-at-mentions/composables/useIsAssistantAtMentionsEnabled',
	async () => {
		const { computed } = await import('vue');
		return { useIsAssistantAtMentionsEnabled: () => computed(() => mentionsEnabled.current) };
	},
);
vi.mock(
	'@/features/ai/assistant-at-mentions/composables/useAssistantMentionAvailability',
	async () => {
		const { computed } = await import('vue');
		return {
			useAssistantMentionAvailability: () => ({ isAvailable: computed(() => true) }),
		};
	},
);

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: routerPush, currentRoute: { value: { params: {} } } }),
	useRoute: () => ({ query: routeQuery }),
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

function skillMessage(toolCallId: string, action: 'create' | 'update'): ChatMessage {
	return {
		id: `a-${toolCallId}`,
		role: 'assistant',
		content: '',
		toolCalls: [
			{
				tool: 'skills',
				toolCallId,
				input: { action, ...(action === 'update' ? { skillId: 'skill-1' } : {}) },
				output:
					action === 'create'
						? { success: true, skill: { id: 'skill-1', name: 'Tone guide' } }
						: { success: true, saved: { id: 'skill-1' } },
				state: 'done',
			},
		],
	};
}

function noTargets(): AssistantAgentTargetsState {
	return { bound: null, pending: null, targets: [], previewSession: null };
}

describe('AssistantAgentThreadView', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		sendMessageFromOutside.mockReset();
		sendHostMessage.mockReset().mockResolvedValue('sent');
		telemetryTrack.mockReset();
		panelProps.current = {};
		previewProps.current = undefined;
		previewThread.current = undefined;
		appPreviewProps.current = undefined;
		routerPush.mockReset();
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		focusInput.mockReset();
		openFilePicker.mockReset();
		composerBlocked.current = false;
		setDraft.mockReset();
		localStorage.clear();
		composerAttachments.value = [];
		referencedMessage.value = undefined;
		mentionsEnabled.current = true;
		mentionSelection.current = undefined;
		mentionPickerProps.current = undefined;
		showError.mockReset();
		chatMessages.value = [];
		isLoadingHistory.value = true;
		isBusy.value = false;
		isPanelStreaming.value = false;
		isAwaitingUserAnswer.value = false;
		isAwaitingUserApproval.value = false;
		focusOpenInteraction.mockReset();
		panelSlots.current = [];
		if (threadArea.width) threadArea.width.value = 0;
		fetchTabs.mockReset().mockResolvedValue({ state: null });
		saveTabs.mockReset().mockResolvedValue({ state: null });
		fetchTargets.mockReset().mockResolvedValue({ targets: noTargets() });
		bindTarget.mockReset();
		persistAgent.mockReset();
		isDirty.mockReset().mockReturnValue(false);
		agentPreview.props = undefined;
		agentPreview.emit = undefined;
		agentPreview.targets = undefined;
		agentPreview.thread = undefined;
	});

	describe('draft workflow preview experiment', () => {
		const DRAFT_FILE = 'src/workflows/demo.workflow.ts';

		function setVariant(variant: string) {
			mockedStore(usePostHog).getVariant.mockImplementation((name) =>
				name === INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.name ? variant : undefined,
			);
		}

		async function renderLoadedThread() {
			const result = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			isLoadingHistory.value = false;
			await flushPromises();
			return result;
		}

		function streamDraft() {
			const onStreamEvent = panelProps.current.onStreamEvent as (event: unknown) => void;
			onStreamEvent({
				type: 'transient-host-event',
				name: 'workflow-draft',
				payload: {
					filePath: DRAFT_FILE,
					revision: 1,
					workflow: {
						name: 'Demo',
						nodes: [
							{
								id: 'node-1',
								name: 'Start',
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
						],
						connections: {},
					},
				},
			});
		}

		const buildingTurn: ChatMessage = {
			id: 'a-build',
			role: 'assistant',
			content: '',
			toolCalls: [
				{
					tool: 'load_skill',
					toolCallId: 'call-skill',
					input: { name: 'workflow-builder' },
					output: {},
					state: 'done',
				},
			],
		};

		it('shows a streamed workflow draft on the canvas', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			const { findByTestId } = await renderLoadedThread();
			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;

			streamDraft();

			const preview = await findByTestId('workflow-draft-preview-stub');
			expect(preview).toHaveAttribute('data-file-path', DRAFT_FILE);
		});

		it('shows the staging canvas while a new workflow builds', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			const { findByTestId } = await renderLoadedThread();

			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;

			const preview = await findByTestId('workflow-draft-preview-stub');
			expect(preview).toHaveAttribute('data-file-path', 'staging:a-build');
		});

		it('shows the building wave over the staging canvas while the agent works', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			const { findByTestId, queryByTestId } = await renderLoadedThread();

			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;

			await findByTestId('instance-ai-draft-building-wave');
			expect(queryByTestId('instance-ai-canvas-waiting-pill')).toBeNull();
		});

		it('shows a waiting pill instead of the wave while the run waits for an answer', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			const { findByTestId, queryByTestId } = await renderLoadedThread();
			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;

			isAwaitingUserAnswer.value = true;

			expect(await findByTestId('instance-ai-canvas-waiting-pill')).toHaveTextContent(
				'Waiting for your answer in the chat',
			);
			expect(queryByTestId('instance-ai-draft-building-wave')).toBeNull();
		});

		it('shows the waiting pill when the run ends its stream to wait for the answer', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			const { findByTestId } = await renderLoadedThread();
			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;
			await findByTestId('instance-ai-draft-building-wave');

			isPanelStreaming.value = false;
			isAwaitingUserAnswer.value = true;

			expect(await findByTestId('instance-ai-canvas-waiting-pill')).toHaveTextContent(
				'Waiting for your answer in the chat',
			);
		});

		it('asks for the approval while the run waits for one', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			const { findByTestId } = await renderLoadedThread();
			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;

			isAwaitingUserAnswer.value = true;
			isAwaitingUserApproval.value = true;

			expect(await findByTestId('instance-ai-canvas-waiting-pill')).toHaveTextContent(
				'Waiting for your approval in the chat',
			);
		});

		it('focuses the open card of the chat when the user clicks the waiting pill', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			const { findByTestId } = await renderLoadedThread();
			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;
			isAwaitingUserAnswer.value = true;

			await userEvent.click(await findByTestId('instance-ai-canvas-waiting-pill'));

			expect(focusOpenInteraction).toHaveBeenCalledOnce();
		});

		it('shows no draft in the control arm', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.control);
			const { queryByTestId } = await renderLoadedThread();
			chatMessages.value = [{ id: 'u-1', role: 'user', content: 'Build it' }, buildingTurn];
			isPanelStreaming.value = true;

			streamDraft();
			await flushPromises();

			expect(queryByTestId('workflow-draft-preview-stub')).toBeNull();
		});

		it('gives the chat a thinking word while the thread runs', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			await renderLoadedThread();

			isPanelStreaming.value = true;
			await flushPromises();

			expect(panelProps.current['thinking-label']).toEqual(expect.any(String));
		});

		it('gives the chat the specific tool labels of the experiment', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant);
			await renderLoadedThread();

			expect(panelToolStepLabel.current?.('search_nodes', { queries: ['gmail'] })).toBe(
				'Searching for gmail',
			);
			expect(panelToolStepLabel.current?.('list_credentials', {})).toBeUndefined();
		});

		it('gives the chat no specific tool label in the control arm', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.control);
			await renderLoadedThread();

			expect(panelToolStepLabel.current?.('search_nodes', { queries: ['gmail'] })).toBeUndefined();
		});

		it('gives the chat no thinking word in the control arm', async () => {
			setVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.control);
			await renderLoadedThread();

			isPanelStreaming.value = true;
			await flushPromises();

			expect(panelProps.current['thinking-label']).toBeUndefined();
		});
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
			expect.objectContaining({ key: 'assistant_answered_questions' }),
			expect.objectContaining({ key: 'assistant_auto_approval' }),
			expect.objectContaining({ key: 'assistant_preference_card' }),
			expect.objectContaining({ key: 'assistant_instance_context' }),
			expect.objectContaining({ key: 'assistant_status' }),
			expect.objectContaining({ key: 'assistant_tool_result_table' }),
			expect.objectContaining({ key: 'assistant_tool_result_code' }),
			expect.objectContaining({ key: 'assistant_shared_files' }),
		]);
		expect(sendMessageFromOutside).not.toHaveBeenCalled();
	});

	it('lets the composer take a message up to the Assistant limit', async () => {
		renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		expect(panelProps.current['max-length']).toBe(EXTENDED_PROMPT_MAX_LENGTH);
	});

	it('replaces the attach button with the Assistant "+" menu, which opens the file picker', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		expect(panelProps.current['show-attach-button']).toBe(false);

		await userEvent.click(getByTestId('input-menu-attach'));

		expect(openFilePicker).toHaveBeenCalledTimes(1);
	});

	it('disables the "+" menu while the composer takes no input', async () => {
		composerBlocked.current = true;
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		expect(getByTestId('input-menu-attach')).toBeDisabled();
	});

	it('shows the approval mode selector right after the "+" menu', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		expect(getByTestId('input-menu-attach').nextElementSibling).toBe(
			getByTestId('approval-mode-selector-stub'),
		);
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
			authorship: USER_TYPED_MESSAGE,
			mentionCounts: EMPTY_ASSISTANT_MENTION_COUNTS,
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
			authorship: USER_TYPED_MESSAGE,
			mentionCounts: EMPTY_ASSISTANT_MENTION_COUNTS,
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

	it('reports who wrote each message on send, starting with the first message of the empty view', async () => {
		const mentionCounts = { ...EMPTY_ASSISTANT_MENTION_COUNTS, workflow: 1, total: 1 };
		stashPendingAssistantAgentMessage({
			threadId: 'thread-4',
			text: 'Build a digest',
			files: [],
			references: [],
			authorship: { kind: 'prefill', prefillType: 'suggestion_catalog', prefillId: 's-1' },
			mentionCounts,
		});
		renderView({ props: { threadId: 'thread-4', projectId: 'project-1' } });
		await flushPromises();

		const onMessageSending = panelProps.current.onMessageSending as (payload: {
			text: string;
			files: File[];
			isFirstMessage: boolean;
		}) => void;
		onMessageSending({ text: 'Build a digest', files: [], isFirstMessage: true });
		onMessageSending({ text: 'Add Slack', files: [], isFirstMessage: false });

		expect(telemetryTrack.mock.calls).toEqual([
			[
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({
					thread_id: 'thread-4',
					is_first_message: true,
					prefill_type: 'suggestion_catalog',
					prefill_id: 's-1',
					mention_counts: mentionCounts,
					runtime: 'agents',
				}),
			],
			[
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({
					is_first_message: false,
					prefill_type: null,
					mention_counts: EMPTY_ASSISTANT_MENTION_COUNTS,
				}),
			],
		]);
	});

	it('reports the response to a sent message with the context of that message', async () => {
		renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		const onMessageSending = panelProps.current.onMessageSending as (payload: unknown) => void;
		const onStreamEvent = panelProps.current.onStreamEvent as (event: unknown) => void;
		onMessageSending({ text: 'Build a digest', files: [], isFirstMessage: true });
		onStreamEvent({ type: 'message-queued', queueId: 'q-1', sessionId: 'thread-1' });
		onStreamEvent({ type: 'execution-started', executionId: 'exec-1', sessionId: 'thread-1' });
		onStreamEvent({ type: 'finish', finishReason: 'stop' });

		await vi.waitFor(() =>
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_RECEIVED_AI_ASSISTANT_RESPONSE,
				expect.objectContaining({
					thread_id: 'thread-1',
					run_id: 'exec-1',
					is_first_user_message: true,
					response_kind: 'completed',
					runtime: 'agents',
				}),
			),
		);
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
			authorship: USER_TYPED_MESSAGE,
			mentionCounts: EMPTY_ASSISTANT_MENTION_COUNTS,
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
					tool: 'commit_app',
					toolCallId,
					input: { appId: 'app-1', label: 'Change' },
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

	describe('credits and limited mode', () => {
		function setCredits(quota: number, claimed: number): void {
			const creditsStore = useAssistantCreditsStore();
			creditsStore.creditsQuota = quota;
			creditsStore.creditsClaimed = claimed;
		}

		async function beforeSend(): Promise<void> {
			const hook = panelProps.current['before-send'];
			if (typeof hook !== 'function') throw new Error('The panel has no before-send hook');
			await hook();
		}

		it('shows the limited mode notice above the composer', async () => {
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			expect(getByTestId('limited-mode-notice-stub')).toBeInTheDocument();
		});

		it('shows no credit banner while enough credits are left', async () => {
			setCredits(100, 50);
			const { queryByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			expect(queryByTestId('credit-warning-banner-stub')).not.toBeInTheDocument();
			expect(panelProps.current.disabled).toBe(false);
			await expect(beforeSend()).resolves.toBeUndefined();
		});

		it('shows a dismissible warning when credits are low, and still sends', async () => {
			setCredits(100, 95);
			const { getByTestId, queryByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			expect(getByTestId('credit-warning-banner-stub')).toHaveAttribute('data-dismissible', 'true');
			await expect(beforeSend()).resolves.toBeUndefined();

			await userEvent.click(getByTestId('credit-warning-banner-dismiss'));

			expect(queryByTestId('credit-warning-banner-stub')).not.toBeInTheDocument();
		});

		it('disables the composer, refuses host sends and shows a banner that cannot be dismissed when no credits are left', async () => {
			setCredits(100, 100);
			const { getByTestId, queryByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			const banner = getByTestId('credit-warning-banner-stub');
			expect(banner).toHaveAttribute('data-dismissible', 'false');
			expect(queryByTestId('credit-warning-banner-dismiss')).not.toBeInTheDocument();
			expect(banner).toHaveTextContent("You've run out of Assistant credits");
			expect(panelProps.current.disabled).toBe(true);
			await expect(beforeSend()).rejects.toThrow();
		});

		it('sends again once credits come back', async () => {
			setCredits(100, 100);
			renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			await expect(beforeSend()).rejects.toThrow();

			setCredits(200, 100);
			await flushPromises();

			expect(panelProps.current.disabled).toBe(false);
			await expect(beforeSend()).resolves.toBeUndefined();
		});
	});

	describe('skill artifacts', () => {
		async function renderWithSkill() {
			const result = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();
			chatMessages.value = [skillMessage('tc-1', 'create')];
			await flushPromises();
			return result;
		}

		it('opens the skill that the Assistant writes and reloads it on the next update', async () => {
			const { getByTestId } = await renderWithSkill();

			expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
			const skillPreview = getByTestId('skill-preview-stub');
			expect(skillPreview).toHaveAttribute('data-skill-id', 'skill-1');
			const firstKey = Number(skillPreview.dataset.refreshKey);

			chatMessages.value = [...chatMessages.value, skillMessage('tc-2', 'update')];
			await flushPromises();

			expect(getByTestId('skill-preview-stub')).toHaveAttribute(
				'data-refresh-key',
				String(firstKey + 1),
			);
		});

		it.each([
			{ destination: 'another skill', tab: { type: 'skill', id: 'skill-2', name: 'Other' } },
			{ destination: 'a workflow', tab: { type: 'workflow', id: 'wf-1', name: 'Workflow' } },
		])('keeps the unsaved skill draft after the user visits $destination', async ({ tab }) => {
			const { getByTestId, queryByTestId } = await renderWithSkill();
			await fireEvent.update(getByTestId('skill-preview-draft'), 'Unsaved instructions');

			tabBarTabToOpen.current = tab;
			await userEvent.click(getByTestId('tab-bar-open-tab'));
			await flushPromises();
			if (tab.type === 'skill') {
				expect(getByTestId('skill-preview-stub')).toHaveAttribute('data-skill-id', 'skill-2');
				expect(getByTestId('skill-preview-draft')).toHaveValue('');
			} else {
				expect(queryByTestId('skill-preview-stub')).not.toBeInTheDocument();
			}

			tabBarTabToOpen.current = { type: 'skill', id: 'skill-1', name: 'Tone guide' };
			await userEvent.click(getByTestId('tab-bar-open-tab'));
			await flushPromises();

			expect(getByTestId('skill-preview-stub')).toHaveAttribute('data-skill-id', 'skill-1');
			expect(getByTestId('skill-preview-draft')).toHaveValue('Unsaved instructions');
		});

		it('opens a skill from the artifacts panel', async () => {
			if (threadArea.width) threadArea.width.value = 1200;
			const { getByTestId, queryByTestId } = await renderWithSkill();
			// The panel shows only while the preview is hidden.
			await userEvent.click(getByTestId('tab-bar-preview-toggle'));
			await flushPromises();
			expect(queryByTestId('skill-preview-stub')).not.toBeInTheDocument();

			await userEvent.click(getByTestId('artifacts-panel-open-skill'));
			await flushPromises();

			expect(getByTestId('skill-preview-stub')).toHaveAttribute('data-skill-id', 'skill-1');
		});
	});

	describe('app chats', () => {
		const APP_ID = '019a4012-272c-7313-91af-5c94a3d819a9';
		const OTHER_APP_ID = '019a4012-272c-7313-91af-5c94a3d819aa';

		function clientContext(): Record<string, unknown> {
			return (panelProps.current['client-context'] as () => Record<string, unknown>)();
		}

		it('opens the app of a new thread and binds it with the first message', async () => {
			routeQuery.appId = APP_ID;
			stashAssistantAgentLaunch('thread-new', {
				projectId: 'project-1',
				source: 'app_builder_page',
				origin: 'internal',
				subject: { type: 'app', id: APP_ID, projectId: 'project-1', name: 'Portal' },
			});

			const { getByTestId } = renderView({
				props: { threadId: 'thread-new', projectId: 'project-1' },
			});
			await flushPromises();

			expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
			expect(appPreviewProps.current).toMatchObject({
				'project-id': 'project-1',
				'app-id': APP_ID,
			});
			const subject = { type: 'app', id: APP_ID, projectId: 'project-1', name: 'Portal' };
			expect(clientContext()).toMatchObject({ subject });

			// A refused send keeps the app for the retry.
			const onMessageAccepted = panelProps.current.onMessageAccepted as AcceptMessage;
			onMessageAccepted({ clientContext: clientContext() });
			expect(clientContext()).toMatchObject({ subject });

			const onSessionCreated = panelProps.current.onSessionCreated as () => void;
			onSessionCreated();
			expect(clientContext()).not.toHaveProperty('subject');
		});

		it('sends a pending app without opening a preview', async () => {
			stashAssistantAgentLaunch('thread-new', {
				projectId: 'project-1',
				source: 'app_builder_page',
				origin: 'internal',
				subject: { type: 'app', id: APP_ID, projectId: 'project-1', pending: true },
			});

			renderView({ props: { threadId: 'thread-new', projectId: 'project-1' } });
			await flushPromises();

			expect(appPreviewProps.current).toBeUndefined();
			expect(clientContext()).toMatchObject({
				subject: { type: 'app', id: APP_ID, projectId: 'project-1', pending: true },
			});
		});

		it('opens the app from the URL among the apps of the thread metadata', async () => {
			routeQuery.appId = OTHER_APP_ID;
			useAssistantAgentThreadsStore().openedThreads = [
				{
					id: 'thread-1',
					title: 'Apps',
					updatedAt: '2026-11-02T10:00:00.000Z',
					projectId: 'project-1',
					metadata: {
						instanceAiAppTargets: [
							{ appId: APP_ID, projectId: 'project-1' },
							{ appId: OTHER_APP_ID, projectId: 'project-1', name: 'Other' },
						],
					},
				},
			];

			renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();

			expect(appPreviewProps.current).toMatchObject({ 'app-id': OTHER_APP_ID });
			expect(clientContext()).not.toHaveProperty('subject');
		});

		it('ignores an app in the URL that the thread does not have', async () => {
			routeQuery.appId = OTHER_APP_ID;

			renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();

			expect(appPreviewProps.current).toBeUndefined();
		});
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
			authorship: { kind: 'prefill', prefillType: 'handoff_setup_panel_execute' },
			handoffContext: context,
		});

		expect(sendMessageFromOutside).toHaveBeenCalledWith('Test the workflow', [], { context });
		const onMessageSending = panelProps.current.onMessageSending as (payload: unknown) => void;
		onMessageSending({ text: 'Test the workflow', files: [], isFirstMessage: false });
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
			expect.objectContaining({ prefill_type: 'handoff_setup_panel_execute' }),
		);
		const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
		expect(clientContext()).not.toHaveProperty('context');
	});

	describe('fix with AI', () => {
		const failureReport: WorkflowFailuresReport = {
			workflowId: 'wf-1',
			executionId: 'exec-1',
			errors: [{ nodeName: 'Extract Emails', errorMessage: 'Intentional break' }],
		};

		async function renderWithFailedRun(report = failureReport) {
			const result = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();
			chatMessages.value = [buildMessage('tc-1')];
			await flushPromises();

			await reportFailure(report);
			return result;
		}

		async function reportFailure(report: WorkflowFailuresReport) {
			const onWorkflowFailures = previewProps.current?.onWorkflowFailures as (
				report: WorkflowFailuresReport,
			) => void;
			onWorkflowFailures(report);
			await flushPromises();
		}

		async function reportSuccess(workflowId: string) {
			const onWorkflowSucceeded = previewProps.current?.onWorkflowSucceeded as (
				workflowId: string,
			) => void;
			onWorkflowSucceeded(workflowId);
			await flushPromises();
		}

		it('passes no offers to the chat without a failed run', async () => {
			renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();

			expect(panelSlots.current).not.toContain('inline-offers');
		});

		it('offers a fix when a preview run fails', async () => {
			const { getByTestId } = await renderWithFailedRun();

			expect(getByTestId('instance-ai-fix-with-ai-panel')).toHaveTextContent('Extract Emails');
		});

		it('sends the fix prompt with the failed execution through the chat, and hides the offer', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = await renderWithFailedRun();

			await user.click(getByTestId('instance-ai-fix-with-ai-button'));

			expect(sendMessageFromOutside).not.toHaveBeenCalled();
			expect(sendHostMessage).toHaveBeenCalledOnce();
			const [prompt, clientContext] = sendHostMessage.mock.calls[0];
			expect(prompt).toContain('Extract Emails');
			expect(prompt).toContain('Intentional break');
			expect(clientContext).toEqual({
				attachments: [{ type: 'workflow', id: 'wf-1', name: 'Untitled', executionId: 'exec-1' }],
			});
			expect(queryByTestId('instance-ai-fix-with-ai-panel')).not.toBeInTheDocument();
			const onMessageSending = panelProps.current.onMessageSending as (payload: unknown) => void;
			onMessageSending({ text: prompt, files: [], isFirstMessage: false });
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({ prefill_type: 'handoff_fix_with_ai', prompt_modified: false }),
			);
		});

		it('offers the fix again when the chat refuses the send', async () => {
			sendHostMessage.mockResolvedValue('busy');
			const user = userEvent.setup();
			const { getByTestId } = await renderWithFailedRun();

			await user.click(getByTestId('instance-ai-fix-with-ai-button'));
			await flushPromises();

			expect(getByTestId('instance-ai-fix-with-ai-panel')).toBeInTheDocument();
		});

		it('hides the offer after dismiss until another run fails', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = await renderWithFailedRun();

			await user.click(getByTestId('instance-ai-fix-with-ai-dismiss'));
			expect(queryByTestId('instance-ai-fix-with-ai-panel')).not.toBeInTheDocument();

			await reportFailure({ ...failureReport, executionId: 'exec-2' });
			expect(getByTestId('instance-ai-fix-with-ai-panel')).toBeInTheDocument();
		});

		it('hides the offer while the chat is busy', async () => {
			const { queryByTestId } = await renderWithFailedRun();

			isBusy.value = true;
			await flushPromises();

			expect(queryByTestId('instance-ai-fix-with-ai-panel')).not.toBeInTheDocument();
		});

		it('hides the offer while no credits are left, and offers it again once they come back', async () => {
			const { queryByTestId } = await renderWithFailedRun();
			const creditsStore = useAssistantCreditsStore();

			creditsStore.creditsQuota = 100;
			creditsStore.creditsClaimed = 100;
			await flushPromises();
			expect(queryByTestId('instance-ai-fix-with-ai-panel')).not.toBeInTheDocument();

			creditsStore.creditsQuota = 200;
			await flushPromises();
			expect(queryByTestId('instance-ai-fix-with-ai-panel')).toBeInTheDocument();
		});

		it('clears the offer when a later run of the same workflow succeeds', async () => {
			const { queryByTestId } = await renderWithFailedRun();

			await reportSuccess('wf-other');
			expect(queryByTestId('instance-ai-fix-with-ai-panel')).toBeInTheDocument();

			await reportSuccess('wf-1');
			expect(queryByTestId('instance-ai-fix-with-ai-panel')).not.toBeInTheDocument();
		});
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

	it('opens the session timeline of the thread from the header', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		await fireEvent.click(getByTestId('assistant-agent-view-session'));

		expect(routerPush).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_SESSION_VIEW,
			params: { threadId: 'thread-1' },
		});
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

	describe('answer rating', () => {
		it('shows the thumbs under the latest answer and sends the rating of its turn', async () => {
			chatMessages.value = [
				{ id: 'u1', role: 'user', content: 'Hi' },
				{ id: 'a1', role: 'assistant', content: 'Hello', executionId: 'exec-1' },
				{ id: 'u2', role: 'user', content: 'Build it' },
				{ id: 'a2', role: 'assistant', content: 'Done', executionId: 'exec-2' },
			];
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			expect(
				within(getByTestId('message-actions-a1')).queryByTestId('message-thumbs-up-button'),
			).not.toBeInTheDocument();
			const latest = within(getByTestId('message-actions-a2'));
			await fireEvent.click(latest.getByTestId('message-thumbs-up-button'));

			expect(postFeedback).toHaveBeenCalledWith(expect.anything(), 'thread-1', {
				executionId: 'exec-2',
				rating: 'up',
			});
			expect(latest.getByTestId('message-rating-success')).toBeInTheDocument();
		});
	});

	describe('stored tabs', () => {
		const storedState: AssistantThreadTabsState = {
			tabs: [{ type: 'workflow', id: 'wf-9', name: 'Opened by hand' }],
			closedTabs: [],
			activeTab: { type: 'workflow', id: 'wf-9' },
			previewOpen: true,
		};

		afterEach(() => {
			sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		});

		it('shows the stored tabs and the open preview of a thread opened by URL', async () => {
			fetchTabs.mockResolvedValue({ state: storedState });

			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();

			expect(fetchTabs).toHaveBeenCalledWith(expect.anything(), 'thread-1');
			expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
			expect(previewProps.current).toMatchObject({ 'workflow-id': 'wf-9' });
		});

		it('does not load stored tabs for a new thread', async () => {
			stashPendingAssistantAgentMessage({
				threadId: 'thread-new',
				text: 'Build a digest',
				files: [],
				references: [],
				authorship: USER_TYPED_MESSAGE,
				mentionCounts: EMPTY_ASSISTANT_MENTION_COUNTS,
			});

			renderView({ props: { threadId: 'thread-new', projectId: 'project-1' } });
			await flushPromises();

			expect(fetchTabs).not.toHaveBeenCalled();
		});

		it('stores the tabs when the user closes the preview', async () => {
			sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0');
			fetchTabs.mockResolvedValue({ state: storedState });
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();

			await fireEvent.click(getByTestId('tab-bar-preview-toggle'));
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(saveTabs).toHaveBeenLastCalledWith(expect.anything(), 'thread-1', {
				...storedState,
				previewOpen: false,
			});
		});

		it('sends the open tabs to the Assistant with each message', async () => {
			fetchTabs.mockResolvedValue({ state: storedState });
			renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();

			const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
			expect(clientContext().threadArtifacts).toEqual({
				artifacts: [{ type: 'workflow', id: 'wf-9', name: 'Opened by hand' }],
				activeId: 'wf-9',
			});
		});

		it('names the run that the user started in the preview of a tab', async () => {
			fetchTabs.mockResolvedValue({ state: storedState });
			renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();

			// The preview remembers the run on the thread when the run starts.
			previewThread.current?.rememberManualExecution('wf-9', 'exec-1', undefined);

			const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
			expect(clientContext().threadArtifacts).toEqual({
				artifacts: [
					{ type: 'workflow', id: 'wf-9', name: 'Opened by hand', executionId: 'exec-1' },
				],
				activeId: 'wf-9',
			});
		});

		it('sends no tabs until the stored tabs load', async () => {
			fetchTabs.mockReturnValue(new Promise(() => {}));
			renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();

			const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
			expect(clientContext()).not.toHaveProperty('threadArtifacts');
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
	describe('picked app element', () => {
		const element = (overrides: Partial<InstanceAiElementAttachment> = {}) =>
			({
				type: 'element',
				appId: 'app-1',
				tagName: 'button',
				text: 'Save',
				...overrides,
			}) satisfies InstanceAiElementAttachment;

		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
		});

		async function renderThread() {
			const result = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			return result;
		}

		it('moves the element that the preview adds to the chat into one composer chip', async () => {
			await renderThread();
			const store = useInstanceAiStore();

			store.stageElement(element());
			await flushPromises();

			expect(store.pendingComposerAttachments).toEqual([]);
			expect(composerAttachments.value).toEqual([
				{
					chip: { id: 'element', label: 'button: "Save"', icon: 'mouse-pointer' },
					clientContextPatch: { attachments: [element()] },
				},
			]);
		});

		it('replaces the earlier element of the app when another one is picked', async () => {
			await renderThread();
			const store = useInstanceAiStore();
			store.stageElement(element());
			await flushPromises();

			store.stageElement(element({ tagName: 'h1', text: 'Title' }));
			await flushPromises();

			expect(composerAttachments.value.map(({ chip }) => chip.label)).toEqual(['h1: "Title"']);
		});

		it('keeps the element next to staged canvas nodes', async () => {
			await renderThread();
			const store = useInstanceAiStore();

			store.stageNodeSets('wf-1', [nodeSet('Webhook')]);
			store.stageElement(element());
			await flushPromises();

			expect(composerAttachments.value.map(({ chip }) => chip.id)).toEqual([
				'nodes:wf-1',
				'element',
			]);
		});

		it('keeps one element, and follows it to the app of the latest pick', async () => {
			await renderThread();
			const store = useInstanceAiStore();
			store.stageElement(element());
			await flushPromises();

			store.stageElement(element({ appId: 'app-2', tagName: 'h1', text: 'Title' }));
			await flushPromises();

			expect(composerAttachments.value.map(({ chip }) => chip.label)).toEqual(['h1: "Title"']);
			expect(store.hasComposerElementFor('app-1')).toBe(false);
			expect(store.hasComposerElementFor('app-2')).toBe(true);
		});

		it('tells the store which app has an element in the composer, until the chip is gone', async () => {
			await renderThread();
			const store = useInstanceAiStore();
			expect(store.hasComposerElementFor('app-1')).toBe(false);

			store.stageElement(element());
			await flushPromises();
			expect(store.hasComposerElementFor('app-1')).toBe(true);

			composerAttachments.value = [];
			await flushPromises();
			expect(store.hasComposerElementFor('app-1')).toBe(false);
		});
	});

	describe('hand-offs from other pages', () => {
		const credentialContext = {
			source: 'credential-modal' as const,
			credential: { credentialType: 'slackApi', displayName: 'Slack API' },
		};

		beforeEach(() => {
			// The store moves the staged nodes for real.
			setActivePinia(createTestingPinia({ stubActions: false }));
			stashAssistantAgentLaunch('thread-new', {
				projectId: 'project-1',
				source: 'website-template',
				origin: 'external',
				templateId: '42',
			});
		});

		async function renderNewThread() {
			const result = renderView({ props: { threadId: 'thread-new', projectId: 'project-1' } });
			await flushPromises();
			return result;
		}

		function clientContext(): Record<string, unknown> {
			return (panelProps.current['client-context'] as () => Record<string, unknown>)();
		}

		it('opens a launched thread as a new session that the server does not know yet', async () => {
			await renderNewThread();

			expect(panelProps.current['new-session']).toBe(true);
			expect(useAssistantAgentThreadsStore().loadThread).not.toHaveBeenCalled();
			expect(fetchTabs).not.toHaveBeenCalled();
		});

		it('sends the opening message with its references and context until it is accepted', async () => {
			const reference = { type: 'workflow' as const, id: 'wf-1', name: 'Digest' };
			stashPendingFirstMessage('thread-new', {
				message: 'Where do I find the Slack token?',
				attachments: [reference],
				context: credentialContext,
				authorship: { kind: 'prefill', prefillType: 'handoff_credential_setup' },
			});

			await renderNewThread();

			expect(sendMessageFromOutside).toHaveBeenCalledWith('Where do I find the Slack token?', []);
			expect(clientContext()).toMatchObject({
				attachments: [reference],
				context: credentialContext,
			});
			const onMessageSending = panelProps.current.onMessageSending as (payload: unknown) => void;
			onMessageSending({
				text: 'Where do I find the Slack token?',
				files: [],
				isFirstMessage: true,
			});
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({
					is_first_message: true,
					prefill_type: 'handoff_credential_setup',
				}),
			);

			const onMessageAccepted = panelProps.current.onMessageAccepted as AcceptMessage;
			onMessageAccepted({ clientContext: clientContext() });
			expect(clientContext()).not.toHaveProperty('attachments');
			expect(clientContext()).not.toHaveProperty('context');
		});

		it('opens the handed-off workflow and sends it with the first message', async () => {
			stashPendingWorkflowAttachment('thread-new', {
				type: 'workflow',
				id: 'wf-7',
				name: 'Handed off',
			});

			const { getByTestId } = await renderNewThread();
			isLoadingHistory.value = false;
			await flushPromises();

			expect(sendMessageFromOutside).not.toHaveBeenCalled();
			expect(getByTestId('assistant-agent-preview-panel')).toBeVisible();
			expect(previewProps.current).toMatchObject({ 'workflow-id': 'wf-7' });
			expect(clientContext()).toMatchObject({
				attachments: [{ type: 'workflow', id: 'wf-7', name: 'Handed off' }],
			});
		});

		it('puts a handed-off draft into the composer without sending it', async () => {
			stashPendingComposerDraft('thread-new', {
				text: 'Suggest my preferences',
				prefillType: 'preferences_suggestion',
			});

			await renderNewThread();

			expect(setDraft).toHaveBeenCalledWith('Suggest my preferences');
			expect(sendMessageFromOutside).not.toHaveBeenCalled();
			const onMessageSending = panelProps.current.onMessageSending as (payload: unknown) => void;
			onMessageSending({ text: 'Suggest my preferences', files: [], isFirstMessage: true });
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({
					prefill_type: 'preferences_suggestion',
					prompt_modified: false,
				}),
			);
		});

		it('adds handed-off canvas nodes to the composer', async () => {
			stashPendingDraftAttachment('thread-new', [nodeSet('Webhook')], 'wf-1');

			await renderNewThread();

			expect(stagedNodes()).toEqual([
				{
					id: 'nodes:wf-1',
					attachments: [{ type: 'nodes', workflowId: 'wf-1', sets: [nodeSet('Webhook')] }],
				},
			]);
		});

		it('sends a handed-off opening message once', async () => {
			stashPendingFirstMessage('thread-new', {
				message: 'Adjust template 42',
				authorship: { kind: 'prefill', prefillType: 'template_adjustment' },
			});
			const { unmount } = await renderNewThread();
			expect(sendMessageFromOutside).toHaveBeenCalledWith('Adjust template 42', []);
			unmount();
			sendMessageFromOutside.mockReset();

			await renderNewThread();

			expect(sendMessageFromOutside).not.toHaveBeenCalled();
		});

		it('keeps a handed-off workflow and draft until the server accepts the first message', async () => {
			stashPendingWorkflowAttachment('thread-new', { type: 'workflow', id: 'wf-7' });
			stashPendingComposerDraft('thread-new', {
				text: 'Suggest my preferences',
				prefillType: 'preferences_suggestion',
			});
			const { unmount } = await renderNewThread();
			unmount();
			setDraft.mockReset();

			await renderNewThread();
			expect(setDraft).toHaveBeenCalledWith('Suggest my preferences');
			expect(clientContext()).toMatchObject({ attachments: [{ type: 'workflow', id: 'wf-7' }] });

			const onSessionCreated = panelProps.current.onSessionCreated as () => void;
			onSessionCreated();
			expect(getPendingWorkflowAttachment('thread-new')).toBeNull();
			expect(getPendingComposerDraft('thread-new')).toBeNull();
		});

		it('drops the launch marker once the server accepts the first message', async () => {
			await renderNewThread();
			expect(getAssistantAgentLaunch('thread-new')).toEqual({ projectId: 'project-1' });

			const onSessionCreated = panelProps.current.onSessionCreated as () => void;
			onSessionCreated();

			expect(getAssistantAgentLaunch('thread-new')).toBeUndefined();
		});
	});

	describe('agent subject of a new thread', () => {
		function launchWith(subject: Record<string, unknown>) {
			stashAssistantAgentLaunch('thread-new', {
				projectId: 'project-1',
				source: 'agent_builder_page',
				origin: 'internal',
				subject: { type: 'agent', id: 'agent-1', projectId: 'project-1', ...subject } as never,
			});
		}

		async function renderNewThread() {
			const view = renderView({ props: { threadId: 'thread-new', projectId: 'project-1' } });
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();
			return view;
		}

		function clientContext(): Record<string, unknown> {
			return (panelProps.current['client-context'] as () => Record<string, unknown>)();
		}

		it('opens a saved agent before the first message and binds it with that message', async () => {
			launchWith({ name: 'Triage' });

			const { getByTestId } = await renderNewThread();

			expect(getByTestId('agent-preview-stub')).toBeInTheDocument();
			expect(agentPreview.props).toMatchObject({
				'agent-id': 'agent-1',
				'project-id': 'project-1',
			});
			expect(fetchTargets).not.toHaveBeenCalled();
			expect(clientContext()).toMatchObject({
				subject: { type: 'agent', id: 'agent-1', projectId: 'project-1', name: 'Triage' },
			});
		});

		it('binds a change from the preview once the server accepts the first message', async () => {
			launchWith({ name: 'Triage' });
			await renderNewThread();
			const renamed = { agentId: 'agent-1', projectId: 'project-1', name: 'Refund triage' };

			expect(agentPreview.targets).toBeDefined();
			await agentPreview.targets?.bind(renamed);
			expect(bindTarget).not.toHaveBeenCalled();

			// The first turn bound the subject under its old name.
			fetchTargets.mockResolvedValue({
				targets: {
					bound: { agentId: 'agent-1', projectId: 'project-1', name: 'Triage' },
					pending: null,
					targets: [],
					previewSession: null,
				},
			});
			bindTarget.mockResolvedValue({ targets: noTargets() });
			const onSessionCreated = panelProps.current.onSessionCreated as () => void;
			onSessionCreated();
			await flushPromises();

			expect(bindTarget).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'thread-new', renamed);
		});

		it('sends a pending agent without a preview before the first message', async () => {
			launchWith({ pending: true });

			const { queryByTestId } = await renderNewThread();

			expect(queryByTestId('agent-preview-stub')).not.toBeInTheDocument();
			expect(clientContext()).toMatchObject({
				subject: { type: 'agent', id: 'agent-1', projectId: 'project-1', pending: true },
			});
		});
	});

	describe('agent preview', () => {
		const agentTabs: AssistantThreadTabsState = {
			tabs: [{ type: 'agent', id: 'agent-1', name: 'Triage', projectId: 'project-1' }],
			closedTabs: [],
			activeTab: { type: 'agent', id: 'agent-1' },
			previewOpen: true,
		};
		const boundTargets: AssistantAgentTargetsState = {
			bound: { agentId: 'agent-1', projectId: 'project-1', name: 'Triage' },
			pending: null,
			targets: [{ agentId: 'agent-1', projectId: 'project-1', name: 'Triage' }],
			previewSession: { agentId: 'agent-1', threadId: 'session-1' },
		};

		async function renderAgentTab() {
			fetchTabs.mockResolvedValue({ state: agentTabs });
			fetchTargets.mockResolvedValue({ targets: boundTargets });
			const view = renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();
			return view;
		}

		it('shows the agent builder in an agent tab, with the stored test chat session', async () => {
			const { getByTestId, queryByTestId } = await renderAgentTab();

			expect(getByTestId('agent-preview-stub')).toBeInTheDocument();
			expect(queryByTestId('assistant-agent-agent-preview-notice')).not.toBeInTheDocument();
			expect(fetchTargets).toHaveBeenCalledWith(expect.anything(), 'thread-1');
			expect(agentPreview.props).toMatchObject({
				'agent-id': 'agent-1',
				'project-id': 'project-1',
				'preview-session-id': 'session-1',
				'preview-open': false,
			});
		});

		it('gives the preview the v2 thread, with the agent tab as the active artifact', async () => {
			await renderAgentTab();

			expect(agentPreview.thread?.id).toBe('thread-1');
			expect(agentPreview.thread?.activeArtifactId).toBe('agent-1');
		});

		it('does not load the agents of a new thread before the server accepts its first message', async () => {
			stashPendingAssistantAgentMessage({
				threadId: 'thread-new',
				text: 'Build an agent',
				files: [],
				references: [],
				authorship: USER_TYPED_MESSAGE,
			});
			renderView({ props: { threadId: 'thread-new', projectId: 'project-1' } });
			await flushPromises();
			expect(fetchTargets).not.toHaveBeenCalled();

			(panelProps.current.onSessionCreated as () => void)();
			await flushPromises();

			expect(fetchTargets).toHaveBeenCalledWith(expect.anything(), 'thread-new');
		});

		it('loads the agents again after each turn', async () => {
			await renderAgentTab();
			fetchTargets.mockClear();
			const onStreaming = panelProps.current['onUpdate:streaming'] as (value: boolean) => void;

			onStreaming(true);
			await flushPromises();
			expect(fetchTargets).not.toHaveBeenCalled();

			onStreaming(false);
			await flushPromises();
			expect(fetchTargets).toHaveBeenCalledTimes(1);
		});

		it('binds a renamed agent through the Assistant agent thread routes', async () => {
			await renderAgentTab();
			bindTarget.mockResolvedValue({
				targets: { ...boundTargets, bound: { ...boundTargets.bound, name: 'Support' } },
			});

			await agentPreview.targets?.bind({
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Support',
			});
			// The bound name is current now, so a second save sends nothing.
			await agentPreview.targets?.bind({
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Support',
			});

			expect(bindTarget).toHaveBeenCalledTimes(1);
			expect(bindTarget).toHaveBeenCalledWith(expect.anything(), 'thread-1', {
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Support',
			});
		});

		it('saves a pending agent through the Assistant agent thread routes', async () => {
			await renderAgentTab();
			const agent = { id: 'agent-2', name: 'New agent' };
			persistAgent.mockResolvedValue({
				agent,
				targets: { ...boundTargets, bound: { agentId: 'agent-2', projectId: 'project-1' } },
			});
			const request = { projectId: 'project-1', agentId: 'agent-2', name: 'New agent' };

			const result = await agentPreview.targets?.persistPendingAgent(request);

			expect(persistAgent).toHaveBeenCalledWith(expect.anything(), 'thread-1', request);
			expect(result?.agent).toBe(agent);
		});

		it('docks the test chat over the chat, and closes it when the preview closes', async () => {
			const { getByTestId, queryByTestId } = await renderAgentTab();

			agentPreview.emit?.('preview-open-change', true);
			await flushPromises();
			expect(agentPreview.props).toMatchObject({ 'preview-open': true });
			expect(agentPreview.props?.['preview-chat-target']).toBeInstanceOf(HTMLElement);

			await userEvent.click(getByTestId('tab-bar-preview-toggle'));
			await flushPromises();
			expect(queryByTestId('agent-preview-stub')).not.toBeInTheDocument();

			// The preview shows again with the test chat closed.
			await userEvent.click(getByTestId('assistant-agent-preview-toggle'));
			await flushPromises();
			expect(agentPreview.props).toMatchObject({ 'preview-open': false });
		});

		it('hands a test chat off to the composer, with its context for the next message', async () => {
			await renderAgentTab();
			agentPreview.emit?.('preview-open-change', true);
			await flushPromises();
			const onAccepted = vi.fn();

			agentPreview.emit?.('assistant-handoff', {
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'session-2',
				agentName: 'Triage',
				sessionTitle: 'Refund question',
				initialDraft: { text: 'Why did it refuse?', prefillType: 'agent_preview' },
				onAccepted,
			});
			await flushPromises();

			expect(composerAttachments.value).toEqual([
				{
					chip: expect.objectContaining({ id: 'agent-preview-session', icon: 'bot' }),
					clientContextPatch: {
						context: expect.objectContaining({
							source: 'agent-preview',
							agentId: 'agent-1',
							threadId: 'session-2',
						}),
					},
				},
			]);
			expect(setDraft).toHaveBeenCalledWith('Why did it refuse?');
			expect(onAccepted).toHaveBeenCalled();
			const onMessageSending = panelProps.current.onMessageSending as (payload: unknown) => void;
			onMessageSending({ text: 'Why did it refuse? Be brief.', files: [], isFirstMessage: false });
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({ prefill_type: 'agent_preview', prompt_modified: true }),
			);
			// A cleared composer drops the pre-fill, so the next message is the user's.
			(panelProps.current.onDraftCleared as () => void)();
			telemetryTrack.mockClear();
			onMessageSending({ text: 'Thanks', files: [], isFirstMessage: false });
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({ prefill_type: null }),
			);
			// The staged session is the one that the preview shows.
			expect(agentPreview.props).toMatchObject({
				'preview-open': false,
				'preview-session-id': 'session-2',
			});
		});

		it('keeps the hand-off session after its message is sent, while the turn runs', async () => {
			await renderAgentTab();

			agentPreview.emit?.('assistant-handoff', {
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'session-2',
			});
			await flushPromises();

			// The message is sent. The stored session is the one of the last turn until the turn ends.
			composerAttachments.value = [];
			const onStreaming = panelProps.current['onUpdate:streaming'] as (value: boolean) => void;
			onStreaming(true);
			await flushPromises();
			expect(agentPreview.props).toMatchObject({ 'preview-session-id': 'session-2' });

			// A load at the end of the turn that still has the earlier session does not replace it.
			onStreaming(false);
			await flushPromises();
			expect(agentPreview.props).toMatchObject({ 'preview-session-id': 'session-2' });
		});

		it('keeps the stored session of another agent after a hand-off', async () => {
			fetchTabs.mockResolvedValue({
				state: {
					...agentTabs,
					tabs: [
						...agentTabs.tabs,
						{ type: 'agent', id: 'agent-2', name: 'Billing', projectId: 'project-1' },
					],
				},
			});
			fetchTargets.mockResolvedValue({
				targets: { ...boundTargets, previewSession: { agentId: 'agent-2', threadId: 'session-9' } },
			});
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();
			isLoadingHistory.value = false;
			await flushPromises();

			agentPreview.emit?.('assistant-handoff', {
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'session-2',
			});
			await flushPromises();
			tabBarTabToOpen.current = {
				type: 'agent',
				id: 'agent-2',
				name: 'Billing',
				projectId: 'project-1',
			};
			await userEvent.click(getByTestId('tab-bar-open-tab'));
			await flushPromises();

			expect(agentPreview.props).toMatchObject({
				'agent-id': 'agent-2',
				'preview-session-id': 'session-9',
			});
		});

		it('keeps an unsent draft and does not hand off', async () => {
			await renderAgentTab();
			isDirty.mockReturnValue(true);
			const onAccepted = vi.fn();

			agentPreview.emit?.('assistant-handoff', {
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'session-2',
				onAccepted,
			});
			await flushPromises();

			expect(composerAttachments.value).toEqual([]);
			expect(onAccepted).not.toHaveBeenCalled();
		});

		it('ignores a hand-off from an agent that is no longer active', async () => {
			await renderAgentTab();

			agentPreview.emit?.('assistant-handoff', {
				projectId: 'project-1',
				agentId: 'agent-other',
				threadId: 'session-2',
			});
			await flushPromises();

			expect(composerAttachments.value).toEqual([]);
		});
	});

	describe('mentions', () => {
		const workflowMention = {
			item: {
				key: 'workflow:wf-1:wf-1',
				kind: 'workflow',
				source: 'workflows',
				label: 'Uptime monitor',
				breadcrumbs: ['Uptime monitor'],
				workflowId: 'wf-1',
				entityId: 'wf-1',
				workflowName: 'Uptime monitor',
			},
			attachment: { type: 'workflow', id: 'wf-1', name: 'Uptime monitor' },
			truncated: false,
			telemetry: { mode: 'browse', resultPosition: 1, queryLength: 0 },
		};
		const agentMention = {
			item: {
				key: 'agent:agent-1',
				kind: 'agent',
				source: 'agents',
				label: 'Support agent',
				breadcrumbs: ['Support agent'],
				entityId: 'agent-1',
				projectId: 'project-1',
			},
			attachment: { type: 'agent', id: 'agent-1', name: 'Support agent', projectId: 'project-1' },
			truncated: false,
		};
		const nodeMention = {
			item: {
				key: 'node:wf-1:id-Slack',
				kind: 'node',
				source: 'artifacts',
				label: 'Slack',
				breadcrumbs: ['Uptime monitor', 'Slack'],
				workflowId: 'wf-1',
				entityId: 'id-Slack',
				workflowName: 'Uptime monitor',
			},
			attachment: {
				type: 'nodes',
				workflowId: 'wf-1',
				workflowName: 'Uptime monitor',
				sets: [{ nodes: [{ id: 'id-Slack', name: 'Slack' }] }],
			},
			truncated: false,
		};

		async function pick(selection: unknown, getByTestId: (id: string) => HTMLElement) {
			mentionSelection.current = selection;
			await userEvent.click(getByTestId('mention-picker-stub'));
			await flushPromises();
		}

		it('hides the picker when mentions are off', async () => {
			mentionsEnabled.current = false;
			const { queryByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			expect(queryByTestId('mention-picker-stub')).not.toBeInTheDocument();
		});

		it('stages a mentioned workflow or agent as a chip that sends it in the client context', async () => {
			const { getByTestId, getAllByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			await pick(workflowMention, getByTestId);
			await pick(agentMention, getByTestId);

			expect(stagedNodes()).toEqual([
				{ id: 'mention:workflow:wf-1', attachments: [workflowMention.attachment] },
				{ id: 'mention:agent:agent-1', attachments: [agentMention.attachment] },
			]);
			expect(getAllByTestId('agent-chat-composer-chip').map((chip) => chip.textContent)).toEqual([
				'Uptime monitor',
				'Support agent',
			]);
			expect(mentionPickerProps.current?.['excluded-keys']).toEqual([
				'workflow:wf-1:wf-1',
				'agent:agent-1',
			]);
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION,
				expect.objectContaining({ thread_id: 'thread-1', kind: 'workflow', source: 'workflows' }),
			);
		});

		it('adds a mentioned node to the nodes chip of its workflow', async () => {
			// The canvas staged a node of the same workflow.
			composerAttachments.value = [
				{
					chip: { id: 'nodes:wf-1', label: '1 node', icon: 'layers' },
					clientContextPatch: {
						attachments: [{ type: 'nodes', workflowId: 'wf-1', sets: [nodeSet('Webhook')] }],
					},
				},
			];
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			await pick(nodeMention, getByTestId);

			expect(stagedNodes()).toEqual([
				{
					id: 'nodes:wf-1',
					attachments: [
						{
							type: 'nodes',
							workflowId: 'wf-1',
							sets: [nodeSet('Webhook'), nodeSet('Slack')],
						},
					],
				},
			]);
		});

		it('refuses a mention past the attachment limit of a message', async () => {
			composerAttachments.value = Array.from({ length: 10 }, (_, index) => ({
				chip: { id: `mention:workflow:wf-${index}`, label: `Workflow ${index}` },
				clientContextPatch: { attachments: [{ type: 'workflow', id: `wf-${index}` }] },
			}));
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			await pick(agentMention, getByTestId);

			expect(composerAttachments.value).toHaveLength(10);
			expect(showError).toHaveBeenCalled();
		});

		it('reports the staged mentions with the sent message, and opens the mentioned workflow', async () => {
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();
			await pick(workflowMention, getByTestId);
			await pick(agentMention, getByTestId);
			// The context that the panel sends: the host context with the staged chip patches.
			const hostContext = panelProps.current['client-context'] as () => Record<string, unknown>;
			const clientContext = mergeClientContextPatches(composerAttachments.value, hostContext());
			expect(clientContext?.attachments).toEqual([
				workflowMention.attachment,
				agentMention.attachment,
			]);

			const onMessageSending = panelProps.current.onMessageSending as (payload: {
				text: string;
				files: File[];
				clientContext?: Record<string, unknown>;
				isFirstMessage: boolean;
			}) => void;
			onMessageSending({ text: 'Compare them', files: [], clientContext, isFirstMessage: false });
			(panelProps.current.onMessageAccepted as AcceptMessage)({ clientContext });
			await flushPromises();

			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({
					mention_counts: { total: 2, workflow: 1, node: 0, group: 0, agent: 1 },
				}),
			);
			expect(getByTestId('workflow-preview-stub')).toBeInTheDocument();
			expect(previewProps.current?.['workflow-id']).toBe('wf-1');
		});

		it('reports no mentions for a send that leaves the staged chips in the composer', async () => {
			const { getByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();
			await pick(agentMention, getByTestId);

			// The answer to a question card sends the text without the client context.
			const onMessageSending = panelProps.current.onMessageSending as (payload: unknown) => void;
			onMessageSending({ text: 'Yes', files: [], isFirstMessage: false });

			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
				expect.objectContaining({ mention_counts: EMPTY_ASSISTANT_MENTION_COUNTS }),
			);
		});

		it('gives a sent message the resources of its client context, and shows them', async () => {
			const { getAllByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			const messageReferences = panelProps.current['message-references'] as (
				context: Record<string, unknown> | undefined,
			) => unknown[];
			expect(
				messageReferences({
					timeZone: 'Europe/Helsinki',
					attachments: [workflowMention.attachment, { type: 'unknown' }],
				}),
			).toEqual([workflowMention.attachment]);

			referencedMessage.value = {
				id: 'u-1',
				role: 'user',
				content: 'Compare them',
				references: [workflowMention.attachment, agentMention.attachment],
			};
			await flushPromises();

			expect(getAllByTestId('attachment-preview-resource').map((chip) => chip.textContent)).toEqual(
				['Uptime monitor', 'Support agent'],
			);
		});

		it('does not show the agent that the thread builds as a reference', async () => {
			// The Agent Builder panel attaches its agent to each message.
			fetchTargets.mockResolvedValue({
				targets: {
					bound: { agentId: 'agent-1', projectId: 'project-1', name: 'Support agent' },
					pending: null,
					targets: [],
					previewSession: null,
				},
			});
			const { getAllByTestId } = renderView({
				props: { threadId: 'thread-1', projectId: 'project-1' },
			});
			await flushPromises();

			referencedMessage.value = {
				id: 'u-1',
				role: 'user',
				content: 'Add a tool',
				references: [workflowMention.attachment, agentMention.attachment],
			};
			await flushPromises();

			expect(getAllByTestId('attachment-preview-resource').map((chip) => chip.textContent)).toEqual(
				['Uptime monitor'],
			);
		});
	});
});
