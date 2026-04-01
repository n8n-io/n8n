<script lang="ts" setup>
import {
	computed,
	nextTick,
	onMounted,
	onUnmounted,
	provide,
	ref,
	useTemplateRef,
	watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
	N8nHeading,
	N8nIconButton,
	N8nResizeWrapper,
	N8nScrollArea,
	N8nText,
} from '@n8n/design-system';
import { useScroll, useWindowSize } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment, InstanceAiMessage as Message } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { useCanvasPreview } from './useCanvasPreview';
import { useEventRelay } from './useEventRelay';
import { useExecutionPushEvents } from './useExecutionPushEvents';
import { INSTANCE_AI_SETTINGS_VIEW, NEW_CONVERSATION_TITLE } from './constants';
import InstanceAiMessage from './components/InstanceAiMessage.vue';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiThreadList from './components/InstanceAiThreadList.vue';
import InstanceAiMemoryPanel from './components/InstanceAiMemoryPanel.vue';
import InstanceAiDebugPanel from './components/InstanceAiDebugPanel.vue';
import InstanceAiArtifactsPanel from './components/InstanceAiArtifactsPanel.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import InstanceAiConfirmationPanel from './components/InstanceAiConfirmationPanel.vue';
import InstanceAiPreviewTabBar from './components/InstanceAiPreviewTabBar.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import InstanceAiWorkflowPreview from './components/InstanceAiWorkflowPreview.vue';
import InstanceAiDataTablePreview from './components/InstanceAiDataTablePreview.vue';

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const pushConnectionStore = usePushConnectionStore();
const rootStore = useRootStore();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { goToUpgrade } = usePageRedirectionHelper();

function goToSettings() {
	void router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}

documentTitle.set('n8n Agent');

// --- Execution tracking via push events ---
const executionTracking = useExecutionPushEvents();

// --- Header title ---
const currentThreadTitle = computed(() => {
	const thread = store.threads.find((t) => t.id === store.currentThreadId);
	if (!thread || thread.title === NEW_CONVERSATION_TITLE) {
		const firstUserMsg = store.messages.find((m) => m.role === 'user');
		if (firstUserMsg?.content) {
			const text = firstUserMsg.content.trim();
			return text.length > 60 ? text.slice(0, 60) + '\u2026' : text;
		}
		return NEW_CONVERSATION_TITLE;
	}
	return thread.title;
});

// --- Canvas / data table preview ---
const preview = useCanvasPreview({
	store,
	route,
	workflowExecutions: executionTracking.workflowExecutions,
});

provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);

// --- Credit warning banner ---
const creditBannerDismissed = ref(false);
watch(
	() => store.isLowCredits,
	(isLow, wasLow) => {
		// Only reset dismissal when transitioning INTO low-credits state
		// (e.g. from >10% to <=10%). Subsequent push updates within the
		// low-credits zone should not re-show a dismissed banner.
		if (isLow && !wasLow) {
			creditBannerDismissed.value = false;
		}
	},
);
const showCreditBanner = computed(() => store.isLowCredits && !creditBannerDismissed.value);

// Load persisted threads from Mastra storage on mount
onMounted(() => {
	pushConnectionStore.pushConnect();
	void store.loadThreads();
	void store.fetchCredits();
	store.startCreditsPushListener();

	// Auto-connect local gateway if enabled
	void settingsStore
		.refreshModuleSettings()
		.catch(() => {})
		.then(() => {
			if (!settingsStore.isLocalGatewayDisabled) {
				settingsStore.startDaemonProbing();
				settingsStore.startGatewayPushListener();
				settingsStore.pollGatewayStatus();
			}
		});
});

// React to local gateway being toggled in settings without requiring a page reload
watch(
	() => settingsStore.isLocalGatewayDisabled,
	(disabled) => {
		if (disabled) {
			settingsStore.stopDaemonProbing();
			settingsStore.stopGatewayPolling();
			settingsStore.stopGatewayPushListener();
		} else {
			settingsStore.startDaemonProbing();
			settingsStore.startGatewayPushListener();
			settingsStore.pollGatewayStatus();
		}
	},
);

// --- Side panels ---
const showArtifactsPanel = ref(true);
const showMemoryPanel = ref(false);
const showDebugPanel = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');

// --- Sidebar resize ---
const sidebarWidth = ref(260);
function handleSidebarResize({ width }: { width: number }) {
	sidebarWidth.value = width;
}

// --- Preview panel resize (when canvas is visible) ---
const { width: windowWidth } = useWindowSize();
const previewPanelWidth = ref(Math.round((windowWidth.value - sidebarWidth.value) / 2));
const isResizingPreview = ref(false);
const previewMaxWidth = computed(() => Math.round((windowWidth.value - sidebarWidth.value) / 2));

// Clamp preview width when the window shrinks
watch(previewMaxWidth, (max) => {
	if (previewPanelWidth.value > max) {
		previewPanelWidth.value = max;
	}
});

function handlePreviewResize({ width }: { width: number }) {
	previewPanelWidth.value = width;
}

// Re-compute default width when preview opens so it starts at 50%
watch(preview.isPreviewVisible, (visible) => {
	if (visible) {
		previewPanelWidth.value = Math.round((windowWidth.value - sidebarWidth.value) / 2);
	}
});

// --- Scroll management ---
const scrollableRef = useTemplateRef<HTMLElement>('scrollable');
// The actual scroll container is the reka-ui viewport inside N8nScrollArea,
// NOT the immediate parent (which is a non-scrolling content wrapper).
const scrollContainerRef = computed(
	() =>
		(scrollableRef.value?.closest('[data-reka-scroll-area-viewport]') as HTMLElement | null) ??
		null,
);
const { arrivedState } = useScroll(scrollContainerRef, {
	throttle: 100,
	offset: { bottom: 100 },
});
const userScrolledUp = ref(false);

watch(
	() => arrivedState.bottom,
	(atBottom) => {
		userScrolledUp.value = !atBottom;
	},
);

// Reset scroll state when switching threads so new content auto-scrolls
watch(
	() => store.currentThreadId,
	() => {
		userScrolledUp.value = false;
		void nextTick(() => {
			chatInputRef.value?.focus();
		});
	},
);

function scrollToBottom(smooth = false) {
	const container = scrollContainerRef.value;
	if (container) {
		container.scrollTo({
			top: container.scrollHeight,
			behavior: smooth ? 'smooth' : 'instant',
		});
	}
}

// Auto-scroll when content height changes (handles text deltas, tool calls,
// sub-agent spawns, results, etc. — anything that grows the DOM).
let contentResizeObserver: ResizeObserver | null = null;

watch(
	scrollableRef,
	(el) => {
		contentResizeObserver?.disconnect();
		if (el) {
			contentResizeObserver = new ResizeObserver(() => {
				if (!userScrolledUp.value) {
					scrollToBottom();
				}
			});
			contentResizeObserver.observe(el);
		}
	},
	{ immediate: true },
);

// --- Chat input ref for auto-focus ---
const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

// --- Floating input dynamic padding ---
const inputContainerRef = useTemplateRef<HTMLElement>('inputContainer');
const inputAreaHeight = ref(120);
let resizeObserver: ResizeObserver | null = null;

watch(
	inputContainerRef,
	(el) => {
		resizeObserver?.disconnect();
		if (el) {
			resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					inputAreaHeight.value = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
				}
			});
			resizeObserver.observe(el);
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	contentResizeObserver?.disconnect();
	resizeObserver?.disconnect();
	executionTracking.cleanup();
	pushConnectionStore.pushDisconnect();
	store.closeSSE();
	store.stopCreditsPushListener();
	settingsStore.stopDaemonProbing();
	settingsStore.stopGatewayPolling();
	settingsStore.stopGatewayPushListener();
});

// --- Route-thread synchronization ---
const routeThreadId = computed(() =>
	typeof route.params.threadId === 'string' ? route.params.threadId : null,
);

watch(
	routeThreadId,
	(threadId) => {
		if (!threadId) {
			// /instance-ai base route (no :threadId) — bootstrap default thread + SSE
			if ((store.threads?.length ?? 0) === 0) {
				store.threads.push({
					id: store.currentThreadId,
					title: NEW_CONVERSATION_TITLE,
					createdAt: new Date().toISOString(),
				});
			}
			if (store.sseState === 'disconnected') {
				void store.loadHistoricalMessages(store.currentThreadId).then(() => {
					void store.loadThreadStatus(store.currentThreadId);
					store.connectSSE();
				});
			}
			return;
		}
		if (threadId === store.currentThreadId) {
			// Re-entering the same thread (e.g. after navigating away and back) —
			// SSE was closed on unmount, reconnect if needed.
			if (store.sseState === 'disconnected') {
				void store.loadHistoricalMessages(threadId).then(() => {
					void store.loadThreadStatus(threadId);
					store.connectSSE();
				});
			}
			return;
		}

		// Clear execution tracking for previous thread
		executionTracking.clearAll();

		// Deep-link hydration: ensure thread exists in sidebar
		if (!store.threads.some((t) => t.id === threadId)) {
			store.threads.push({
				id: threadId,
				title: NEW_CONVERSATION_TITLE,
				createdAt: new Date().toISOString(),
			});
		}
		// switchThread already calls loadHistoricalMessages internally
		store.switchThread(threadId);
	},
	{ immediate: true },
);

// --- Workflow preview ref for iframe relay ---
const workflowPreviewRef =
	useTemplateRef<InstanceType<typeof InstanceAiWorkflowPreview>>('workflowPreview');

const eventRelay = useEventRelay({
	workflowExecutions: executionTracking.workflowExecutions,
	activeWorkflowId: preview.activeWorkflowId,
	getBufferedEvents: executionTracking.getBufferedEvents,
	relay: (event) => workflowPreviewRef.value?.relayPushEvent(event),
});

// ---------------------------------------------------------------------------
// DEV: Mocked messages — covers all distinct UI states for component review.
// Replace `store.messages` with `mockedMessages` in the template to use.
// ---------------------------------------------------------------------------
const mockedMessages: Message[] = [
	// ── 1. User — plain text ──────────────────────────────────────────────────
	{
		id: 'mock-1',
		role: 'user',
		content: 'Create a workflow that sends a Slack message when a new Notion page is created.',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
	},

	// ── 2. User — with image attachment ───────────────────────────────────────
	{
		id: 'mock-2',
		role: 'user',
		content: 'Here is a screenshot of the error I am seeing.',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		attachments: [
			{
				// 1×1 transparent PNG
				data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=',
				mimeType: 'image/png',
				fileName: 'screenshot.png',
			},
		],
	},

	// ── 3. Assistant — plain text, no agentTree ───────────────────────────────
	{
		id: 'mock-3',
		role: 'assistant',
		content:
			"I'll create that workflow for you right away. This is a simple response without any agent activity.",
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
	},

	// ── 4. Assistant — streaming, no content yet (blinking cursor) ────────────
	{
		id: 'mock-4',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: true,
	},

	// ── 5. Assistant — agent active, status message only ──────────────────────
	{
		id: 'mock-5',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: true,
		agentTree: {
			agentId: 'agent-status',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [],
			timeline: [],
			statusMessage: 'Recalling conversation history...',
		},
	},

	// ── 6. Assistant — agent with reasoning + completed text ──────────────────
	{
		id: 'mock-6',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-reasoning',
			role: 'orchestrator',
			status: 'completed',
			textContent:
				"I've analyzed your workflows and found 12 executions in the last 24 hours with a **98% success rate**. The only failure was in the _Email Parser_ workflow due to a malformed attachment.",
			reasoning:
				"The user is asking about workflow performance. I should check recent executions, identify any failures, and provide a clear summary with actionable insights. I'll start with listing all executions from the past day.",
			toolCalls: [],
			children: [],
			timeline: [
				{
					type: 'text',
					content:
						"I've analyzed your workflows and found 12 executions in the last 24 hours with a **98% success rate**. The only failure was in the _Email Parser_ workflow due to a malformed attachment.",
				},
			],
		},
	},

	// ── 7. Agent — tool calls showcase ───────────────────────────────────────
	// Covers: loading, JSON result, code result, table result, web-search, error
	{
		id: 'mock-7',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-tools',
			role: 'orchestrator',
			status: 'completed',
			textContent: 'Here is a summary of your workflows and the fetched data.',
			reasoning: '',
			toolCalls: [
				// (a) executing / loading
				{
					toolCallId: 'tc-loading',
					toolName: 'get-executions',
					args: { workflowId: 'wf-abc', limit: 20 },
					isLoading: true,
					renderHint: 'default',
				},
				// (b) completed — default JSON result renderer
				{
					toolCallId: 'tc-json',
					toolName: 'get-workflow',
					args: { workflowId: 'wf-abc' },
					result: { id: 'wf-abc', name: 'My Workflow', active: true, nodeCount: 5 },
					isLoading: false,
					renderHint: 'default',
				},
				// (c) completed — ToolResultCode renderer (toolName matches code renderer list)
				{
					toolCallId: 'tc-code',
					toolName: 'get-workflow-as-code',
					args: { workflowId: 'wf-abc' },
					result:
						"import n8n from 'n8n-workflow';\n\nexport default {\n  name: 'My Workflow',\n  nodes: [...],\n};",
					isLoading: false,
					renderHint: 'default',
				},
				// (d) completed — ToolResultTable renderer (toolName matches table renderer list)
				{
					toolCallId: 'tc-table',
					toolName: 'list-workflows',
					args: { limit: 10 },
					result: [
						{ id: 'wf-1', name: 'Slack Notifier', active: true },
						{ id: 'wf-2', name: 'Email Parser', active: false },
						{ id: 'wf-3', name: 'Data Sync', active: true },
					],
					isLoading: false,
					renderHint: 'default',
				},
				// (e) web-search tool
				{
					toolCallId: 'tc-search',
					toolName: 'web-search',
					args: { query: 'n8n Slack node send message documentation' },
					result: {
						results: [
							{
								url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/',
								title: 'Slack node',
							},
						],
					},
					isLoading: false,
					renderHint: 'default',
				},
				// (f) error result
				{
					toolCallId: 'tc-error',
					toolName: 'fetch-url',
					args: { url: 'https://api.example.com/data' },
					error: 'Connection timeout after 30 seconds',
					isLoading: false,
					renderHint: 'default',
				},
			],
			children: [],
			timeline: [
				{ type: 'tool-call', toolCallId: 'tc-loading' },
				{ type: 'tool-call', toolCallId: 'tc-json' },
				{ type: 'tool-call', toolCallId: 'tc-code' },
				{ type: 'tool-call', toolCallId: 'tc-table' },
				{ type: 'tool-call', toolCallId: 'tc-search' },
				{ type: 'tool-call', toolCallId: 'tc-error' },
				{ type: 'text', content: 'Here is a summary of your workflows and the fetched data.' },
			],
		},
	},

	// ── 8. Agent — task checklist (renderHint='tasks') ────────────────────────
	{
		id: 'mock-8',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: true,
		agentTree: {
			agentId: 'agent-task-list',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [
				{
					toolCallId: 'tc-tasks',
					toolName: 'update-tasks',
					args: {},
					isLoading: false,
					renderHint: 'tasks',
				},
			],
			children: [],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-tasks' }],
			tasks: {
				tasks: [
					{ id: 't1', description: 'Analyze current workflow structure', status: 'done' },
					{ id: 't2', description: 'Identify credential requirements', status: 'done' },
					{ id: 't3', description: 'Build Notion trigger node', status: 'in_progress' },
					{ id: 't4', description: 'Configure Slack message node', status: 'todo' },
					{ id: 't5', description: 'Test and activate workflow', status: 'todo' },
				],
			},
		},
	},

	// ── 9. Agent — delegate cards (loading + completed) ───────────────────────
	{
		id: 'mock-9',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-delegate',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [
				{
					toolCallId: 'tc-delegate-loading',
					toolName: 'delegate',
					args: {
						role: 'Slack researcher',
						briefing: 'Research available Slack node operations and required credentials',
						tools: ['web-search', 'fetch-url', 'list-workflows'],
					},
					isLoading: true,
					renderHint: 'delegate',
				},
				{
					toolCallId: 'tc-delegate-done',
					toolName: 'delegate',
					args: {
						role: 'Notion researcher',
						briefing: 'Find all Notion trigger events and their payload schemas',
						tools: ['web-search', 'fetch-url'],
					},
					result: 'Notion supports: page.created, page.updated, database.updated events.',
					isLoading: false,
					renderHint: 'delegate',
				},
			],
			children: [],
			timeline: [
				{ type: 'tool-call', toolCallId: 'tc-delegate-loading' },
				{ type: 'tool-call', toolCallId: 'tc-delegate-done' },
			],
		},
	},

	// ── 10. Agent — answered questions (read-only) ────────────────────────────
	{
		id: 'mock-10',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-questions',
			role: 'orchestrator',
			status: 'completed',
			textContent: 'Thank you! Building the workflow based on your answers.',
			reasoning: '',
			toolCalls: [
				{
					toolCallId: 'tc-questions',
					toolName: 'ask-questions',
					args: {},
					isLoading: false,
					renderHint: 'default',
					confirmation: {
						requestId: 'req-q1',
						severity: 'info',
						message: 'Please answer a few questions to help me build the workflow',
						inputType: 'questions',
						introMessage: 'Before I start, I need a few details about your workflow:',
						questions: [
							{
								id: 'q1',
								question: 'How often should the workflow run?',
								type: 'single',
								options: ['Every hour', 'Every day', 'Every week', 'On trigger event'],
							},
							{
								id: 'q2',
								question: 'Which environments is this for?',
								type: 'multi',
								options: ['Development', 'Staging', 'Production'],
							},
							{
								id: 'q3',
								question: 'Any additional notes or requirements?',
								type: 'text',
							},
						],
					},
					confirmationStatus: 'approved',
					result: {
						answers: [
							{ questionId: 'q1', selectedOptions: ['On trigger event'], skipped: false },
							{
								questionId: 'q2',
								selectedOptions: ['Development', 'Production'],
								skipped: false,
							},
							{
								questionId: 'q3',
								selectedOptions: [],
								customText: 'Please add error handling for failed requests.',
								skipped: false,
							},
						],
					},
				},
			],
			children: [],
			timeline: [
				{ type: 'tool-call', toolCallId: 'tc-questions' },
				{ type: 'text', content: 'Thank you! Building the workflow based on your answers.' },
			],
		},
	},

	// ── 11. Agent — plan review, interactive (pending approval) ──────────────
	{
		id: 'mock-11',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: true,
		agentTree: {
			agentId: 'agent-plan-interactive',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [
				{
					toolCallId: 'tc-plan-interactive',
					toolName: 'review-plan',
					args: {},
					isLoading: true,
					renderHint: 'default',
					confirmation: {
						requestId: 'req-plan-1',
						severity: 'info',
						message: 'Please review this plan before I proceed',
						inputType: 'plan-review',
						introMessage: 'Here is my plan to build the Notion → Slack workflow:',
						tasks: {
							tasks: [
								{
									id: 'p1',
									description: 'Create Notion "Page Created" trigger node',
									status: 'todo',
								},
								{
									id: 'p2',
									description: 'Add data transformation (extract page title and URL)',
									status: 'todo',
								},
								{
									id: 'p3',
									description: 'Configure Slack "Send Message" node to #notifications',
									status: 'todo',
								},
								{ id: 'p4', description: 'Activate and test the workflow', status: 'todo' },
							],
						},
					},
					confirmationStatus: 'pending',
				},
			],
			children: [],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-plan-interactive' }],
		},
	},

	// ── 12. Agent — plan review, completed (read-only) ────────────────────────
	{
		id: 'mock-12',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-plan-done',
			role: 'orchestrator',
			status: 'completed',
			textContent: 'Plan approved! All steps have been executed successfully.',
			reasoning: '',
			toolCalls: [
				{
					toolCallId: 'tc-plan-done',
					toolName: 'review-plan',
					args: {},
					isLoading: false,
					renderHint: 'default',
					confirmation: {
						requestId: 'req-plan-2',
						severity: 'info',
						message: 'Plan was reviewed and approved',
						inputType: 'plan-review',
						introMessage: 'Here is my plan to build the Notion → Slack workflow:',
						tasks: {
							tasks: [
								{
									id: 'p1',
									description: 'Create Notion "Page Created" trigger node',
									status: 'done',
								},
								{
									id: 'p2',
									description: 'Add data transformation (extract page title and URL)',
									status: 'done',
								},
								{
									id: 'p3',
									description: 'Configure Slack "Send Message" node to #notifications',
									status: 'done',
								},
								{ id: 'p4', description: 'Activate and test the workflow', status: 'done' },
							],
						},
					},
					confirmationStatus: 'approved',
				},
			],
			children: [],
			timeline: [
				{ type: 'tool-call', toolCallId: 'tc-plan-done' },
				{ type: 'text', content: 'Plan approved! All steps have been executed successfully.' },
			],
		},
	},

	// ── 13. Agent — child agents (active + completed + error + cancelled) ─────
	{
		id: 'mock-13',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-parent',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [
				// Active child (builder kind, with targetResource for ArtifactCard)
				{
					agentId: 'child-active',
					role: 'workflow builder',
					kind: 'builder',
					title: 'Building workflow',
					subtitle: 'Notion → Slack integration',
					goal: 'Build a complete workflow that monitors Notion page creation and posts a Slack notification.',
					status: 'active',
					textContent: 'Setting up the Notion trigger node...',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'child-tc-1',
							toolName: 'create-node',
							args: { type: 'n8n-nodes-base.notionTrigger', name: 'Notion Trigger' },
							isLoading: true,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'text', content: 'Setting up the Notion trigger node...' },
						{ type: 'tool-call', toolCallId: 'child-tc-1' },
					],
					targetResource: { type: 'workflow', id: 'wf-new-123', name: 'Notion → Slack' },
				},
				// Completed child (researcher kind) — short inline text in SubagentStepTimeline
				{
					agentId: 'child-done',
					role: 'researcher',
					kind: 'researcher',
					title: 'Research complete',
					subtitle: 'Slack API documentation',
					status: 'completed',
					textContent: 'Found the required Slack scopes: chat:write, channels:read.',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'child-tc-done',
							toolName: 'web-search',
							args: { query: 'Slack bot required OAuth scopes for posting messages' },
							result: { answer: 'Required scopes: chat:write, channels:read' },
							isLoading: false,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'tool-call', toolCallId: 'child-tc-done' },
						{
							type: 'text',
							content: 'Found the required Slack scopes: chat:write, channels:read.',
						},
					],
					result: 'Slack requires chat:write and channels:read OAuth scopes.',
				},
				// Completed child (builder kind) — long text behind toggle (contains code block)
				{
					agentId: 'child-long-text',
					role: 'workflow builder',
					kind: 'builder',
					title: 'Workflow built',
					subtitle: 'Generated workflow code',
					status: 'completed',
					textContent: 'Generated the workflow definition.',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [
						{
							type: 'text',
							content:
								'Generated the workflow definition:\n\n```json\n{\n  "name": "Notion → Slack",\n  "nodes": [\n    {\n      "name": "Notion Trigger",\n      "type": "n8n-nodes-base.notionTrigger",\n      "parameters": { "event": "page_added" }\n    },\n    {\n      "name": "Slack",\n      "type": "n8n-nodes-base.slack",\n      "parameters": {\n        "channel": "#notifications",\n        "text": "New page: {{ $json.title }}"\n      }\n    }\n  ]\n}\n```',
						},
					],
					targetResource: { type: 'workflow', id: 'wf-built-456', name: 'Notion → Slack' },
				},
				// Error child — has timeline history visible when expanded
				{
					agentId: 'child-error',
					role: 'credential validator',
					status: 'error',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'child-err-tc-1',
							toolName: 'validate-credential',
							args: { credentialType: 'slackApi', credentialId: 'cred-abc' },
							error: 'OAuth token is invalid or has been revoked',
							isLoading: false,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'text', content: 'Validating Slack credential...' },
						{ type: 'tool-call', toolCallId: 'child-err-tc-1' },
					],
					error: 'Failed to validate Slack credentials: Invalid OAuth token (401 Unauthorized)',
					errorDetails: {
						statusCode: 401,
						provider: 'Slack',
						technicalDetails: 'The provided access token is invalid or has been revoked.',
					},
				},
				// Cancelled child — has partial timeline showing work done before cancellation
				{
					agentId: 'child-cancelled',
					role: 'data validator',
					status: 'cancelled',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'child-cancel-tc-1',
							toolName: 'list-workflows',
							args: { limit: 50 },
							result: [
								{ id: 'wf-1', name: 'Slack Notifier', active: true },
								{ id: 'wf-2', name: 'Email Parser', active: false },
							],
							isLoading: false,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'text', content: 'Checking workflow data integrity...' },
						{ type: 'tool-call', toolCallId: 'child-cancel-tc-1' },
					],
				},
			],
			timeline: [
				{ type: 'child', agentId: 'child-active' },
				{ type: 'child', agentId: 'child-done' },
				{ type: 'child', agentId: 'child-long-text' },
				{ type: 'child', agentId: 'child-error' },
				{ type: 'child', agentId: 'child-cancelled' },
			],
		},
	},

	// ── 14. AgentSection — active (peek preview visible, shimmer title, stop button) ──
	{
		id: 'mock-14',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: true,
		agentTree: {
			agentId: 'solo-parent-active',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [
				{
					agentId: 'solo-child-active',
					role: 'workflow builder',
					kind: 'builder',
					title: 'Building workflow',
					subtitle: 'Notion → Slack integration',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'solo-active-tc-1',
							toolName: 'create-node',
							args: { type: 'n8n-nodes-base.notionTrigger', name: 'Notion Trigger' },
							isLoading: true,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'text', content: 'Setting up the Notion trigger node...' },
						{ type: 'tool-call', toolCallId: 'solo-active-tc-1' },
					],
				},
			],
			timeline: [{ type: 'child', agentId: 'solo-child-active' }],
		},
	},

	// ── 15. AgentSection — completed (collapsed, no peek, timeline behind toggle) ──
	{
		id: 'mock-15',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'solo-parent-completed',
			role: 'orchestrator',
			status: 'completed',
			textContent: 'All done.',
			reasoning: '',
			toolCalls: [],
			children: [
				{
					agentId: 'solo-child-completed',
					role: 'researcher',
					kind: 'researcher',
					subtitle: 'Slack API documentation',
					status: 'completed',
					textContent: 'Found the required Slack scopes.',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'solo-done-tc-1',
							toolName: 'web-search',
							args: { query: 'Slack bot OAuth scopes' },
							result: { answer: 'chat:write, channels:read' },
							isLoading: false,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'tool-call', toolCallId: 'solo-done-tc-1' },
						{ type: 'text', content: 'Found the required Slack scopes.' },
					],
					result: 'Slack requires chat:write and channels:read.',
				},
			],
			timeline: [
				{ type: 'child', agentId: 'solo-child-completed' },
				{ type: 'text', content: 'All done.' },
			],
		},
	},

	// ── 16. AgentSection — cancelled (collapsed, no peek, partial timeline behind toggle) ──
	{
		id: 'mock-16',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'solo-parent-cancelled',
			role: 'orchestrator',
			status: 'completed',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [
				{
					agentId: 'solo-child-cancelled',
					role: 'data validator',
					subtitle: 'Workflow data integrity',
					status: 'cancelled',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'solo-cancel-tc-1',
							toolName: 'list-workflows',
							args: { limit: 50 },
							result: [
								{ id: 'wf-1', name: 'Slack Notifier', active: true },
								{ id: 'wf-2', name: 'Email Parser', active: false },
							],
							isLoading: false,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'text', content: 'Checking workflow data integrity...' },
						{ type: 'tool-call', toolCallId: 'solo-cancel-tc-1' },
					],
				},
			],
			timeline: [{ type: 'child', agentId: 'solo-child-cancelled' }],
		},
	},

	// ── 17. AgentSection — error (error message always visible, timeline behind toggle) ──
	{
		id: 'mock-17',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'solo-parent-error',
			role: 'orchestrator',
			status: 'completed',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [
				{
					agentId: 'solo-child-error',
					role: 'credential validator',
					subtitle: 'Slack credential validation',
					status: 'error',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'solo-err-tc-1',
							toolName: 'validate-credential',
							args: { credentialType: 'slackApi', credentialId: 'cred-abc' },
							error: 'OAuth token is invalid or has been revoked',
							isLoading: false,
							renderHint: 'default',
						},
					],
					children: [],
					timeline: [
						{ type: 'text', content: 'Validating Slack credential...' },
						{ type: 'tool-call', toolCallId: 'solo-err-tc-1' },
					],
					error: 'Failed to validate Slack credentials: Invalid OAuth token (401 Unauthorized)',
					errorDetails: {
						statusCode: 401,
						provider: 'Slack',
						technicalDetails: 'The provided access token is invalid or has been revoked.',
					},
				},
			],
			timeline: [{ type: 'child', agentId: 'solo-child-error' }],
		},
	},

	// ── 18. Agent — top-level error ───────────────────────────────────────────
	{
		id: 'mock-18',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-error',
			role: 'orchestrator',
			status: 'error',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [],
			timeline: [],
			error: 'Rate limit exceeded. Please try again in a few minutes.',
			errorDetails: {
				statusCode: 429,
				provider: 'OpenAI',
				technicalDetails:
					'You have exceeded your API rate limit. Please wait before making more requests.',
			},
		},
	},
];

// --- Message handlers ---
async function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	// Reset scroll on new user message
	userScrolledUp.value = false;
	preview.markUserSentMessage();
	await store.sendMessage(message, attachments, rootStore.pushRef);
}

function handleStop() {
	void store.cancelRun();
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-container">
		<!-- Resizable sidebar -->
		<N8nResizeWrapper
			:class="$style.sidebar"
			:width="sidebarWidth"
			:style="{ width: `${sidebarWidth}px` }"
			:supported-directions="['right']"
			:is-resizing-enabled="true"
			@resize="handleSidebarResize"
		>
			<InstanceAiThreadList />
		</N8nResizeWrapper>

		<!-- Main chat area -->
		<div :class="$style.chatArea">
			<!-- Header -->
			<div :class="$style.header">
				<N8nHeading tag="h2" size="small" :class="$style.headerTitle">
					{{ currentThreadTitle }}
				</N8nHeading>
				<N8nText
					v-if="store.sseState === 'reconnecting'"
					size="small"
					color="text-light"
					:class="$style.reconnecting"
				>
					{{ i18n.baseText('instanceAi.view.reconnecting') }}
				</N8nText>
				<div :class="$style.headerActions">
					<CreditsSettingsDropdown
						v-if="store.creditsRemaining !== undefined"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						:is-low-credits="store.isLowCredits"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
					/>
					<N8nIconButton
						icon="cog"
						variant="ghost"
						size="medium"
						:class="$style.settingsButton"
						data-test-id="instance-ai-settings-button"
						@click="goToSettings"
					/>
					<N8nIconButton
						icon="brain"
						variant="ghost"
						size="medium"
						:class="{ [$style.activeButton]: showMemoryPanel }"
						@click="showMemoryPanel = !showMemoryPanel"
					/>
					<N8nIconButton
						v-if="isDebugEnabled"
						icon="bug"
						variant="ghost"
						size="medium"
						:class="{ [$style.activeButton]: showDebugPanel }"
						@click="
							showDebugPanel = !showDebugPanel;
							store.debugMode = showDebugPanel;
						"
					/>
					<N8nIconButton
						v-if="!preview.isPreviewVisible.value"
						icon="panel-right"
						variant="ghost"
						size="medium"
						@click="showArtifactsPanel = !showArtifactsPanel"
					/>
				</div>
			</div>

			<!-- Content area: chat + artifacts side by side below header -->
			<div :class="$style.contentArea">
				<div :class="$style.chatContent">
					<!-- Empty state: centered layout -->
					<div v-if="!store.hasMessages" :class="$style.emptyLayout">
						<InstanceAiEmptyState />
						<div :class="$style.centeredInput">
							<InstanceAiStatusBar />
							<CreditWarningBanner
								v-if="showCreditBanner"
								:credits-remaining="store.creditsRemaining"
								:credits-quota="store.creditsQuota"
								@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
								@dismiss="creditBannerDismissed = true"
							/>
							<InstanceAiInput
								ref="chatInputRef"
								:is-streaming="store.isStreaming"
								@submit="handleSubmit"
								@stop="handleStop"
							/>
						</div>
					</div>

					<!-- Messages: scroll + floating input layout -->
					<template v-else>
						<N8nScrollArea :class="$style.scrollArea">
							<div
								ref="scrollable"
								:class="$style.messageList"
								:style="{ paddingBottom: `${inputAreaHeight}px` }"
							>
								<TransitionGroup name="message-slide">
									<InstanceAiMessage
										v-for="message in mockedMessages"
										:key="message.id"
										:message="message"
									/>
								</TransitionGroup>
								<InstanceAiConfirmationPanel />
							</div>
						</N8nScrollArea>

						<!-- Scroll to bottom button -->
						<div
							:class="$style.scrollButtonContainer"
							:style="{ bottom: `${inputAreaHeight + 8}px` }"
						>
							<Transition name="fade">
								<N8nIconButton
									v-if="userScrolledUp && store.hasMessages"
									variant="outline"
									icon="arrow-down"
									:class="$style.scrollToBottomButton"
									@click="
										scrollToBottom(true);
										userScrolledUp = false;
									"
								/>
							</Transition>
						</div>

						<!-- Floating input -->
						<div ref="inputContainer" :class="$style.inputContainer">
							<div :class="$style.inputConstraint">
								<InstanceAiStatusBar />
								<CreditWarningBanner
									v-if="showCreditBanner"
									:credits-remaining="store.creditsRemaining"
									:credits-quota="store.creditsQuota"
									@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
									@dismiss="creditBannerDismissed = true"
								/>
								<InstanceAiInput
									ref="chatInputRef"
									:is-streaming="store.isStreaming"
									@submit="handleSubmit"
									@stop="handleStop"
								/>
							</div>
						</div>
					</template>
				</div>

				<!-- Artifacts panel (below header, beside chat) -->
				<InstanceAiArtifactsPanel v-if="showArtifactsPanel && !preview.isPreviewVisible.value" />

				<!-- Overlay panels -->
				<InstanceAiMemoryPanel v-if="showMemoryPanel" @close="showMemoryPanel = false" />
				<InstanceAiDebugPanel
					v-if="showDebugPanel"
					@close="
						showDebugPanel = false;
						store.debugMode = false;
					"
				/>
			</div>
		</div>

		<!-- Resizable preview panel (workflow OR datatable) -->
		<N8nResizeWrapper
			v-show="preview.isPreviewVisible.value"
			:class="$style.canvasArea"
			:width="previewPanelWidth"
			:style="{ width: `${previewPanelWidth}px` }"
			:min-width="400"
			:max-width="previewMaxWidth"
			:supported-directions="['left']"
			:is-resizing-enabled="true"
			:grid-size="8"
			:outset="true"
			@resize="handlePreviewResize"
			@resizestart="isResizingPreview = true"
			@resizeend="isResizingPreview = false"
		>
			<div :class="$style.previewPanel">
				<InstanceAiPreviewTabBar
					:tabs="preview.allArtifactTabs.value"
					:active-tab-id="preview.activeTabId.value"
					@update:active-tab-id="preview.selectTab($event)"
					@close="preview.closePreview()"
				/>
				<div :class="$style.previewContent">
					<InstanceAiWorkflowPreview
						v-if="preview.activeWorkflowId.value"
						ref="workflowPreview"
						:workflow-id="preview.activeWorkflowId.value"
						:execution-id="preview.activeExecutionId.value"
						:refresh-key="preview.workflowRefreshKey.value"
						@iframe-ready="eventRelay.handleIframeReady"
					/>
					<InstanceAiDataTablePreview
						v-else-if="preview.activeDataTableId.value"
						:data-table-id="preview.activeDataTableId.value"
						:project-id="preview.activeDataTableProjectId.value"
						:refresh-key="preview.dataTableRefreshKey.value"
					/>
				</div>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	height: 100%;
	width: 100%;
	min-width: 900px;
	overflow: hidden;
}

.sidebar {
	min-width: 200px;
	max-width: 400px;
	flex-shrink: 0;
}

.chatArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	position: relative;
	background-color: var(--color--background--light-1);
}

.canvasArea {
	flex-shrink: 0;
	min-width: 0;
	border-left: var(--border);

	// Widen the resize handle hit area for easier grabbing
	:global([data-test-id='resize-handle']) {
		width: 12px !important;
		left: -6px !important;

		// Visible drag indicator line
		&::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 2px;
			height: 32px;
			border-radius: 1px;
			background: var(--color--foreground);
			opacity: 0;
			transition: opacity 0.15s ease;
		}

		&:hover::after {
			opacity: 1;
		}
	}
}

.header {
	padding: var(--spacing--sm) var(--spacing--lg);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.headerTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	color: var(--color--text);
}

.headerActions {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.settingsButton {
	padding: var(--spacing--xs);
}

.activeButton {
	color: var(--color--primary);
}

.reconnecting {
	font-style: italic;
}

.contentArea {
	display: flex;
	flex: 1;
	min-height: 0;
	position: relative;
}

.chatContent {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	position: relative;
}

.emptyLayout {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
}

.centeredInput {
	width: 100%;
	max-width: 680px;
}

.scrollArea {
	flex: 1;
	// Allow flex item to shrink below content size so reka-ui viewport scrolls
	min-height: 0;
}

.messageList {
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--sm) var(--spacing--lg);
}

.scrollButtonContainer {
	position: absolute;
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	pointer-events: none;
	z-index: 3;
}

.scrollToBottomButton {
	pointer-events: auto;
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.inputContainer {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 0 var(--spacing--lg) var(--spacing--sm);
	background: linear-gradient(transparent 0%, var(--color--background--light-1) 30%);
	pointer-events: none;
	z-index: 2;

	& > * {
		pointer-events: auto;
	}
}

.inputConstraint {
	max-width: 750px;
	margin: 0 auto;
}

.previewPanel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.previewContent {
	flex: 1;
	min-height: 0;
}
</style>

<style lang="scss">
.message-slide-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.message-slide-enter-active {
	transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}
</style>
