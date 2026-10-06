<script setup lang="ts">
import {
	computed,
	provide,
	ref,
	shallowRef,
	toRef,
	watch,
	onMounted,
	onBeforeUnmount,
	useTemplateRef,
	nextTick,
} from 'vue';
import {
	N8nAiActivityStepGroup,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
	type AgentChatQueueItem,
	type AgentBuilderOpenSuspension,
	APPROVAL_TOOL_NAME,
	WAIT_TOOL_NAME,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
	PROVIDER_CAPABILITIES,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import ChatMessageQueue from '@/features/ai/shared/components/ChatMessageQueue.vue';
import type {
	ChatMessageQueueSteerAction,
	ChatMessageQueueItem,
} from '@/features/ai/shared/components/chatMessageQueue.types';
import AttachmentPreview from '@/features/ai/instanceAi/components/AttachmentPreview.vue';
import { useAgentChatStream } from '../composables/useAgentChatStream';
import {
	findTailOpenInteractive,
	getMessageInteractives,
	parseApprovalInput,
} from '@/features/ai/shared/agentsChat/messageMappers';
import AgentChatEmptyState from './AgentChatEmptyState.vue';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { resolveFileMimeType } from '@/app/utils/fileUtils';
import AgentChatMessageList from './AgentChatMessageList.vue';
import AgentChatPlan from './AgentChatPlan.vue';
import { selectLatestAgentPlan } from '../utils/agent-plan';
import { formatAgentElapsedTime } from '../utils/agent-elapsed-time';
import type {
	AgentContinueLoadedEvent,
	AgentSendToAssistantEvent,
	AgentJsonConfig,
} from '../types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { buildAgentConfigFingerprint } from '../composables/agentTelemetry.utils';
import { AGENT_SESSION_DETAIL_VIEW, TOOL_CALL_STATE } from '../constants';
import {
	isBudgetStopCode,
	budgetNoticeCodesForField,
	type BudgetAmountField,
} from '../utils/budget-config';
import { TIME } from '@/app/constants/durations';
import { useAgentBackgroundJobs } from '../composables/useAgentBackgroundJobs';
import { getChatAttachmentUrl, type AgentChatChannel } from '../composables/useAgentApi';
import { AGENT_ATTACHMENT_URL_KEY } from './agentChatInjectionKeys';
import ApprovalCard from './interactive/ApprovalCard.vue';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		projectId: string;
		agentId: string;
		mode?: 'panel' | 'inline';
		continueSessionId?: string;
		newSession?: boolean;
		agentConfig: AgentJsonConfig | null;
		agentStatus: 'draft' | 'production';
		connectedTriggers: string[];
		canSendToAssistant?: boolean;
		dismissedFixToolCallIds?: string[];
		beforeSend?: () => Promise<void> | void;
		inputDraft?: string;
		backgroundJobsActive?: boolean;
		/** `'chat'` (default) talks to the builder's draft/test chat; `'n8n-chat'` talks to the published n8n Chat channel. */
		channel?: AgentChatChannel;
		/**
		 * The n8n Chat entry page: centers the empty state and the composer together until a
		 * new chat gets its first message, and shows that message right away when sent.
		 */
		centerEmptyState?: boolean;
		budgetCards?: boolean;
		/**
		 * Persists a raised budget cap. Omitted when the user cannot edit the
		 * agent (or editing is locked) — the notice cards then hide the
		 * increase action. Resolves true once the new cap is saved.
		 */
		increaseBudget?: (payload: { field: BudgetAmountField; amount: number }) => Promise<boolean>;
	}>(),
	{
		visible: true,
		mode: 'panel',
		continueSessionId: undefined,
		newSession: false,
		canSendToAssistant: false,
		dismissedFixToolCallIds: () => [],
		beforeSend: undefined,
		inputDraft: undefined,
		backgroundJobsActive: false,
		channel: 'chat',
		centerEmptyState: false,
		budgetCards: false,
		increaseBudget: undefined,
	},
);

const emit = defineEmits<{
	'update:streaming': [streaming: boolean];
	'update:inputDraft': [value: string];
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'session-created': [sessionId: string];
	'initial-consumed': [];
	back: [];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
	/** The chat's first user message, for a host to title a thread that has no title yet. */
	'first-user-message': [text: string | undefined];
}>();

const locale = useI18n();
const { isMacOs } = useDeviceSupport();
const rootStore = useRootStore();
const agentTelemetry = useAgentTelemetry();
const toast = useToast();

const {
	capabilities,
	messages,
	queuedMessages,
	removingQueueIds,
	steeringQueueIds,
	canSteer,
	steerQueuedMessage,
	removeQueuedMessage,
	reorderQueuedMessage,
	isReorderingQueue,
	isSubmitting,
	isLoadingHistory,
	isStreaming,
	refresh,
	isCancelling,
	messagingState,
	fatalError,
	warnings,
	loadHistory,
	sendMessage,
	stopGenerating,
	detachStream,
	resume,
	cancelAndSteer,
	dismissFatalError,
	dismissWarning,
	clearBudgetNotices,
} = useAgentChatStream({
	projectId: toRef(props, 'projectId'),
	agentId: toRef(props, 'agentId'),
	continueSessionId: toRef(props, 'continueSessionId'),
	newSession: toRef(props, 'newSession'),
	channel: toRef(props, 'channel'),
	onHistoryLoaded: (count) => {
		if (props.continueSessionId) {
			emit('continue-loaded', { sessionId: props.continueSessionId, count });
		}
	},
	onSessionCreated: (sessionId) => emit('session-created', sessionId),
	budgetCards: props.budgetCards,
});

const currentPlan = computed(() => selectLatestAgentPlan(messages.value));

const editingQueueId = ref<string>();
provide(AGENT_ATTACHMENT_URL_KEY, (attachmentId) =>
	getChatAttachmentUrl(
		rootStore.restApiContext,
		props.projectId,
		props.agentId,
		attachmentId,
		props.channel,
	),
);

// The stream adds a sent message only once its run starts. On the entry page the first
// message shows right away instead, so the page doesn't sit in its empty state meanwhile.
const firstMessagePreview = ref<ChatMessage>();
// Queue item of the previewed message, once the server has queued it.
const previewQueueId = ref<string>();
const isPreviewingFirstMessage = computed(
	() => !!firstMessagePreview.value && messages.value.length === 0,
);
const queueRows = computed(() =>
	isPreviewingFirstMessage.value
		? queuedMessages.value.filter((item) => item.id !== previewQueueId.value)
		: queuedMessages.value,
);
const queueExpanded = ref(false);
const queueOrder = shallowRef<AgentChatQueueItem[]>();
const displayedQueueRows = computed(() => queueOrder.value ?? queueRows.value);
const queueDisplayItems = computed<ChatMessageQueueItem[]>(() =>
	displayedQueueRows.value.map((item) => ({
		id: item.id,
		message: item.message,
		attachmentNames: item.attachments?.map((attachment) => attachment.fileName),
		notice: item.steeringExecutionId ? locale.baseText('agents.chat.queue.steering') : undefined,
	})),
);
const queueSteerAction = computed<ChatMessageQueueSteerAction>(() => ({
	label: locale.baseText('agents.chat.queue.steer'),
	tooltip: locale.baseText('agents.chat.queue.steerTooltip'),
	icon: 'corner-down-right',
}));

function isDisplayedQueueItemBusy(item: ChatMessageQueueItem) {
	const queuedItem = displayedQueueRows.value.find((entry) => entry.id === item.id);
	return !queuedItem || isQueueItemBusy(queuedItem);
}

function editQueuedMessage(id: string) {
	const item = queuedMessages.value.find((entry) => entry.id === id);
	if (item) void startQueueEdit(item);
}

async function startQueueEdit(item: AgentChatQueueItem) {
	if (hasDraft.value || isQueueItemBusy(item) || isSubmissionBlocked.value) return;
	queueExpanded.value = true;
	const target = {
		projectId: props.projectId,
		agentId: props.agentId,
		continueSessionId: props.continueSessionId,
	};
	function isCurrentTarget() {
		return (
			!disposed &&
			props.projectId === target.projectId &&
			props.agentId === target.agentId &&
			props.continueSessionId === target.continueSessionId
		);
	}
	editingQueueId.value = item.id;
	try {
		/** Load attachments before removal so a failed download leaves the message queued. */
		const files = await Promise.all(
			(item.attachments ?? []).map(async (attachment) => {
				const url = getChatAttachmentUrl(
					rootStore.restApiContext,
					target.projectId,
					target.agentId,
					attachment.id,
					props.channel,
				);
				const response = await fetch(url, { credentials: 'include' });
				if (!response.ok) throw new Error(`Attachment download failed: ${response.status}`);
				return new File([await response.blob()], attachment.fileName, {
					type: attachment.mimeType,
				});
			}),
		);
		if (!isCurrentTarget() || hasDraft.value) return;
		const result = await removeQueuedMessage(item.id);
		if (result !== 'removed' || !isCurrentTarget()) return;
		inputText.value = item.message;
		attachedFiles.value = files;
		editingQueueId.value = undefined;
		await nextTick();
		if (isCurrentTarget()) focusInput();
	} catch (error) {
		if (isCurrentTarget()) toast.showError(error, locale.baseText('agents.chat.queue.removeError'));
	} finally {
		if (isCurrentTarget()) editingQueueId.value = undefined;
	}
}

/** Allows Option/Alt + Up to edit the last sent queued message */
function onChatInputKeydown(event: KeyboardEvent) {
	if (
		!(event.target instanceof HTMLTextAreaElement) ||
		event.key !== 'ArrowUp' ||
		!event.altKey ||
		event.ctrlKey ||
		event.metaKey ||
		event.shiftKey ||
		event.isComposing ||
		event.repeat ||
		hasDraft.value ||
		isSubmissionBlocked.value
	) {
		return;
	}
	const item = queuedMessages.value.at(-1);
	if (!item || isQueueItemBusy(item)) return;
	event.preventDefault();
	event.stopPropagation();
	void startQueueEdit(item);
}

function isQueueItemBusy(item: AgentChatQueueItem) {
	return (
		!!editingQueueId.value ||
		isReorderingQueue.value ||
		!!item.steeringExecutionId ||
		steeringQueueIds.value.has(item.id) ||
		removingQueueIds.value.has(item.id)
	);
}
function canMoveQueueItem(items: AgentChatQueueItem[], from: number, to: number) {
	if (!capabilities.value.reorder || editingQueueId.value || from === to || !items[from] || !items[to]) return false;
	return !items.slice(Math.min(from, to), Math.max(from, to) + 1).some(isQueueItemBusy);
}
function canDragQueueItem(index: number) {
	const items = displayedQueueRows.value;
	return canMoveQueueItem(items, index, index - 1) || canMoveQueueItem(items, index, index + 1);
}
function startQueueDrag() {
	queueOrder.value = [...queueRows.value];
	queueExpanded.value = true;
}
function canDropQueueItem(event: { draggedContext: { index: number; futureIndex: number } }) {
	const { index, futureIndex } = event.draggedContext;
	return canMoveQueueItem(displayedQueueRows.value, index, futureIndex);
}
function endQueueDrag(event: { oldIndex?: number; newIndex?: number }) {
	const items = queueOrder.value;
	queueOrder.value = undefined;
	if (items && event.oldIndex !== undefined && event.newIndex !== undefined) {
		void moveQueueItem(items, event.oldIndex, event.newIndex);
	}
}
async function moveQueueItem(items: AgentChatQueueItem[], from: number, to: number) {
	if (!canMoveQueueItem(items, from, to)) return;
	const item = items[from];
	const reordered = [...items];
	reordered.splice(from, 1);
	reordered.splice(to, 0, item);
	queueOrder.value = reordered;
	queueExpanded.value = true;
	await reorderQueuedMessage(
		item.id,
		items[to].id,
		items.filter((entry) => !entry.steeringExecutionId).map((entry) => entry.id),
	);
	if (queueOrder.value !== reordered) return;
	queueOrder.value = undefined;
}
const backgroundJobsActive = computed(
	() => capabilities.value.backgroundTasks && props.backgroundJobsActive,
);
const {
	jobs: backgroundJobs,
	respondToApproval,
	stopAll,
	isStopping,
} = useAgentBackgroundJobs({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	threadId: () => props.continueSessionId,
	active: () => backgroundJobsActive.value,
	receivedJobs: () => messages.value.flatMap((message) => message.backgroundJobSignal?.tasks ?? []),
});
const canStopBackgroundJobs = computed(() =>
	backgroundJobs.value.some((job) => job.status === 'running' || job.status === 'suspended'),
);
const backgroundStoppingIds = computed(
	() =>
		new Set(
			backgroundJobs.value
				.filter(
					(job) =>
						(job.status === 'running' || job.status === 'suspended') &&
						(isStopping.value || job.pauseRequested),
				)
				.map((job) => job.id),
		),
);

async function stopBackgroundJobs(event: MouseEvent) {
	const button = event.currentTarget;
	const restoreFocus = button === document.activeElement;
	const threadId = props.continueSessionId;
	try {
		await stopAll();
	} catch (error) {
		toast.showError(error, locale.baseText('agents.chat.backgroundTasks.stopError'));
	}
	// Disabling the button can clear focus before the task rows disappear.
	await nextTick();
	if (
		!restoreFocus ||
		disposed ||
		!props.visible ||
		props.continueSessionId !== threadId ||
		hasPendingApprovals.value ||
		document.activeElement !== document.body
	)
		return;
	if (button instanceof HTMLElement && button.isConnected) button.focus({ preventScroll: true });
	else focusInput({ preventScroll: true });
}
const backgroundRunningCount = computed(
	() => backgroundJobs.value.filter((job) => job.status === 'running').length,
);
const backgroundInProgress = computed(
	() => backgroundRunningCount.value > 0 || backgroundStoppingIds.value.size > 0,
);
const backgroundTitle = computed(() => {
	const stoppingCount = backgroundStoppingIds.value.size;
	if (stoppingCount > 0) {
		return locale.baseText('agents.chat.backgroundTasks.stoppingCount', {
			adjustToNumber: stoppingCount,
			interpolate: { count: stoppingCount },
		});
	}
	if (backgroundJobs.value.some((job) => job.status === 'suspended')) {
		return locale.baseText('agents.chat.backgroundTasks.status.suspended');
	}
	const count = backgroundRunningCount.value;
	if (count === 0) {
		return locale.baseText('agents.chat.backgroundTasks.finished', {
			adjustToNumber: backgroundJobs.value.length,
		});
	}
	return locale.baseText('agents.chat.backgroundTasks.runningCount', {
		adjustToNumber: count,
		interpolate: { count },
	});
});
const backgroundTraceRoute = computed(() => ({
	name: AGENT_SESSION_DETAIL_VIEW,
	params: {
		projectId: props.projectId,
		agentId: props.agentId,
		threadId: props.continueSessionId,
	},
}));
const backgroundJobStatuses = computed(() => ({
	stopping: {
		icon: 'loader-circle',
		label: locale.baseText('agents.chat.backgroundTasks.status.stopping'),
	},
	paused: {
		icon: 'circle-pause',
		label: locale.baseText('agents.chat.backgroundTasks.status.paused'),
	},
	running: {
		icon: 'loader-circle',
		label: locale.baseText('agents.chat.backgroundTasks.status.running'),
	},
	completed: {
		icon: 'circle-check',
		label: locale.baseText('agents.chat.backgroundTasks.status.completed'),
	},
	failed: { icon: 'circle-x', label: locale.baseText('agents.chat.backgroundTasks.status.failed') },
	cancelled: {
		icon: 'circle-x',
		label: locale.baseText('agents.chat.backgroundTasks.status.cancelled'),
	},
	waiting: {
		icon: 'circle',
		label: locale.baseText('agents.chat.backgroundTasks.status.waiting'),
	},
	suspended: {
		icon: 'circle-pause',
		label: locale.baseText('agents.chat.backgroundTasks.status.suspended'),
	},
}));

const backgroundApproval = computed(() => {
	if (!backgroundJobsActive.value) return undefined;
	for (const job of backgroundJobs.value) {
		if (job.status !== 'suspended' || !job.approval) continue;
		const input = parseApprovalInput(job.approval.suspendPayload);
		if (input) return { id: job.id, title: job.title, approval: job.approval, input };
	}
	return undefined;
});
const pendingApproval = computed(() => {
	const tail = messages.value.at(-1);
	if (!tail) return undefined;
	for (const payload of getMessageInteractives(tail)) {
		if (
			payload.toolName !== APPROVAL_TOOL_NAME ||
			payload.resolvedAt !== undefined ||
			!payload.runId
		) {
			continue;
		}
		return { runId: payload.runId, toolCallId: payload.toolCallId, input: payload.input };
	}
	return undefined;
});
const hasPendingApprovals = computed(
	() => pendingApproval.value !== undefined || backgroundApproval.value !== undefined,
);
const pendingBackgroundResponses = ref(new Set<string>());

async function respondToBackgroundApproval(
	approval: AgentBuilderOpenSuspension,
	resumeData: { approved: boolean },
) {
	if (pendingBackgroundResponses.value.has(approval.toolCallId)) return;
	pendingBackgroundResponses.value.add(approval.toolCallId);
	const target = {
		projectId: props.projectId,
		agentId: props.agentId,
		continueSessionId: props.continueSessionId,
	};
	try {
		await respondToApproval({ runId: approval.runId, toolCallId: approval.toolCallId, resumeData });
	} catch (error) {
		if (
			disposed ||
			!props.visible ||
			props.projectId !== target.projectId ||
			props.agentId !== target.agentId ||
			props.continueSessionId !== target.continueSessionId
		)
			return;
		toast.showError(error, locale.baseText('agents.chat.backgroundTasks.approvalError'));
	} finally {
		pendingBackgroundResponses.value.delete(approval.toolCallId);
	}
}
const backgroundJobRows = computed(() =>
	backgroundJobs.value.map((job) => {
		const stopping = backgroundStoppingIds.value.has(job.id);
		const stopped =
			job.status === 'paused' ||
			(job.kind === 'workflow' && job.status === 'cancelled' && job.pauseRequested);
		let indicator = backgroundJobStatuses.value[job.status];
		if (stopping) indicator = backgroundJobStatuses.value.stopping;
		else if (stopped) indicator = backgroundJobStatuses.value.paused;
		else if (job.kind === 'workflow' && job.status === 'running')
			indicator = backgroundJobStatuses.value.waiting;
		return {
			...job,
			stopping,
			stopped,
			label: locale.baseText(
				job.kind === 'workflow'
					? 'agents.chat.backgroundTasks.workflow'
					: 'agents.chat.backgroundTasks.subagent',
				{ interpolate: { title: job.title } },
			),
			indicator,
		};
	}),
);
const now = ref(Date.now());
const documentVisibility = useDocumentVisibility();
const { pause: pauseTimer, resume: resumeTimer } = useIntervalFn(
	() => {
		now.value = Date.now();
	},
	TIME.SECOND,
	{ immediate: false },
);
watch(
	() =>
		backgroundJobsActive.value &&
		backgroundInProgress.value &&
		documentVisibility.value === 'visible',
	(active) => {
		if (active) {
			now.value = Date.now();
			resumeTimer();
		} else pauseTimer();
	},
	{ immediate: true },
);
const backgroundElapsed = computed(() => {
	const startedAt = backgroundJobs.value[0]?.startedAt;
	const start = startedAt ? Date.parse(startedAt) : now.value;
	const end = backgroundInProgress.value
		? now.value
		: Math.max(...backgroundJobs.value.map((job) => Date.parse(job.settledAt ?? '') || now.value));
	return formatAgentElapsedTime(end - start);
});

const attachedFiles = ref<File[]>([]);
const chatInput = useTemplateRef<InstanceType<typeof ChatInputBase>>('chatInput');
const backgroundJobCard = useTemplateRef<HTMLDivElement>('backgroundJobCard');
const backgroundJobStopButton =
	useTemplateRef<InstanceType<typeof N8nButton>>('backgroundJobStopButton');
const approvalCards = useTemplateRef<HTMLDivElement>('approvalCards');
const showBackgroundJobs = computed(
	() => backgroundJobsActive.value && backgroundJobs.value.length > 0,
);

function focusInput(options?: FocusOptions) {
	chatInput.value?.focus(options);
}

watch(
	[
		showBackgroundJobs,
		canStopBackgroundJobs,
		hasPendingApprovals,
		() => props.projectId,
		() => props.agentId,
		() => props.continueSessionId,
		() => props.visible,
	],
	async (
		[shown, stopShown, approvalsShown, ...target],
		[wasShown, stopWasShown, approvalsWereShown, ...previousTarget],
		onCleanup,
	) => {
		const removedFocusedControl =
			(!shown && wasShown && backgroundJobCard.value?.contains(document.activeElement)) ||
			(!stopShown &&
				stopWasShown &&
				backgroundJobStopButton.value?.$el === document.activeElement) ||
			(!approvalsShown &&
				approvalsWereShown &&
				approvalCards.value?.contains(document.activeElement));
		if (
			!removedFocusedControl ||
			!props.visible ||
			target.some((value, index) => value !== previousTarget[index])
		) {
			return;
		}

		let cancelled = false;
		onCleanup(() => {
			cancelled = true;
		});
		// Check focus before the control disappears, then wait for the composer to update.
		await nextTick();
		if (
			cancelled ||
			disposed ||
			!props.visible ||
			hasPendingApprovals.value ||
			document.activeElement !== document.body
		) {
			return;
		}
		focusInput({ preventScroll: true });
	},
);

const attachmentCapabilities = computed(() => {
	const provider = props.agentConfig?.model?.split('/')[0];
	return provider ? PROVIDER_CAPABILITIES[provider]?.attachments : undefined;
});
const showAttach = computed(() => {
	const capabilities = attachmentCapabilities.value;
	return !!capabilities && (capabilities.image || capabilities.pdf || capabilities.audio);
});
const acceptedMimeTypes = computed(() => {
	const capabilities = attachmentCapabilities.value;
	if (!capabilities) return undefined;
	return [
		capabilities.image ? 'image/*' : null,
		capabilities.pdf ? 'application/pdf' : null,
		capabilities.audio ? 'audio/*' : null,
	]
		.filter((entry): entry is string => entry !== null)
		.join(',');
});

function handleFilesSelected(files: File[]) {
	for (const file of files) {
		if (attachedFiles.value.length >= MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE) {
			toast.showMessage({
				type: 'error',
				title: locale.baseText('agents.chat.attachments.tooMany', {
					interpolate: { limit: String(MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE) },
				}),
			});
			break;
		}
		if (file.size > MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES) {
			toast.showMessage({
				type: 'error',
				title: locale.baseText('agents.chat.attachments.tooLarge', {
					interpolate: {
						fileName: file.name,
						limit: String(MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB),
					},
				}),
			});
			continue;
		}
		attachedFiles.value.push(file);
	}
}

function handleFileRemove(file: File) {
	attachedFiles.value = attachedFiles.value.filter((f) => f !== file);
}

const internalInputText = ref(props.inputDraft ?? '');
const inputText = computed<string>({
	get: () => (props.inputDraft !== undefined ? props.inputDraft : internalInputText.value),
	set: (value) => {
		if (props.inputDraft !== undefined) {
			emit('update:inputDraft', value);
		} else {
			internalInputText.value = value;
		}
	},
});
const hasDraft = computed(
	() => inputText.value.trim().length > 0 || attachedFiles.value.length > 0,
);
const isPreparingToSend = ref(false);
let disposed = false;
let queuedExternalMessage: string | undefined;
let submittingQueuedExternalMessage = false;
// The bubble a hand-off installed before it was sent. Its own `onSubmit` takes it.
let handoffPreview: ChatMessage | undefined;
// Files a hand-off staged into `attachedFiles`, tracked so an abandoned hand-off
// can drop only its own files and leave the user's own picks alone.
let externalAttachedFiles: File[] = [];

type SubmitResult = 'sent' | 'busy' | 'rejected';

const RUNTIME_ISSUE_PATH_PREFIXES = [
	{ prefix: 'tools.', key: 'agents.chat.misconfigured.missing.tools' },
	{ prefix: 'mcpServers.', key: 'agents.chat.misconfigured.missing.mcpServers' },
	{ prefix: 'subAgents.agents.', key: 'agents.chat.misconfigured.missing.subAgents.agents' },
] as const;

function humaniseMissingField(field: string): string {
	if (field.startsWith('skill:')) {
		return locale.baseText('agents.chat.misconfigured.missing.skill', {
			interpolate: { id: field.slice('skill:'.length) },
		});
	}
	const exactKey = `agents.chat.misconfigured.missing.${field}`;
	const exactTranslation = locale.baseText(exactKey as never);
	if (exactTranslation !== exactKey) {
		return exactTranslation;
	}
	for (const { prefix, key } of RUNTIME_ISSUE_PATH_PREFIXES) {
		if (field.startsWith(prefix)) {
			return locale.baseText(key);
		}
	}
	return field;
}

const missingFields = computed(() => {
	if (!fatalError.value) return '';
	return fatalError.value.missing.map(humaniseMissingField).join(', ');
});

/**
 * Only the last turn can hold the input. A parked run is always the tail of the
 * transcript, so anything after it — a resumed answer, a later turn — means that
 * suspension is history. Reading the tail rather than the first open card
 * anywhere keeps one abandoned card from wedging the chat for good, and keeps it
 * from hiding a real question on the current turn.
 */
const openInteractive = computed(() => findTailOpenInteractive(messages.value));
const hasOpenInteraction = computed(() => openInteractive.value !== undefined);
const hasOpenApproval = computed(() => openInteractive.value?.toolName === APPROVAL_TOOL_NAME);
// A waiting card is an interactive the user can act on, but never a question:
// its resume arrives from the workflow, so typing must not cancel and steer it.
const hasOpenWaitCard = computed(() => openInteractive.value?.toolName === WAIT_TOOL_NAME);
const hasOpenInteractiveQuestion = computed(
	() => hasOpenInteraction.value && !hasOpenApproval.value && !hasOpenWaitCard.value,
);
const hasOpenSuspension = computed(
	() =>
		messages.value[messages.value.length - 1]?.toolCalls?.some(
			(toolCall) => toolCall.state === TOOL_CALL_STATE.SUSPENDED && toolCall.runId,
		) ?? false,
);
const hasBudgetStop = computed(() =>
	messages.value.some((message) =>
		message.budgetNotices?.some((notice) => isBudgetStopCode(notice.code)),
	),
);
const canIncreaseBudget = computed(() => props.increaseBudget !== undefined);
const budgetIncreasePending = ref(false);
const isSubmissionBlocked = computed(
	() =>
		!!editingQueueId.value ||
		isPreparingToSend.value ||
		isSubmitting.value ||
		isLoadingHistory.value ||
		hasBudgetStop.value,
);
// Tools still pending/running after the stream ended (desync): the backend
// finished but their terminal events never arrived. Surfacing Stop here lets
// the user clear the stale pulsing state without reloading the chat.
const hasInFlightToolCalls = computed(() =>
	messages.value.some((message) =>
		message.toolCalls?.some(
			(toolCall) =>
				toolCall.state === TOOL_CALL_STATE.PENDING || toolCall.state === TOOL_CALL_STATE.RUNNING,
		),
	),
);
const showStop = computed(
	() =>
		!hasDraft.value &&
		!isLoadingHistory.value &&
		(isStreaming.value ||
			isCancelling.value ||
			hasOpenInteraction.value ||
			hasOpenSuspension.value ||
			hasInFlightToolCalls.value),
);

const chatPlaceholder = computed(() => {
	if (hasOpenInteractiveQuestion.value) {
		return locale.baseText('agents.chat.answerQuestionPlaceholder');
	}

	if (queuedMessages.value.length > 0) {
		return locale.baseText(
			isMacOs
				? 'agents.chat.input.placeholder.withQueue.mac'
				: 'agents.chat.input.placeholder.withQueue.other',
		);
	}

	const agentName = props.agentConfig?.name?.trim();
	return agentName
		? locale.baseText('agents.chat.input.placeholder.withAgent', {
				interpolate: { agentName },
			})
		: locale.baseText('agents.chat.input.placeholder');
});

/**
 * Installs the first-message bubble and returns it. Returns undefined when a bubble
 * already shows: a second send before the first run starts must not replace it.
 */
function previewFirstMessage(text: string, files: File[] = []): ChatMessage | undefined {
	if (!props.centerEmptyState || messages.value.length > 0 || firstMessagePreview.value) {
		return undefined;
	}
	firstMessagePreview.value = {
		id: 'first-message-preview',
		role: 'user',
		content: text,
		status: 'success',
		createdAt: Date.now(),
		attachments: files.map((file) => ({
			fileName: file.name,
			mimeType: resolveFileMimeType(file.name, file.type) || 'application/octet-stream',
			sizeBytes: file.size,
			file,
		})),
	};
	previewQueueId.value = undefined;
	return firstMessagePreview.value;
}
watch([() => messages.value.length, fatalError], ([count, error]) => {
	if (count > 0 || error) firstMessagePreview.value = undefined;
});
const displayedMessages = computed(() =>
	isPreviewingFirstMessage.value && firstMessagePreview.value
		? [firstMessagePreview.value]
		: messages.value,
);
const displayedMessagingState = computed(() =>
	isPreviewingFirstMessage.value ? 'waitingFirstChunk' : messagingState.value,
);

const isCenteredEmpty = computed(
	() =>
		props.centerEmptyState &&
		props.newSession &&
		displayedMessages.value.length === 0 &&
		!isStreaming.value,
);

watch(isStreaming, (v) => emit('update:streaming', v));
watch(
	() => messages.value.find((message) => message.role === 'user')?.content,
	(text) => emit('first-user-message', text),
	{ immediate: true },
);
watch(isSubmissionBlocked, (blocked) => {
	if (!blocked) void submitQueuedExternalMessage();
});
watch(
	() => props.visible,
	(visible) => {
		if (visible) refresh();
	},
);

watch(
	() => [props.projectId, props.agentId, props.continueSessionId],
	() => {
		queuedExternalMessage = undefined;
		handoffPreview = undefined;
		editingQueueId.value = undefined;
		queueExpanded.value = false;
		queueOrder.value = undefined;
		firstMessagePreview.value = undefined;
		// A blocked hand-off's own files must not ride out with the next message to
		// the new target; a file the user picked themselves stays.
		if (externalAttachedFiles.length) {
			attachedFiles.value = attachedFiles.value.filter(
				(file) => !externalAttachedFiles.includes(file),
			);
			externalAttachedFiles = [];
		}
	},
);

function consumeQueuedExternalMessage(message: string) {
	if (queuedExternalMessage !== message) return;
	queuedExternalMessage = undefined;
	emit('initial-consumed');
}

/**
 * Call this when a message is accepted, on both the normal send path and the
 * cancel-and-steer path (answering an open question card). It is the single
 * place that needs to track a send on the n8n Chat channel.
 */
function trackSentToN8nChat(hadNoMessagesBeforeSend: boolean) {
	if (props.channel !== 'n8n-chat' || !props.continueSessionId) return;
	agentTelemetry.trackSentMessageToN8nChatAgent({
		agentId: props.agentId,
		threadId: props.continueSessionId,
		isNewThread: hadNoMessagesBeforeSend,
	});
}

async function onSubmit(): Promise<SubmitResult> {
	const text = inputText.value.trim();
	const files = [...attachedFiles.value];
	if (!text && files.length === 0) return 'rejected';
	if (isSubmissionBlocked.value) return 'busy';
	// Taken before any await, so a user send made while this hand-off runs cannot claim it.
	const ownedHandoffPreview = submittingQueuedExternalMessage ? handoffPreview : undefined;
	if (ownedHandoffPreview) handoffPreview = undefined;
	const hadNoMessagesBeforeSend = messages.value.length === 0;
	const target = {
		projectId: props.projectId,
		agentId: props.agentId,
		continueSessionId: props.continueSessionId,
	};
	const isCurrentTarget = () =>
		!disposed &&
		props.projectId === target.projectId &&
		props.agentId === target.agentId &&
		props.continueSessionId === target.continueSessionId;

	if (hasOpenInteractiveQuestion.value) {
		if (!text) return 'rejected';
		const result = await cancelAndSteer(text, () => {
			if (!isCurrentTarget()) return;
			if (inputText.value.trim() === text) inputText.value = '';
			consumeQueuedExternalMessage(text);
			trackSentToN8nChat(hadNoMessagesBeforeSend);
		});
		return result === 'busy' ? 'busy' : 'sent';
	}

	isPreparingToSend.value = true;
	try {
		try {
			await props.beforeSend?.();
		} catch {
			return 'rejected';
		}
		if (!isCurrentTarget()) return 'rejected';

		// The preview chat metric counts only builder test messages; n8n Chat sends have
		// their own event (`trackSentToN8nChat`).
		const fingerprint =
			props.channel === 'chat'
				? await buildAgentConfigFingerprint(props.agentConfig, props.connectedTriggers)
				: undefined;
		if (!isCurrentTarget()) return 'rejected';

		const installedPreview = previewFirstMessage(text, files) ?? ownedHandoffPreview;
		let accepted = false;
		const sending = sendMessage(text, files.length > 0 ? files : undefined, (queueId) => {
			accepted = true;
			if (!isCurrentTarget()) return;
			if (installedPreview && firstMessagePreview.value === installedPreview) {
				previewQueueId.value = queueId;
			}
			if (fingerprint) {
				agentTelemetry.trackSubmittedMessage({
					agentId: props.agentId,
					status: props.agentStatus,
					agentConfig: fingerprint,
				});
			}
			if (inputText.value.trim() === text) inputText.value = '';
			attachedFiles.value = attachedFiles.value.filter((file) => !files.includes(file));
			externalAttachedFiles = [];
			queueExpanded.value = false;
			consumeQueuedExternalMessage(text);
			trackSentToN8nChat(hadNoMessagesBeforeSend);
		});
		isPreparingToSend.value = false;
		const result = await sending;
		// A send the server never accepted (busy, failed, lost) won't bring the real
		// messages that replace the preview, so drop it here -- but only while this
		// send's own preview is still the one showing. A newer hand-off's own preview
		// must survive this one settling late.
		if (!accepted && firstMessagePreview.value === installedPreview) {
			firstMessagePreview.value = undefined;
		}
		if (result === 'busy') return 'busy';
		return 'sent';
	} finally {
		isPreparingToSend.value = false;
	}
}

/**
 * Drops the stop notices a persisted cap change resolves. Call only after the
 * new cap is saved: a failed or skipped save must keep the stop card up and
 * Send blocked, because the next run would stop against the old cap again.
 */
function clearBudgetStops(fields: BudgetAmountField[]) {
	clearBudgetNotices(new Set(fields.flatMap(budgetNoticeCodesForField)));
}

async function onIncreaseBudget(payload: { field: BudgetAmountField; amount: number }) {
	if (!props.increaseBudget || budgetIncreasePending.value) return;
	// The save outlives this panel. A session switch reuses the instance, and
	// clearing then would drop the new session's stop and unblock its Send.
	const target = {
		projectId: props.projectId,
		agentId: props.agentId,
		continueSessionId: props.continueSessionId,
	};
	budgetIncreasePending.value = true;
	try {
		const saved = await props.increaseBudget(payload);
		const stillCurrent =
			!disposed &&
			props.projectId === target.projectId &&
			props.agentId === target.agentId &&
			props.continueSessionId === target.continueSessionId;
		if (!saved || !stillCurrent) return;
		clearBudgetStops([payload.field]);
	} finally {
		budgetIncreasePending.value = false;
	}
}

function sendMessageFromOutside(message: string, files?: File[]) {
	queuedExternalMessage = message;
	externalAttachedFiles = files ?? [];
	// Staged as the composer's own attachments, with the same count and size checks
	// as a picked file: `onSubmit` reads `attachedFiles`, so they ride along with
	// every retry `submitQueuedExternalMessage` makes while blocked.
	if (files?.length) handleFilesSelected(files);
	handoffPreview = previewFirstMessage(message, attachedFiles.value);
	// A previewed message already shows as a bubble; `submitQueuedExternalMessage` fills
	// the composer itself right before it submits.
	if (!firstMessagePreview.value) inputText.value = message;
	void submitQueuedExternalMessage();
}

async function submitQueuedExternalMessage() {
	const message = queuedExternalMessage;
	// An empty text is still a send when files are staged with it.
	if (message === undefined || submittingQueuedExternalMessage || isSubmissionBlocked.value) return;

	submittingQueuedExternalMessage = true;
	let result: SubmitResult = 'rejected';
	try {
		inputText.value = message;
		result = await onSubmit();
	} finally {
		submittingQueuedExternalMessage = false;
	}

	if (result === 'rejected' && queuedExternalMessage === message) {
		queuedExternalMessage = undefined;
		firstMessagePreview.value = undefined;
		// The files stay in the composer as the user's draft now.
		externalAttachedFiles = [];
	}
	if (
		queuedExternalMessage !== undefined &&
		queuedExternalMessage !== message &&
		!isSubmissionBlocked.value
	) {
		await nextTick();
		void submitQueuedExternalMessage();
	}
}

function getConversationMarkdown(): string {
	return messages.value
		.filter((message) => message.content.trim().length > 0)
		.map((message) => {
			const speaker = message.role === 'user' ? 'User' : 'Agent';
			return `**${speaker}:**\n\n${message.content.trim()}`;
		})
		.join('\n\n---\n\n');
}

defineExpose({ focusInput, getConversationMarkdown, sendMessageFromOutside, clearBudgetStops });

onMounted(() => {
	void loadHistory();
});

onBeforeUnmount(() => {
	disposed = true;
	detachStream();
});
</script>

<template>
	<aside
		v-if="visible"
		:class="[
			mode === 'inline' ? $style.inlinePanel : $style.panel,
			{ [$style.centeredEmpty]: isCenteredEmpty },
		]"
	>
		<N8nCallout v-if="fatalError" theme="danger" :class="$style.errorBanner" slim>
			<div :class="$style.errorBannerBody">
				<span :class="$style.errorBannerTitle">
					{{ locale.baseText('agents.chat.misconfigured.title') }}
				</span>
				<span v-if="missingFields" :class="$style.errorBannerDetail">
					{{ locale.baseText('agents.chat.misconfigured.issuesPrefix') }} {{ missingFields }}
				</span>
			</div>
			<template #trailingContent>
				<N8nTooltip :content="locale.baseText('agents.chat.misconfigured.dismiss')" placement="top">
					<N8nButton
						icon-only
						variant="ghost"
						size="xsmall"
						:aria-label="locale.baseText('agents.chat.misconfigured.dismiss')"
						@click="dismissFatalError"
					>
						<template #icon><N8nIcon icon="x" size="xsmall" aria-hidden="true" /></template>
					</N8nButton>
				</N8nTooltip>
			</template>
		</N8nCallout>

		<div
			v-for="(warning, index) in warnings"
			:key="`${warning.code ?? 'mcp'}-${index}`"
			:class="$style.warningBanner"
		>
			<N8nCallout theme="warning" slim :data-test-id="`agent-chat-warning-${index}`">
				<div :class="$style.warningBannerBody">
					<span :class="$style.warningBannerTitle">
						{{ locale.baseText('agents.chat.warning.mcp.title') }}
					</span>
					<span :class="$style.warningBannerDetail">{{
						warning.server
							? locale.baseText('agents.chat.warning.mcp.detail', {
									interpolate: { server: warning.server, error: warning.message },
								})
							: warning.message
					}}</span>
				</div>
				<template #trailingContent>
					<N8nTooltip :content="locale.baseText('agents.chat.warning.dismiss')" placement="top">
						<N8nButton
							icon-only
							variant="ghost"
							size="xsmall"
							:aria-label="locale.baseText('agents.chat.warning.dismiss')"
							@click="dismissWarning(index)"
						>
							<template #icon><N8nIcon icon="x" size="xsmall" aria-hidden="true" /></template>
						</N8nButton>
					</N8nTooltip>
				</template>
			</N8nCallout>
		</div>

		<template v-if="displayedMessages.length === 0 && !isStreaming">
			<slot name="empty-state">
				<AgentChatEmptyState :agent-config="agentConfig" />
			</slot>
		</template>
		<AgentChatMessageList
			v-else
			:messages="displayedMessages"
			:messaging-state="displayedMessagingState"
			:project-id="projectId"
			:agent-id="agentId"
			:session-id="continueSessionId"
			:can-send-to-assistant="canSendToAssistant"
			:dismissed-fix-tool-call-ids="dismissedFixToolCallIds"
			:can-increase-budget="canIncreaseBudget"
			:budget-increase-pending="budgetIncreasePending"
			@resume="resume"
			@send-to-assistant="emit('send-to-assistant', $event)"
			@increase-budget="onIncreaseBudget"
		/>

		<div :class="$style.inputArea">
			<div
				v-if="showBackgroundJobs"
				ref="backgroundJobCard"
				:class="$style.backgroundJobs"
				data-testid="agent-background-jobs"
			>
				<N8nAiActivityStepGroup
					:key="continueSessionId"
					:label="backgroundTitle"
					full-width
					content-position="above"
				>
					<template #prefix>
						<N8nIcon
							:icon="backgroundInProgress ? 'loader-circle' : 'circle'"
							:spin="backgroundInProgress"
							size="small"
							:class="{ [$style.jobSpinner]: backgroundInProgress }"
							aria-hidden="true"
						/>
					</template>
					<template #header-trailing>
						<span
							:class="$style.jobTimer"
							aria-live="off"
							data-testid="agent-background-jobs-timer"
							>{{ backgroundElapsed }}</span
						>
					</template>
					<div :class="$style.backgroundJobDetails">
						<ul :class="$style.backgroundJobList">
							<li v-for="job in backgroundJobRows" :key="job.id">
								<span
									role="img"
									:aria-label="job.indicator.label"
									:title="job.indicator.label"
									:class="[
										$style.jobStatus,
										{ [$style.jobWaiting]: job.indicator.icon === 'circle' },
									]"
									:data-status="job.status"
								>
									<N8nIcon
										:icon="job.indicator.icon"
										:spin="job.indicator.icon === 'loader-circle'"
										size="small"
										:class="{ [$style.jobSpinner]: job.indicator.icon === 'loader-circle' }"
									/>
								</span>
								<span :class="$style.jobLabel">{{ job.label }}</span>
								<N8nText
									v-if="job.stopping || job.stopped"
									:class="$style.jobProgress"
									size="small"
									color="text-light"
									aria-hidden="true"
								>
									{{ job.indicator.label }}
								</N8nText>
							</li>
						</ul>
						<div :class="$style.backgroundJobActions">
							<N8nLink
								v-if="continueSessionId"
								:to="backgroundTraceRoute"
								theme="text"
								size="small"
								underline
								data-testid="agent-background-jobs-trace"
							>
								<span :class="$style.jobTraceLabel">
									<N8nIcon icon="arrow-right" size="small" aria-hidden="true" />
									{{ locale.baseText('agents.chat.backgroundTasks.viewTrace') }}
								</span>
							</N8nLink>
							<N8nButton
								v-if="canStopBackgroundJobs"
								ref="backgroundJobStopButton"
								variant="ghost"
								size="small"
								:class="$style.jobStopButton"
								:disabled="isStopping"
								data-testid="agent-background-jobs-stop"
								@click="stopBackgroundJobs"
							>
								<span :class="$style.jobTraceLabel">
									<N8nIcon icon="filled-square" size="small" aria-hidden="true" />
									{{ locale.baseText('agents.chat.backgroundTasks.stopAll') }}
								</span>
							</N8nButton>
						</div>
					</div>
				</N8nAiActivityStepGroup>
			</div>
			<div v-if="hasPendingApprovals" ref="approvalCards" data-testid="agent-chat-approvals">
				<ApprovalCard
					v-if="pendingApproval"
					:key="pendingApproval.toolCallId"
					:input="pendingApproval.input"
					@submit="
						resume({
							runId: pendingApproval.runId,
							toolCallId: pendingApproval.toolCallId,
							resumeData: $event,
						})
					"
				/>
				<div
					v-else-if="backgroundApproval"
					:key="`${backgroundApproval.id}:${backgroundApproval.approval.toolCallId}`"
					:class="$style.backgroundApproval"
				>
					<N8nText bold size="small">{{
						locale.baseText('agents.chat.backgroundTasks.approvalFor', {
							interpolate: { title: backgroundApproval.title },
						})
					}}</N8nText>
					<ApprovalCard
						:input="backgroundApproval.input"
						:disabled="pendingBackgroundResponses.has(backgroundApproval.approval.toolCallId)"
						@submit="respondToBackgroundApproval(backgroundApproval.approval, $event)"
					/>
				</div>
			</div>
			<div v-else :class="$style.composer">
				<ChatInputBase
					ref="chatInput"
					v-model="inputText"
					:placeholder="chatPlaceholder"
					:is-streaming="false"
					:show-stop-button="showStop"
					show-voice
					:show-attach="showAttach"
					:accepted-mime-types="acceptedMimeTypes"
					:can-submit="!isSubmissionBlocked && hasDraft"
					:disabled="isPreparingToSend || !!editingQueueId"
					data-testid="chat-input"
					@submit="onSubmit"
					@stop="stopGenerating"
					@files-selected="handleFilesSelected"
					@keydown="onChatInputKeydown"
				>
					<template v-if="currentPlan" #header>
						<AgentChatPlan
							v-if="currentPlan"
							:key="`${agentId}:${continueSessionId ?? ''}:${currentPlan.planId}`"
							:plan="currentPlan"
							:trace-route="continueSessionId ? backgroundTraceRoute : undefined"
						/>
					</template>
					<template #above>
						<ChatMessageQueue
							v-if="displayedQueueRows.length"
							:displayed-items="queueDisplayItems"
							:expanded="queueExpanded"
							:is-reordering="isReorderingQueue"
							:can-edit="!hasDraft && !isSubmissionBlocked"
							:steer-action="queueSteerAction"
							:can-steer="canSteer"
							:can-drag-queue-item="canDragQueueItem"
							:is-queue-item-busy="isDisplayedQueueItemBusy"
							:can-drop-queue-item="canDropQueueItem"
							@update:expanded="queueExpanded = $event"
							@drag-start="startQueueDrag"
							@drag-end="endQueueDrag"
							@steer="steerQueuedMessage"
							@edit="editQueuedMessage"
							@remove="removeQueuedMessage"
						/>
					</template>
					<template v-if="attachedFiles.length > 0" #attachments>
						<div :class="$style.attachmentsStrip">
							<AttachmentPreview
								v-for="(file, index) in attachedFiles"
								:key="`${file.name}-${index}`"
								:file="file"
								is-removable
								@remove="handleFileRemove"
							/>
						</div>
					</template>
					<template #footer-start>
						<slot name="footer-start" />
					</template>
				</ChatInputBase>
				<slot name="input-footer" />
			</div>
		</div>
	</aside>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.panel {
	position: relative;
	width: 400px;
	min-width: 400px;
	border-left: var(--border);
	display: flex;
	flex-direction: column;
}

.inlinePanel {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.centeredEmpty {
	justify-content: center;
}

.composer {
	display: flex;
	flex-direction: column;
}

.inputArea {
	flex-shrink: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
	max-width: 800px;
	margin: 0 auto;
}

.backgroundJobs {
	min-width: 0;

	--ai-activity-step--height: auto;
	--ai-activity-step--min-height: var(--height--xl);
	--ai-activity-step--padding: var(--spacing--xs) var(--spacing--sm);
	--ai-activity-step--color: var(--text-color);
	display: none;
	background: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	border-radius: var(--radius--xs);
}

.backgroundJobDetails {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
	border-bottom-style: dashed;
}

.backgroundApproval {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.backgroundJobList {
	list-style: none;
	margin: 0;
	padding: 0;
	width: 100%;
	max-height: 20vh;
	overflow-y: auto;

	li {
		display: flex;
		align-items: baseline;
		gap: var(--spacing--2xs);
		padding-block: var(--spacing--3xs);
		font-size: var(--font-size--sm);
		color: var(--text-color--subtle);
		overflow-wrap: anywhere;
		line-height: var(--line-height--lg);
	}
}

.jobLabel {
	flex: 1;
	min-width: 0;
}

.jobProgress {
	flex-shrink: 0;
	white-space: nowrap;
}

.jobStatus {
	display: inline-flex;
	flex-shrink: 0;
	line-height: inherit;
	color: var(--color--foreground--shade-2);

	&[data-status='completed'] {
		color: var(--color--success);
		@include motion.fade-in;
	}

	&[data-status='failed'] {
		color: var(--color--danger);
	}
}

.jobWaiting circle {
	fill: currentColor;
}

.jobTraceLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.backgroundJobActions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
}

.jobStopButton {
	--button--color: var(--color--text);
	--button--color--background-hover: transparent;
	--button--color--background-active: transparent;

	padding: 0;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);

	&:hover:not(:disabled) {
		color: var(--color--primary);
	}

	&:active:not(:disabled) {
		color: var(--color--primary--shade-1);
	}
}

.jobSpinner {
	flex-shrink: 0;
	color: var(--color--primary);
}

.jobTimer {
	font-variant-numeric: tabular-nums;
	font-size: var(--font-size--xs);
	color: var(--text-color--subtler);
}

.attachmentsStrip {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs) 0;
}

.errorBanner {
	margin: var(--spacing--sm);
	flex-shrink: 0;
}

.errorBannerBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.errorBannerTitle {
	font-weight: var(--font-weight--bold);
}

.errorBannerDetail {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.warningBanner {
	margin: var(--spacing--sm);
	flex-shrink: 0;
}

.warningBannerBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.warningBannerTitle {
	font-weight: var(--font-weight--bold);
}

.warningBannerDetail {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	word-break: break-word;
}
</style>
