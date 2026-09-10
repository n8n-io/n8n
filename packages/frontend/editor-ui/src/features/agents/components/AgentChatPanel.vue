<script setup lang="ts">
import { computed, ref, toRef, watch, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import {
	N8nAiActivityStepGroup,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nLink,
	N8nSendStopButton,
} from '@n8n/design-system';
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
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
	AgentFixWithAssistantEvent,
	AgentJsonConfig,
} from '../types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { buildAgentConfigFingerprint } from '../composables/agentTelemetry.utils';
import { AGENT_SESSION_DETAIL_VIEW, TOOL_CALL_STATE } from '../constants';
import { TIME } from '@/app/constants/durations';
import { useAgentBackgroundTasks } from '../composables/useAgentBackgroundTasks';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		projectId: string;
		agentId: string;
		mode?: 'panel' | 'inline';
		continueSessionId?: string;
		agentConfig: AgentJsonConfig | null;
		agentStatus: 'draft' | 'production';
		connectedTriggers: string[];
		canEditAgent?: boolean;
		canSendToAssistant?: boolean;
		beforeSend?: () => Promise<void> | void;
		inputDraft?: string;
		backgroundTasksActive?: boolean;
	}>(),
	{
		visible: true,
		mode: 'panel',
		continueSessionId: undefined,
		canEditAgent: true,
		canSendToAssistant: false,
		beforeSend: undefined,
		inputDraft: undefined,
		backgroundTasksActive: false,
	},
);

const emit = defineEmits<{
	'update:streaming': [streaming: boolean];
	'update:inputDraft': [value: string];
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'initial-consumed': [];
	back: [];
	'open-build': [];
	'send-to-assistant': [event?: AgentFixWithAssistantEvent];
}>();

const locale = useI18n();
const agentTelemetry = useAgentTelemetry();
const toast = useToast();

const { tasks: backgroundTasks } = useAgentBackgroundTasks({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	threadId: () => props.continueSessionId,
	active: () => props.backgroundTasksActive,
});
const backgroundTitle = computed(() => {
	const count = backgroundTasks.value.filter((task) => task.status === 'running').length;
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
const backgroundTaskStatuses = computed(() => ({
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
		icon: 'circle-minus',
		label: locale.baseText('agents.chat.backgroundTasks.status.cancelled'),
	},
	waiting: {
		icon: 'circle',
		label: locale.baseText('agents.chat.backgroundTasks.status.waiting'),
	},
}));
const backgroundTaskRows = computed(() =>
	backgroundTasks.value.map((task) => ({
		...task,
		label: locale.baseText(
			task.kind === 'workflow'
				? 'agents.chat.backgroundTasks.workflow'
				: 'agents.chat.backgroundTasks.subagent',
			{ interpolate: { title: task.title } },
		),
		indicator:
			backgroundTaskStatuses.value[
				task.kind === 'workflow' && task.status === 'running' ? 'waiting' : task.status
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
		props.backgroundTasksActive &&
		backgroundTasks.value.length > 0 &&
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
	const startedAt = backgroundTasks.value[0]?.startedAt;
	const start = startedAt ? Date.parse(startedAt) : now.value;
	const seconds = Number.isFinite(start)
		? Math.max(0, Math.floor((now.value - start) / TIME.SECOND))
		: 0;
	const minutes = Math.floor(seconds / 60);
	const remainder = String(seconds % 60).padStart(2, '0');
	return minutes < 60
		? `${minutes}:${remainder}`
		: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`;
});

const attachedFiles = ref<File[]>([]);
const chatInput = useTemplateRef<InstanceType<typeof ChatInputBase>>('chatInput');

function focusInput(options?: FocusOptions) {
	chatInput.value?.focus(options);
}

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
const isPreparingToSend = ref(false);
let disposed = false;

const {
	messages,
	isStreaming,
	isCancelling,
	messagingState,
	fatalError,
	warnings,
	loadHistory,
	sendMessage,
	stopGenerating,
	resume,
	cancelAndSteer,
	dismissFatalError,
	dismissWarning,
} = useAgentChatStream({
	projectId: toRef(props, 'projectId'),
	agentId: toRef(props, 'agentId'),
	continueSessionId: toRef(props, 'continueSessionId'),
	onHistoryLoaded: (count) => {
		if (props.continueSessionId) {
			emit('continue-loaded', { sessionId: props.continueSessionId, count });
		}
	},
});

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
/**
 * A parked run owns the conversation: sending now would start a second run
 * whose context has the pending tool call stripped out, so the model would
 * re-invoke the same tool. Only an open question is exempt — answering or
 * steering it resumes the same run. Stop stays available either way.
 */
const inputBlockedBySuspension = computed(
	() =>
		hasOpenApproval.value ||
		hasOpenWaitCard.value ||
		(hasOpenSuspension.value && !hasOpenInteractiveQuestion.value),
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
const showSuspensionStopAlongsideSend = computed(
	() => hasOpenInteractiveQuestion.value && !isStreaming.value && !isCancelling.value,
);
const showStopAsPrimaryAction = computed(
	() =>
		isStreaming.value ||
		isCancelling.value ||
		inputBlockedBySuspension.value ||
		(!isStreaming.value && hasInFlightToolCalls.value),
);

const chatPlaceholder = computed(() => {
	if (hasOpenApproval.value) {
		return locale.baseText('agents.chat.approval.inputPlaceholder');
	}
	if (inputBlockedBySuspension.value) {
		return locale.baseText('agents.chat.waiting.inputPlaceholder');
	}
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

async function onSubmit() {
	const text = inputText.value.trim();
	const files = attachedFiles.value;
	if (
		(!text && files.length === 0) ||
		isStreaming.value ||
		isCancelling.value ||
		isPreparingToSend.value ||
		inputBlockedBySuspension.value
	) {
		return;
	}

	if (hasOpenInteractiveQuestion.value) {
		if (!text) return;
		inputText.value = '';
		await cancelAndSteer(text);
		return;
	}

	isPreparingToSend.value = true;
	try {
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
		try {
			await props.beforeSend?.();
		} catch {
			return;
		}
		if (!isCurrentTarget()) return;

		const fingerprint = await buildAgentConfigFingerprint(
			props.agentConfig,
			props.connectedTriggers,
		);
		if (!isCurrentTarget()) return;

		inputText.value = '';
		attachedFiles.value = [];
		agentTelemetry.trackSubmittedMessage({
			agentId: props.agentId,
			status: props.agentStatus,
			agentConfig: fingerprint,
		});

		if (files.length > 0) {
			await sendMessage(text, files);
		} else {
			await sendMessage(text);
		}
	} finally {
		isPreparingToSend.value = false;
	}
}

function sendMessageFromOutside(message: string) {
	if (inputBlockedBySuspension.value) return;
	inputText.value = message;
	void onSubmit();
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
	if (isStreaming.value) void stopGenerating();
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
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="xsmall"
					:aria-label="locale.baseText('agents.chat.misconfigured.dismiss')"
					:title="locale.baseText('agents.chat.misconfigured.dismiss')"
					@click="dismissFatalError"
				/>
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
					<N8nIconButton
						icon="x"
						variant="ghost"
						size="xsmall"
						:aria-label="locale.baseText('agents.chat.warning.dismiss')"
						:title="locale.baseText('agents.chat.warning.dismiss')"
						@click="dismissWarning(index)"
					/>
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
			<ChatInputBase
				ref="chatInput"
				v-model="inputText"
				:placeholder="chatPlaceholder"
				:is-streaming="showStopAsPrimaryAction"
				show-voice
				:show-attach="showAttach"
				:accepted-mime-types="acceptedMimeTypes"
				:can-submit="
					!inputBlockedBySuspension &&
					!isStreaming &&
					!isCancelling &&
					!isPreparingToSend &&
					(inputText.trim().length > 0 || attachedFiles.length > 0)
				"
				:disabled="
					inputBlockedBySuspension ||
					isCancelling ||
					isPreparingToSend ||
					(isStreaming && messagingState !== 'receiving')
				"
				data-testid="chat-input"
				@submit="onSubmit"
				@stop="stopGenerating"
				@files-selected="handleFilesSelected"
			>
				<template v-if="backgroundTasksActive && backgroundTasks.length" #header>
					<div :class="$style.backgroundTasks" data-testid="agent-background-tasks">
						<N8nAiActivityStepGroup
							:key="continueSessionId"
							:label="backgroundTitle"
							full-width
							content-position="above"
						>
							<template #prefix>
								<N8nIcon
									icon="loader-circle"
									spin
									size="small"
									:class="$style.taskSpinner"
									aria-hidden="true"
								/>
							</template>
							<template #header-trailing>
								<span
									:class="$style.taskTimer"
									aria-live="off"
									data-testid="agent-background-tasks-timer"
									>{{ backgroundElapsed }}</span
								>
							</template>
							<div :class="$style.backgroundTaskDetails">
								<ul :class="$style.backgroundTaskList">
									<li v-for="task in backgroundTaskRows" :key="task.id">
										<span
											role="img"
											:aria-label="task.indicator.label"
											:title="task.indicator.label"
											:class="[
												$style.taskStatus,
												{ [$style.taskWaiting]: task.indicator.icon === 'circle' },
											]"
											:data-status="task.status"
										>
											<N8nIcon
												:icon="task.indicator.icon"
												:spin="task.indicator.icon === 'loader-circle'"
												size="small"
												:class="{ [$style.taskSpinner]: task.indicator.icon === 'loader-circle' }"
											/>
										</span>
										<span>{{ task.label }}</span>
									</li>
								</ul>
								<N8nLink
									v-if="continueSessionId"
									:to="backgroundTraceRoute"
									theme="text"
									size="small"
									underline
									data-testid="agent-background-tasks-trace"
								>
									<span :class="$style.taskTraceLabel">
										<N8nIcon icon="arrow-right" size="small" aria-hidden="true" />
										{{ locale.baseText('agents.chat.backgroundTasks.viewTrace') }}
									</span>
								</N8nLink>
							</div>
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
					<N8nSendStopButton
						v-if="showSuspensionStopAlongsideSend"
						streaming
						stop-button-test-id="agent-chat-suspended-stop-button"
						@stop="stopGenerating"
					/>
				</template>
			</ChatInputBase>
		</div>
	</aside>
</template>

<style lang="scss" module>
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

.backgroundTasks {
	margin: calc(-1 * var(--spacing--2xs)) calc(-1 * var(--spacing--2xs)) 0;
	border-bottom: var(--border);
	min-width: 0;

	button {
		height: auto;
		min-height: var(--height--xl);
		padding: var(--spacing--xs) var(--spacing--sm);
		color: var(--text-color);
	}
}

.backgroundTaskDetails {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
	border-bottom-style: dashed;
}

.backgroundTaskList {
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

.taskStatus {
	display: inline-flex;
	flex-shrink: 0;
	line-height: inherit;
	color: var(--text-color--subtler);

	&[data-status='completed'] {
		color: var(--icon-color--success);
	}

	&[data-status='failed'] {
		color: var(--icon-color--danger);
	}
}

.taskWaiting circle {
	fill: currentColor;
}

.taskTraceLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.taskSpinner {
	flex-shrink: 0;
	color: var(--color--primary);
	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

.taskTimer {
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
