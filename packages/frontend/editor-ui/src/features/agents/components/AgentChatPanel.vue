<script setup lang="ts">
import {
	computed,
	ref,
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
	N8nInput,
	N8nLink,
	N8nTooltip,
} from '@n8n/design-system';
import { createReusableTemplate, useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
	type AgentChatQueueItem,
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
import { findTailOpenInteractive } from '@/features/ai/shared/agentsChat/messageMappers';
import AgentChatEmptyState from './AgentChatEmptyState.vue';
import AgentChatMessageList from './AgentChatMessageList.vue';
import type {
	AgentContinueLoadedEvent,
	AgentSendToAssistantEvent,
	AgentJsonConfig,
} from '../types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { buildAgentConfigFingerprint } from '../composables/agentTelemetry.utils';
import { AGENT_SESSION_DETAIL_VIEW, TOOL_CALL_STATE } from '../constants';
import { TIME } from '@/app/constants/durations';
import { useAgentBackgroundJobs } from '../composables/useAgentBackgroundJobs';

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
		canEditAgent?: boolean;
		canSendToAssistant?: boolean;
		beforeSend?: () => Promise<void> | void;
		inputDraft?: string;
		backgroundJobsActive?: boolean;
	}>(),
	{
		visible: true,
		mode: 'panel',
		continueSessionId: undefined,
		newSession: false,
		canEditAgent: true,
		canSendToAssistant: false,
		beforeSend: undefined,
		inputDraft: undefined,
		backgroundJobsActive: false,
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
}>();

const locale = useI18n();
const agentTelemetry = useAgentTelemetry();
const toast = useToast();

const {
	messages,
	queuedMessages,
	removingQueueIds,
	removeQueuedMessage,
	updateQueuedMessage,
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
});

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
const [DefineQueueList, QueueList] = createReusableTemplate<{ items: AgentChatQueueItem[] }>({
	inheritAttrs: false,
});
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
	if (queueEdit.value && !items.some((item) => item.id === queueEdit.value?.item.id)) {
		queueEdit.value.unavailable = true;
	}
});
function startQueueEdit(item: AgentChatQueueItem) {
	queueEdit.value = { item, text: item.message, unavailable: false, saving: false };
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

const { jobs: backgroundJobs } = useAgentBackgroundJobs({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	threadId: () => props.continueSessionId,
	active: () => props.backgroundJobsActive,
	receivedJobs: () => messages.value.flatMap((message) => message.backgroundJobSignal?.tasks ?? []),
});
const backgroundRunningCount = computed(
	() => backgroundJobs.value.filter((job) => job.status === 'running').length,
);
const backgroundTitle = computed(() => {
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
const backgroundJobRows = computed(() =>
	backgroundJobs.value.map((job) => ({
		...job,
		label: locale.baseText(
			job.kind === 'workflow'
				? 'agents.chat.backgroundTasks.workflow'
				: 'agents.chat.backgroundTasks.subagent',
			{ interpolate: { title: job.title } },
		),
		indicator:
			backgroundJobStatuses.value[
				job.kind === 'workflow' && job.status === 'running' ? 'waiting' : job.status
			],
	})),
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
		backgroundRunningCount.value > 0 &&
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
	const end = backgroundRunningCount.value
		? now.value
		: Math.max(...backgroundJobs.value.map((job) => Date.parse(job.settledAt ?? '') || now.value));
	const seconds = Number.isFinite(start) ? Math.max(0, Math.floor((end - start) / TIME.SECOND)) : 0;
	const minutes = Math.floor(seconds / 60);
	const remainder = String(seconds % 60).padStart(2, '0');
	return minutes < 60
		? `${minutes}:${remainder}`
		: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`;
});

const attachedFiles = ref<File[]>([]);
const chatInput = useTemplateRef<InstanceType<typeof ChatInputBase>>('chatInput');
const backgroundJobCard = useTemplateRef<HTMLDivElement>('backgroundJobCard');
const showBackgroundJobs = computed(
	() => props.backgroundJobsActive && backgroundJobs.value.length > 0,
);

function focusInput(options?: FocusOptions) {
	chatInput.value?.focus(options);
}

watch(
	[
		showBackgroundJobs,
		() => props.projectId,
		() => props.agentId,
		() => props.continueSessionId,
		() => props.visible,
	],
	async ([shown, ...target], [wasShown, ...previousTarget], onCleanup) => {
		if (
			shown ||
			!wasShown ||
			!props.visible ||
			target.some((value, index) => value !== previousTarget[index]) ||
			!backgroundJobCard.value?.contains(document.activeElement)
		) {
			return;
		}

		let cancelled = false;
		onCleanup(() => {
			cancelled = true;
		});
		// Check focus before the card disappears, then wait for the composer to update.
		await nextTick();
		if (
			cancelled ||
			disposed ||
			!props.visible ||
			showBackgroundJobs.value ||
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
const isSubmissionBlocked = computed(
	() => isPreparingToSend.value || isSubmitting.value || isLoadingHistory.value,
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

		const sending = sendMessage(text, files.length > 0 ? files : undefined, () => {
			if (!isCurrentTarget()) return;
			agentTelemetry.trackSubmittedMessage({
				agentId: props.agentId,
				status: props.agentStatus,
				agentConfig: fingerprint,
			});
			if (inputText.value.trim() === text) inputText.value = '';
			attachedFiles.value = attachedFiles.value.filter((file) => !files.includes(file));
			consumeQueuedExternalMessage(text);
		});
		isPreparingToSend.value = false;
		const result = await sending;
		if (result === 'busy') return 'busy';
		return 'sent';
	} finally {
		isPreparingToSend.value = false;
	}
}

function sendMessageFromOutside(message: string) {
	queuedExternalMessage = message;
	inputText.value = message;
	void submitQueuedExternalMessage();
}

async function submitQueuedExternalMessage() {
	const message = queuedExternalMessage;
	if (!message || submittingQueuedExternalMessage || isSubmissionBlocked.value) return;

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

defineExpose({ focusInput, getConversationMarkdown, sendMessageFromOutside });

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

		<AgentChatEmptyState v-if="messages.length === 0 && !isStreaming" :agent-config="agentConfig" />
		<AgentChatMessageList
			v-else
			:messages="messages"
			:messaging-state="messagingState"
			:project-id="projectId"
			:agent-id="agentId"
			:session-id="continueSessionId"
			:can-send-to-assistant="canSendToAssistant"
			@resume="resume"
			@send-to-assistant="emit('send-to-assistant', $event)"
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
							:icon="backgroundRunningCount ? 'loader-circle' : 'circle'"
							:spin="backgroundRunningCount > 0"
							size="small"
							:class="{ [$style.jobSpinner]: backgroundRunningCount > 0 }"
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
								<span>{{ job.label }}</span>
							</li>
						</ul>
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
					</div>
				</N8nAiActivityStepGroup>
			</div>
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
				:disabled="isPreparingToSend"
				data-testid="chat-input"
				@submit="onSubmit"
				@stop="stopGenerating"
				@files-selected="handleFilesSelected"
			>
				<template v-if="queueRows.length" #header>
					<div :class="$style.messageQueue" data-testid="agent-message-queue">
						<DefineQueueList v-slot="{ items }">
							<ul :class="[$style.backgroundJobList, $style.queueList]">
								<li v-for="item in items" :key="item.id" data-testid="agent-queued-message">
									<div :class="$style.queuePreview" :title="item.message">
										<N8nInput
											v-if="queueEdit?.item.id === item.id"
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
											v-if="queueEdit?.item.id === item.id && queueEdit.unavailable"
											:class="$style.queueEditNotice"
											role="status"
										>
											{{ locale.baseText('agents.chat.queue.editUnavailable') }}
										</p>
										<span v-for="attachment in item.attachments" :key="attachment.id">{{
											attachment.fileName
										}}</span>
									</div>
									<div :class="$style.queueActions">
										<template v-if="queueEdit?.item.id === item.id">
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
												:content="locale.baseText('agents.chat.queue.edit')"
												:disabled="!!queueEdit || removingQueueIds.has(item.id)"
												placement="top"
											>
												<N8nButton
													icon-only
													variant="ghost"
													size="xsmall"
													:disabled="!!queueEdit || removingQueueIds.has(item.id)"
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
												:disabled="removingQueueIds.has(item.id)"
												placement="top"
											>
												<N8nButton
													icon-only
													variant="ghost"
													size="xsmall"
													:disabled="removingQueueIds.has(item.id)"
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
							</ul>
						</DefineQueueList>
						<QueueList :items="queueRows.slice(0, 2)" />
						<N8nAiActivityStepGroup
							v-if="queueRows.length > 2"
							:key="continueSessionId"
							:label="
								queuedMessages.length > 2
									? locale.baseText('agents.chat.queue.title', {
											adjustToNumber: queuedMessages.length - 2,
											interpolate: { count: queuedMessages.length - 2 },
										})
									: locale.baseText('agents.chat.queue.edit')
							"
							full-width
							content-position="above"
						>
							<QueueList :items="queueRows.slice(2)" />
						</N8nAiActivityStepGroup>
					</div>
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
	background: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	border-radius: var(--radius--xs);
}

.messageQueue {
	--text-color: var(--text-color--subtle);

	margin: calc(-1 * var(--spacing--2xs)) calc(-1 * var(--spacing--2xs)) 0;
	background: var(--background--subtle);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	border-bottom: var(--border);
}

.messageQueue :global(.n8n-icon) {
	color: light-dark(var(--color--neutral-600), var(--color--neutral-400));
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

.backgroundJobList {
	list-style: none;
	margin: 0;
	padding: 0;
	width: 100%;
	max-height: 20vh;
	overflow-y: auto;

	li {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing--2xs);
		padding-block: var(--spacing--3xs);
		font-size: var(--font-size--sm);
		color: var(--text-color--subtle);
		overflow-wrap: anywhere;
		line-height: var(--line-height--lg);
	}
}

.messageQueue :global(button[aria-expanded]),
.queueList > li {
	font-size: var(--font-size--2xs);
}

.queueList > li {
	align-items: center;
	padding-inline: var(--spacing--sm);
	color: var(--text-color);
	border-bottom: var(--border);
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
