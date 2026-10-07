<script setup lang="ts">
import {
	computed,
	ref,
	shallowRef,
	toRef,
	watch,
	onMounted,
	onBeforeUnmount,
	useTemplateRef,
	nextTick,
	useId,
} from 'vue';
import Draggable from 'vuedraggable';
import {
	N8nAiActivityStepGroup,
	N8nAiActivityStepButton,
	N8nAiActivityStepChevron,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nInput,
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
import { useToast } from '@n8n/composables/useToast';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import AttachmentPreview from '@/features/ai/instanceAi/components/AttachmentPreview.vue';
import { useAgentChatStream } from '../composables/useAgentChatStream';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import {
	findTailOpenInteractive,
	getMessageInteractives,
	parseApprovalInput,
} from '@/features/ai/shared/agentsChat/messageMappers';
import AgentChatEmptyState from './AgentChatEmptyState.vue';
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
		budgetCards?: boolean;
		/**
		 * Persists a raised budget cap. Omitted when the user cannot edit the
		 * agent (or editing is locked) — the notice cards then hide the
		 * increase action. Resolves true once the new cap is saved.
		 */
		increaseBudget?: (payload: { field: BudgetAmountField; amount: number }) => Promise<boolean>;
		/**
		 * Lets the host answer an open card with the composer text (for example an
		 * n8n Assistant plan review: typed text requests changes). Return the
		 * resume data, or `undefined` to keep the default cancel-and-steer.
		 */
		composerResumeData?: (payload: InteractivePayload, text: string) => unknown;
		/**
		 * Builds per-message context that the host sends with each new message
		 * (for example the n8n Assistant time zone and hand-off context).
		 */
		hostContext?: () => Record<string, unknown> | undefined;
		/**
		 * Enables file attachments without an agent config. The value is the
		 * accepted MIME types for the file picker; an empty string accepts any file.
		 */
		attachmentAccept?: string;
		/** Overrides the default composer placeholder. */
		placeholder?: string;
		/**
		 * Shows the composer's own attach button. A host that offers attachments
		 * from its own `footer-start` menu turns it off and calls `openFilePicker`.
		 */
		showAttachButton?: boolean;
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
		budgetCards: false,
		increaseBudget: undefined,
		composerResumeData: undefined,
		hostContext: undefined,
		attachmentAccept: undefined,
		placeholder: undefined,
		showAttachButton: true,
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
	/** A new message was accepted by the server, with the host context it carried. */
	'message-accepted': [
		payload: { text: string; files: File[]; hostContext?: Record<string, unknown> },
	];
}>();

defineSlots<{
	'footer-start'?: () => unknown;
	/** Replaces the default empty state. */
	empty?: () => unknown;
	/** Content docked above the composer (for example a setup checklist). */
	'above-input'?: () => unknown;
	/** Offers that sit between the transcript and the composer. */
	'inline-offers'?: () => unknown;
	/** Extra chips in the composer attachment strip (for example hand-off context). */
	'composer-attachments'?: () => unknown;
}>();

const locale = useI18n();
const agentTelemetry = useAgentTelemetry();
const toast = useToast();

const {
	messages,
	queuedMessages,
	removingQueueIds,
	steeringQueueIds,
	canSteer,
	steerQueuedMessage,
	removeQueuedMessage,
	updateQueuedMessage,
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
	onHistoryLoaded: (count) => {
		if (props.continueSessionId) {
			emit('continue-loaded', { sessionId: props.continueSessionId, count });
		}
	},
	onSessionCreated: (sessionId) => emit('session-created', sessionId),
	budgetCards: props.budgetCards,
});

const currentPlan = computed(() => selectLatestAgentPlan(messages.value));

const queueEdit = ref<{
	item: AgentChatQueueItem;
	text: string;
	unavailable: boolean;
	saving: boolean;
}>();
const queueRows = computed(() => {
	const edit = queueEdit.value;
	if (edit && !queuedMessages.value.some((item) => item.id === edit.item.id)) {
		return [...queuedMessages.value, edit.item];
	}
	return queuedMessages.value;
});
const queueElement = useTemplateRef<HTMLDivElement>('messageQueue');
const queueListId = useId();
const queueExpanded = ref(false);
const queueOrder = shallowRef<AgentChatQueueItem[]>();
const displayedQueueRows = computed(() => queueOrder.value ?? queueRows.value);
const visibleQueueRows = computed(() =>
	queueExpanded.value ? displayedQueueRows.value : displayedQueueRows.value.slice(0, 2),
);
const canSaveQueueEdit = computed(() => {
	const edit = queueEdit.value;
	return (
		edit &&
		!edit.saving &&
		!edit.unavailable &&
		(edit.text.trim().length > 0 || !!edit.item.attachments?.length)
	);
});
watch(queuedMessages, (items) => {
	const edit = queueEdit.value;
	if (!edit) return;
	const current = items.find((item) => item.id === edit.item.id);
	edit.unavailable = !current || !!current.steeringExecutionId;
});
function startQueueEdit(item: AgentChatQueueItem) {
	if (item.steeringExecutionId) return;
	queueEdit.value = { item, text: item.message, unavailable: false, saving: false };
}
function isQueueItemBusy(item: AgentChatQueueItem) {
	return (
		isReorderingQueue.value ||
		!!item.steeringExecutionId ||
		steeringQueueIds.value.has(item.id) ||
		removingQueueIds.value.has(item.id)
	);
}
function canMoveQueueItem(items: AgentChatQueueItem[], from: number, to: number) {
	if (queueEdit.value || from === to || !items[from] || !items[to]) return false;
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
	await nextTick();
	queueElement.value
		?.querySelector<HTMLButtonElement>(
			`[data-queue-id="${item.id}"] [data-testid="agent-queue-drag-handle"]:not(:disabled)`,
		)
		?.focus();
}
function onQueueHandleKeydown(event: KeyboardEvent, index: number) {
	if (queueOrder.value || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
	event.preventDefault();
	event.stopPropagation();
	const delta = event.key === 'ArrowUp' ? -1 : 1;
	void moveQueueItem(queueRows.value, index, index + delta);
}
async function saveQueueEdit() {
	const edit = queueEdit.value;
	if (!edit || !canSaveQueueEdit.value) return;
	edit.saving = true;
	const result = await updateQueuedMessage(edit.item.id, edit.text);
	if (queueEdit.value !== edit) return;
	edit.saving = false;
	if (result === 'updated') queueEdit.value = undefined;
	else if (result === 'unavailable') edit.unavailable = true;
}
function onQueueEditKeydown(event: KeyboardEvent) {
	if (event.isComposing) return;
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		if (!queueEdit.value?.saving) queueEdit.value = undefined;
	} else if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();
		void saveQueueEdit();
	}
}

const {
	jobs: backgroundJobs,
	respondToApproval,
	stopAll,
	isStopping,
} = useAgentBackgroundJobs({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	threadId: () => props.continueSessionId,
	active: () => props.backgroundJobsActive,
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
	if (!props.backgroundJobsActive) return undefined;
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
		props.backgroundJobsActive &&
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
	() => props.backgroundJobsActive && backgroundJobs.value.length > 0,
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
	if (props.attachmentAccept !== undefined) return true;
	const capabilities = attachmentCapabilities.value;
	return !!capabilities && (capabilities.image || capabilities.pdf || capabilities.audio);
});
const acceptedMimeTypes = computed(() => {
	if (props.attachmentAccept !== undefined) return props.attachmentAccept || undefined;
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
		isPreparingToSend.value || isSubmitting.value || isLoadingHistory.value || hasBudgetStop.value,
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
	if (props.placeholder) return props.placeholder;

	const agentName = props.agentConfig?.name?.trim();
	return agentName
		? locale.baseText('agents.chat.input.placeholder.withAgent', {
				interpolate: { agentName },
			})
		: locale.baseText('agents.chat.input.placeholder');
});

watch(isStreaming, (v) => emit('update:streaming', v));
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
		queueEdit.value = undefined;
		queueExpanded.value = false;
		queueOrder.value = undefined;
	},
);

function consumeQueuedExternalMessage(message: string) {
	if (queuedExternalMessage !== message) return;
	queuedExternalMessage = undefined;
	emit('initial-consumed');
}

async function onSubmit(): Promise<SubmitResult> {
	const text = inputText.value.trim();
	const files = [...attachedFiles.value];
	if (!text && files.length === 0) return 'rejected';
	if (isSubmissionBlocked.value) return 'busy';
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

	const tailInteractive = openInteractive.value;
	const composerResume =
		text && tailInteractive?.runId && props.composerResumeData
			? props.composerResumeData(tailInteractive, text)
			: undefined;
	if (tailInteractive?.runId && composerResume !== undefined) {
		const result = await resume(
			{
				runId: tailInteractive.runId,
				toolCallId: tailInteractive.toolCallId,
				resumeData: composerResume,
			},
			() => {
				if (!isCurrentTarget()) return;
				if (inputText.value.trim() === text) inputText.value = '';
				consumeQueuedExternalMessage(text);
			},
		);
		return result === 'busy' ? 'busy' : 'sent';
	}

	if (hasOpenInteractiveQuestion.value) {
		if (!text) return 'rejected';
		const result = await cancelAndSteer(text, () => {
			if (!isCurrentTarget()) return;
			if (inputText.value.trim() === text) inputText.value = '';
			consumeQueuedExternalMessage(text);
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

		const fingerprint = await buildAgentConfigFingerprint(
			props.agentConfig,
			props.connectedTriggers,
		);
		if (!isCurrentTarget()) return 'rejected';

		const hostContext = props.hostContext?.();
		const onAccepted = () => {
			if (!isCurrentTarget()) return;
			emit('message-accepted', { text, files, hostContext });
			agentTelemetry.trackSubmittedMessage({
				agentId: props.agentId,
				status: props.agentStatus,
				agentConfig: fingerprint,
			});
			if (inputText.value.trim() === text) inputText.value = '';
			attachedFiles.value = attachedFiles.value.filter((file) => !files.includes(file));
			consumeQueuedExternalMessage(text);
		};
		const sentFiles = files.length > 0 ? files : undefined;
		const sending = hostContext
			? sendMessage(text, sentFiles, onAccepted, hostContext)
			: sendMessage(text, sentFiles, onAccepted);
		isPreparingToSend.value = false;
		const result = await sending;
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

/**
 * Sends a message the host wrote. Resolves to `false` when the message was
 * rejected. A message that waits for the chat to be ready counts as sent.
 */
async function sendMessageFromOutside(message: string, files?: File[]): Promise<boolean> {
	queuedExternalMessage = message;
	inputText.value = message;
	if (files?.length) attachedFiles.value = [...attachedFiles.value, ...files];
	const result = await submitQueuedExternalMessage();
	return result !== 'rejected';
}

async function sendReview(message: string): Promise<boolean> {
	if (isSubmissionBlocked.value || isStreaming.value || hasOpenInteraction.value) return false;
	const sessionId = props.continueSessionId;
	isPreparingToSend.value = true;
	try {
		await props.beforeSend?.();
		if (disposed || props.continueSessionId !== sessionId) return false;
		let accepted = false;
		await sendMessage(message, undefined, () => {
			accepted = true;
		});
		return accepted;
	} finally {
		isPreparingToSend.value = false;
	}
}

async function submitQueuedExternalMessage(): Promise<SubmitResult | undefined> {
	const message = queuedExternalMessage;
	if (!message || submittingQueuedExternalMessage || isSubmissionBlocked.value) return undefined;

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
	}
	if (queuedExternalMessage && queuedExternalMessage !== message && !isSubmissionBlocked.value) {
		await nextTick();
		void submitQueuedExternalMessage();
	}
	return result;
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

function isDirty(): boolean {
	return hasDraft.value;
}

/** Puts text into the composer without sending it. */
function setDraft(text: string) {
	inputText.value = text;
}

defineExpose({
	focusInput,
	getConversationMarkdown,
	sendMessageFromOutside,
	isDirty,
	setDraft,
	clearBudgetStops,
	openFilePicker: () => chatInput.value?.openFilePicker(),
	// Read-only views of the chat state, for hosts that derive side panels from it.
	messages: computed(() => messages.value),
	isStreaming,
	isLoadingHistory: computed(() => isLoadingHistory.value),
	sendReview,
});

onMounted(() => {
	void loadHistory();
});

onBeforeUnmount(() => {
	disposed = true;
	detachStream();
});
</script>

<template>
	<aside v-if="visible" :class="[mode === 'inline' ? $style.inlinePanel : $style.panel]">
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

		<template v-if="messages.length === 0 && !isStreaming">
			<slot name="empty">
				<AgentChatEmptyState :agent-config="agentConfig" />
			</slot>
		</template>
		<AgentChatMessageList
			v-else
			:messages="messages"
			:messaging-state="messagingState"
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

		<slot name="inline-offers" />

		<div :class="$style.inputArea">
			<slot name="above-input" />
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
			<ChatInputBase
				v-else
				ref="chatInput"
				v-model="inputText"
				:placeholder="chatPlaceholder"
				:is-streaming="false"
				:show-stop-button="showStop"
				show-voice
				:show-attach="showAttach"
				:show-attach-button="showAttachButton"
				:accepted-mime-types="acceptedMimeTypes"
				:can-submit="!isSubmissionBlocked && hasDraft"
				:disabled="isPreparingToSend"
				data-testid="chat-input"
				@submit="onSubmit"
				@stop="stopGenerating"
				@files-selected="handleFilesSelected"
			>
				<template v-if="currentPlan || displayedQueueRows.length" #header>
					<AgentChatPlan
						v-if="currentPlan"
						:key="`${agentId}:${continueSessionId ?? ''}:${currentPlan.planId}`"
						:plan="currentPlan"
						:trace-route="continueSessionId ? backgroundTraceRoute : undefined"
					/>
					<div
						v-if="displayedQueueRows.length"
						ref="messageQueue"
						:class="$style.messageQueue"
						data-testid="agent-message-queue"
					>
						<Draggable
							:id="queueListId"
							:model-value="visibleQueueRows"
							item-key="id"
							tag="ul"
							:class="[$style.backgroundJobList, $style.queueList]"
							:handle="`.${$style.queueDragHandle}:not(:disabled)`"
							:disabled="!!queueEdit || isReorderingQueue"
							:move="canDropQueueItem"
							:ghost-class="$style.queueGhost"
							:drag-class="$style.queueDragging"
							@start="startQueueDrag"
							@end="endQueueDrag"
						>
							<template #item="{ element: item, index }">
								<li :data-queue-id="item.id" data-testid="agent-queued-message">
									<N8nTooltip
										:content="locale.baseText('agents.chat.queue.reorderTooltip')"
										:disabled="!canDragQueueItem(index)"
										placement="top"
									>
										<N8nButton
											icon-only
											variant="ghost"
											size="xsmall"
											:class="$style.queueDragHandle"
											:disabled="!canDragQueueItem(index)"
											:aria-label="
												locale.baseText('agents.chat.queue.reorder', {
													interpolate: { position: index + 1, count: displayedQueueRows.length },
												})
											"
											aria-keyshortcuts="ArrowUp ArrowDown"
											data-testid="agent-queue-drag-handle"
											@keydown="onQueueHandleKeydown($event, index)"
										>
											<template #icon>
												<N8nIcon icon="grip-vertical" size="large" aria-hidden="true" />
											</template>
										</N8nButton>
									</N8nTooltip>
									<div :class="$style.queuePreview" :title="item.message">
										<N8nInput
											v-if="queueEdit && queueEdit.item.id === item.id"
											v-model="queueEdit.text"
											type="textarea"
											size="small"
											:autosize="{ minRows: 1, maxRows: 6 }"
											:readonly="queueEdit.unavailable || queueEdit.saving"
											:aria-label="locale.baseText('agents.chat.queue.edit')"
											autofocus
											@keydown="onQueueEditKeydown"
										/>
										<span v-else-if="item.message">{{ item.message }}</span>
										<p
											v-if="queueEdit && queueEdit.item.id === item.id && queueEdit.unavailable"
											:class="$style.queueEditNotice"
											role="status"
										>
											{{
												locale.baseText(
													item.steeringExecutionId && queuedMessages.includes(item)
														? 'agents.chat.queue.editSteeringUnavailable'
														: 'agents.chat.queue.editUnavailable',
												)
											}}
										</p>
										<span
											v-else-if="item.steeringExecutionId"
											:class="$style.queueEditNotice"
											role="status"
										>
											{{ locale.baseText('agents.chat.queue.steering') }}
										</span>
										<span v-for="attachment in item.attachments" :key="attachment.id">{{
											attachment.fileName
										}}</span>
									</div>
									<div :class="$style.queueActions">
										<template v-if="queueEdit && queueEdit.item.id === item.id">
											<N8nTooltip
												:content="locale.baseText('agents.chat.queue.save')"
												:disabled="!canSaveQueueEdit"
												placement="top"
											>
												<N8nButton
													icon-only
													variant="ghost"
													size="xsmall"
													:disabled="!canSaveQueueEdit"
													:aria-label="locale.baseText('agents.chat.queue.save')"
													@click="saveQueueEdit"
												>
													<template #icon
														><N8nIcon icon="check" size="large" aria-hidden="true"
													/></template>
												</N8nButton>
											</N8nTooltip>
											<N8nTooltip
												:content="locale.baseText('agents.chat.queue.cancelEdit')"
												:disabled="queueEdit.saving"
												placement="top"
											>
												<N8nButton
													icon-only
													variant="ghost"
													size="xsmall"
													:disabled="queueEdit.saving"
													:aria-label="locale.baseText('agents.chat.queue.cancelEdit')"
													@click="queueEdit = undefined"
												>
													<template #icon
														><N8nIcon icon="x" size="large" aria-hidden="true"
													/></template>
												</N8nButton>
											</N8nTooltip>
										</template>
										<template v-else>
											<N8nTooltip
												:content="locale.baseText('agents.chat.queue.steerTooltip')"
												:disabled="!canSteer || !!queueEdit || isQueueItemBusy(item)"
												placement="top"
											>
												<N8nButton
													variant="ghost"
													size="xsmall"
													:disabled="!canSteer || !!queueEdit || isQueueItemBusy(item)"
													:aria-label="locale.baseText('agents.chat.queue.steer')"
													@click="steerQueuedMessage(item.id)"
												>
													<template #icon
														><N8nIcon icon="corner-down-right" size="large" aria-hidden="true"
													/></template>
													{{ locale.baseText('agents.chat.queue.steer') }}
												</N8nButton>
											</N8nTooltip>
											<N8nTooltip
												:content="locale.baseText('agents.chat.queue.edit')"
												:disabled="!!queueEdit || isQueueItemBusy(item)"
												placement="top"
											>
												<N8nButton
													icon-only
													variant="ghost"
													size="xsmall"
													:disabled="!!queueEdit || isQueueItemBusy(item)"
													:aria-label="locale.baseText('agents.chat.queue.edit')"
													@click="startQueueEdit(item)"
												>
													<template #icon
														><N8nIcon icon="pencil" size="large" aria-hidden="true"
													/></template>
												</N8nButton>
											</N8nTooltip>
											<N8nTooltip
												:content="locale.baseText('agents.chat.queue.remove')"
												:disabled="isQueueItemBusy(item)"
												placement="top"
											>
												<N8nButton
													icon-only
													variant="ghost"
													size="xsmall"
													:disabled="isQueueItemBusy(item)"
													:aria-label="locale.baseText('agents.chat.queue.remove')"
													@click="removeQueuedMessage(item.id)"
												>
													<template #icon>
														<N8nIcon icon="trash-2" size="large" aria-hidden="true" />
													</template>
												</N8nButton>
											</N8nTooltip>
										</template>
									</div>
								</li>
							</template>
						</Draggable>
						<N8nAiActivityStepButton
							v-if="displayedQueueRows.length > 2"
							:aria-expanded="queueExpanded"
							:aria-controls="queueListId"
							:disabled="!!queueOrder"
							full-width
							@click="queueExpanded = !queueExpanded"
						>
							{{
								queuedMessages.length > 2
									? locale.baseText('agents.chat.queue.title', {
											adjustToNumber: queuedMessages.length - 2,
											interpolate: { count: queuedMessages.length - 2 },
										})
									: locale.baseText('agents.chat.queue.edit')
							}}
							<template #suffix>
								<N8nAiActivityStepChevron :open="queueExpanded" direction="down" />
							</template>
						</N8nAiActivityStepButton>
					</div>
				</template>
				<template v-if="attachedFiles.length > 0 || $slots['composer-attachments']" #attachments>
					<div :class="$style.attachmentsStrip">
						<slot name="composer-attachments" />
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

.backgroundJobs,
.messageQueue {
	min-width: 0;

	--ai-activity-step--height: auto;
	--ai-activity-step--min-height: var(--height--xl);
	--ai-activity-step--padding: var(--spacing--xs) var(--spacing--sm);
	--ai-activity-step--color: var(--text-color);
}

.backgroundJobs {
	display: none;
	background: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	border-radius: var(--radius--xs);
}

.messageQueue {
	--text-color: light-dark(var(--color--neutral-600), var(--text-color--subtler));
	--icon-color: var(--color--neutral-400);

	margin: calc(-1 * var(--spacing--2xs)) calc(-1 * var(--spacing--2xs)) 0;
	background: var(--background--subtle);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	border-bottom: var(--border);
	border-bottom-color: var(--border-color--subtle);
}

.messageQueue :global(.n8n-icon) {
	color: var(--icon-color);
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

.messageQueue :global(button[aria-expanded]),
.queueList > li {
	font-size: var(--font-size--2xs);
}

.queueList {
	max-height: calc(20vh + 2 * var(--height--xl));
}

.queueList > li {
	align-items: center;
	padding-inline: var(--spacing--sm);
	color: var(--text-color);
	border-bottom: var(--border);
	border-bottom-color: var(--border-color--subtle);
	line-height: var(--line-height--md);
}

.messageQueue > .queueList {
	padding-block: var(--spacing--2xs);

	&:last-child > li:last-child {
		border-bottom: 0;
	}
}

.messageQueue > .queueList:not(:last-child) {
	padding-bottom: 0;
}

.queueActions {
	display: flex;
	align-self: center;
	flex-shrink: 0;
}

.queueDragHandle {
	flex-shrink: 0;
	cursor: grab;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}

	&:disabled {
		cursor: default;
	}
}

.queueGhost {
	opacity: 0.4;
}

.queueDragging {
	background: var(--background--subtle);
	box-shadow: var(--shadow--sm);
	cursor: grabbing;
}

.queueEditNotice {
	margin: var(--spacing--3xs) 0;
	font-size: var(--font-size--2xs);
}

.queuePreview {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
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
