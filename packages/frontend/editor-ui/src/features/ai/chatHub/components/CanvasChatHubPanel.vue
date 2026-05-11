<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nScrollArea, N8nText, N8nTooltip } from '@n8n/design-system';
import { useClipboard } from '@/app/composables/useClipboard';
import { useToast } from '@/app/composables/useToast';
import type {
	AgentIconOrEmoji,
	ChatHubSendMessageRequest,
	ChatMessageId,
	ChatModelDto,
	ChatSessionId,
} from '@n8n/api-types';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { flattenModel } from '@/features/ai/chatHub/chat.utils';
import { useChatStore } from '../chat.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useChatSession } from '../composables/useChatSession';
import { useFileDrop } from '../composables/useFileDrop';
import ChatMessage from './ChatMessage.vue';
import ChatPrompt from './ChatPrompt.vue';
import ChatGreetings from './ChatGreetings.vue';
import ChatAgentAvatar from './ChatAgentAvatar.vue';
import CanvasChatSessionDropdown from './CanvasChatSessionDropdown.vue';
import type { ChatMessage as ChatMessageType } from '../chat.types';

const props = withDefaults(
	defineProps<{
		floating?: boolean;
	}>(),
	{ floating: false },
);

const emit = defineEmits<{
	close: [];
	'pop-out': [];
}>();

const i18n = useI18n();
const chatStore = useChatStore();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const chatHubPanelStore = useChatHubPanelStore();
const telemetry = useTelemetry();
const clipboard = useClipboard();
const toast = useToast();

const canPopOut = computed(() => window.parent === window);
const isPoppedOut = computed(() => chatHubPanelStore.isPoppedOut);

// Session management - one session per panel instance, keyed to the workflow
const sessionId = ref<ChatSessionId>(uuidv4());
const editingMessageId = ref<ChatMessageId>();

const inputRef = useTemplateRef('inputRef');
const scrollableRef = useTemplateRef('scrollable');

// Resolve agent name from Chat Trigger node parameters, falling back to workflow name
const allNodes = computed(() => workflowDocumentStore?.value?.allNodes ?? []);
const chatTriggerNode = computed(() =>
	allNodes.value.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE),
);

const agentDisplayName = computed(() => {
	const triggerName = chatTriggerNode.value?.parameters?.agentName;
	if (typeof triggerName === 'string' && triggerName.trim()) return triggerName.trim();
	return workflowsStore.workflowName || 'Workflow';
});

const workflowAgent = computed<ChatModelDto | null>(() => {
	const workflowId = workflowsStore.workflowId;
	if (!workflowId) return null;

	const params = chatTriggerNode.value?.parameters;

	// Read agent icon from the Chat Trigger node
	const agentIcon = params?.agentIcon as AgentIconOrEmoji | undefined;

	const agent = chatStore.getAgent(
		{ provider: 'n8n', workflowId },
		{ name: agentDisplayName.value, icon: agentIcon ?? null },
	);

	const options = params?.options as Record<string, unknown> | undefined;

	// Read agent description from the Chat Trigger node
	const agentDescription = params?.agentDescription;
	const description =
		typeof agentDescription === 'string' && agentDescription.trim()
			? agentDescription.trim()
			: null;

	// Read suggested prompts from the Chat Trigger node
	const suggestedPromptsRaw = params?.suggestedPrompts as
		| { prompts?: Array<{ text?: string; icon?: AgentIconOrEmoji }> }
		| undefined;
	const suggestedPrompts = suggestedPromptsRaw?.prompts
		?.filter((p) => typeof p.text === 'string' && p.text.trim().length > 0)
		.map((p) => ({ text: p.text as string, ...(p.icon ? { icon: p.icon } : {}) }));

	return {
		...agent,
		...(description !== null ? { description } : {}),
		...(suggestedPrompts?.length ? { suggestedPrompts } : {}),
		...(options
			? {
					metadata: {
						...agent.metadata,
						allowFileUploads: options.allowFileUploads === true,
						allowedFilesMimeTypes:
							typeof options.allowedFilesMimeTypes === 'string'
								? options.allowedFilesMimeTypes
								: agent.metadata.allowedFilesMimeTypes,
					},
				}
			: {}),
	};
});

const {
	chatMessages,
	isResponding,
	isNewSession,
	messagingState,
	arrivedState,
	scrollToBottom,
	loadSession,
} = useChatSession({
	sessionId,
	scrollableRef,
});

// File drop support
const canAcceptFiles = computed(() => workflowAgent.value?.metadata.allowFileUploads ?? false);

function onFilesDropped(files: File[]) {
	inputRef.value?.addAttachments(files);
}

const fileDrop = useFileDrop(canAcceptFiles, onFilesDropped);

const sessionIdText = computed(() =>
	i18n.baseText('chat.window.session.id', {
		interpolate: { id: `${sessionId.value.slice(0, 5)}...` },
	}),
);

async function copySessionId() {
	await clipboard.copy(sessionId.value);
	toast.showMessage({
		title: i18n.baseText('generic.copiedToClipboard'),
		message: '',
		type: 'success',
	});
}

function handleNewSession() {
	telemetry.track('User clicked new chat button', { source: 'canvas' });
	sessionId.value = uuidv4();
}

async function handleSelectSession(selectedSessionId: ChatSessionId) {
	sessionId.value = selectedSessionId;
	try {
		await loadSession(selectedSessionId);
	} catch {
		sessionId.value = uuidv4();
	}
}

// Reset session when workflow changes
watch(
	() => workflowsStore.workflowId,
	() => {
		sessionId.value = uuidv4();
	},
);

async function onSubmit(message: string, attachments: File[]) {
	if (!message.trim() || isResponding.value || !workflowAgent.value) return;

	await chatStore.sendMessage(
		sessionId.value,
		message,
		workflowAgent.value,
		{} as ChatHubSendMessageRequest['credentials'],
		attachments,
	);

	inputRef.value?.reset();
}

async function onStop() {
	await chatStore.stopStreamingMessage(sessionId.value);
}

async function handleRegenerateMessage(message: ChatMessageType) {
	if (isResponding.value || message.type !== 'ai' || !workflowAgent.value) return;

	editingMessageId.value = undefined;

	await chatStore.regenerateMessage(
		sessionId.value,
		message.id,
		workflowAgent.value,
		{} as ChatHubSendMessageRequest['credentials'],
	);
}

function handleStartEditMessage(messageId: string) {
	editingMessageId.value = messageId;
}

function handleCancelEditMessage() {
	editingMessageId.value = undefined;
}

async function handleEditMessage(
	content: string,
	keptAttachmentIndices: number[],
	newFiles: File[],
) {
	if (!editingMessageId.value || isResponding.value || !workflowAgent.value) return;

	await chatStore.editMessage(
		sessionId.value,
		editingMessageId.value,
		content,
		workflowAgent.value,
		{} as ChatHubSendMessageRequest['credentials'],
		keptAttachmentIndices,
		newFiles,
	);

	editingMessageId.value = undefined;
}

function handleSelectPrompt(prompt: string) {
	if (workflowAgent.value) {
		telemetry.track('User clicked chat hub suggested prompt', {
			...flattenModel(workflowAgent.value.model),
			source: 'canvas',
		});
	}
	inputRef.value?.setText(prompt);
	inputRef.value?.focus();
}

function focusInput() {
	inputRef.value?.focus();
}

defineExpose({
	focusInput,
	sessionId,
	sessionIdText,
	handleNewSession,
	handleSelectSession,
	copySessionId,
});
</script>

<template>
	<div
		:class="[
			$style.panel,
			{
				[$style.poppedOut]: isPoppedOut,
				[$style.floating]: props.floating,
				[$style.isDraggingFile]: fileDrop.isDragging.value,
			},
		]"
		@dragenter="fileDrop.handleDragEnter"
		@dragleave="fileDrop.handleDragLeave"
		@dragover="fileDrop.handleDragOver"
		@drop="fileDrop.handleDrop"
		@paste="fileDrop.handlePaste"
	>
		<div v-if="fileDrop.isDragging.value" :class="$style.dropOverlay">
			<N8nText size="large" color="text-dark">{{
				i18n.baseText('chatHub.chat.dropOverlay')
			}}</N8nText>
		</div>

		<div v-if="!props.floating" :class="$style.header">
			<div :class="$style.headerTitle">
				<ChatAgentAvatar :agent="workflowAgent" size="sm" />
				<N8nText size="medium" :bold="true" :class="$style.headerTitleText">
					{{ agentDisplayName }}
				</N8nText>
				<span :class="$style.previewBadge">
					{{ i18n.baseText('chatHub.canvas.previewBadge') }}
				</span>
			</div>
			<div :class="$style.headerActions">
				<CanvasChatSessionDropdown
					:session-id="sessionId"
					:session-title="sessionIdText"
					:workflow-id="workflowsStore.workflowId"
					@select-session="handleSelectSession"
				/>
				<N8nTooltip placement="bottom">
					<template #content>
						{{ sessionId }}
						<br />
						{{ i18n.baseText('chat.window.session.id.copy') }}
					</template>
					<N8nIconButton
						icon="copy"
						variant="ghost"
						size="small"
						data-test-id="canvas-chat-session-id"
						@click="copySessionId"
					/>
				</N8nTooltip>
				<N8nTooltip placement="bottom">
					<template #content>
						{{ i18n.baseText('chat.window.session.resetSession') }}
					</template>
					<N8nIconButton
						icon="undo-2"
						variant="ghost"
						size="small"
						data-test-id="canvas-chat-hub-new-session"
						@click="handleNewSession"
					/>
				</N8nTooltip>
				<N8nTooltip v-if="canPopOut && !isPoppedOut" placement="bottom">
					<template #content>
						{{ i18n.baseText('runData.panel.actions.popOut') }}
					</template>
					<N8nIconButton
						icon="external-link"
						variant="ghost"
						size="small"
						data-test-id="canvas-chat-hub-pop-out"
						@click="emit('pop-out')"
					/>
				</N8nTooltip>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					data-test-id="canvas-chat-hub-close"
					@click="emit('close')"
				/>
			</div>
		</div>

		<N8nScrollArea
			type="scroll"
			:enable-vertical-scroll="true"
			:enable-horizontal-scroll="false"
			as-child
			:class="$style.scrollArea"
		>
			<div
				ref="scrollable"
				:class="{ [$style.scrollable]: true, [$style.isNewSession]: isNewSession }"
			>
				<div v-if="isNewSession" :class="$style.greetingsWrapper">
					<ChatGreetings :selected-agent="workflowAgent" @select-prompt="handleSelectPrompt" />
				</div>

				<div v-else role="log" aria-live="polite" :class="$style.messageList">
					<ChatMessage
						v-for="message in chatMessages"
						:key="message.id"
						:message="message"
						:compact="false"
						:is-editing="editingMessageId === message.id"
						:is-edit-submitting="chatStore.streaming?.revisionOfMessageId === message.id"
						:has-session-streaming="isResponding"
						:cached-agent-display-name="workflowAgent?.name ?? null"
						:cached-agent-icon="workflowAgent?.icon ?? null"
						:accepted-mime-types="workflowAgent?.metadata.allowedFilesMimeTypes ?? ''"
						@start-edit="handleStartEditMessage(message.id)"
						@cancel-edit="handleCancelEditMessage"
						@update="handleEditMessage"
						@regenerate="handleRegenerateMessage"
					/>
				</div>

				<div :class="$style.promptContainer">
					<N8nIconButton
						v-if="!arrivedState.bottom && !isNewSession"
						variant="subtle"
						icon="arrow-down"
						:class="$style.scrollToBottomButton"
						:title="i18n.baseText('chatHub.chat.scrollToBottom')"
						@click="scrollToBottom(true)"
					/>

					<ChatPrompt
						ref="inputRef"
						:class="$style.prompt"
						:selected-model="workflowAgent"
						:checked-tool-ids="[]"
						:messaging-state="messagingState"
						:is-tools-selectable="false"
						:is-new-session="isNewSession"
						:show-credits-claimed-callout="false"
						:show-dynamic-credentials-missing-callout="false"
						:compact="props.floating"
						:accepted-mime-types="workflowAgent?.metadata.allowedFilesMimeTypes ?? ''"
						:placeholder="i18n.baseText('chatHub.chat.prompt.placeholder.sendPreview')"
						ai-credits-quota="0"
						@submit="onSubmit"
						@stop="onStop"
					/>
				</div>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	background-color: var(--color--background--light-2);
	border-left: var(--border);
	position: relative;

	&.poppedOut {
		border-left: none;
	}

	&.floating {
		border-left: none;
		background-color: var(--color--background--light-3);
	}
}

.header {
	height: 65px; // same as header height in editor
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.headerTitleText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: var(--spacing--xs);
	flex-shrink: 0;
}

.previewBadge {
	flex-shrink: 0;
	display: inline-block;
	color: var(--color--secondary);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	background-color: var(--color--secondary--tint-2);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: 16px;
}

.scrollArea {
	flex-grow: 1;
	flex-shrink: 1;
}

.scrollable {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: start;
	gap: var(--spacing--xl);

	&.isNewSession {
		gap: 0;

		.promptContainer {
			position: relative;
		}

		.prompt {
			padding-inline: 0;
		}
	}
}

.greetingsWrapper {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.messageList {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding-top: var(--spacing--xl);
	padding-bottom: 200px;
	padding-inline: 64px;
}

.promptContainer {
	display: flex;
	justify-content: center;
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	padding-block: var(--spacing--md);
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
}

.prompt {
	width: 100%;
	padding-inline: var(--spacing--lg);
}

.scrollToBottomButton {
	position: absolute;
	bottom: 100%;
	left: auto;
	box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
	border-radius: 50%;
}

.isDraggingFile {
	border-color: var(--color--secondary);
}

.dropOverlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: color-mix(in srgb, var(--color--background--light-2) 95%, transparent);
	pointer-events: none;
}

.floating {
	.scrollable {
		padding-inline: var(--spacing--sm);
	}

	.promptContainer {
		padding-block: var(--spacing--sm);
		background: linear-gradient(transparent 0%, var(--color--background--light-3) 30%);
	}

	.prompt {
		padding-inline: var(--spacing--sm);
	}

	.dropOverlay {
		background-color: color-mix(in srgb, var(--color--background--light-3) 95%, transparent);
	}
}
</style>
