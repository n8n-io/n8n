<script setup lang="ts">
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
import type { AgentIconOrEmoji, ChatMessageId, ChatModelDto } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nInput } from '@n8n/design-system';
import { useSpeechSynthesis } from '@vueuse/core';
import { computed, onBeforeMount, ref, useCssModule, useTemplateRef, watch } from 'vue';
import VueMarkdown from 'vue-markdown-render';
import type { ChatMessage } from '../chat.types';
import ChatMessageActions from './ChatMessageActions.vue';
import { unflattenModel } from '@/features/ai/chatHub/chat.utils';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { buildChatAttachmentUrl } from '@/features/ai/chatHub/chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useI18n } from '@n8n/i18n';
import CopyButton from '@/features/ai/chatHub/components/CopyButton.vue';

const {
	message,
	compact,
	isEditing,
	isStreaming,
	minHeight,
	cachedAgentDisplayName,
	cachedAgentIcon,
	containerWidth,
} = defineProps<{
	message: ChatMessage;
	compact: boolean;
	isEditing: boolean;
	isStreaming: boolean;
	cachedAgentDisplayName: string | null;
	cachedAgentIcon: AgentIconOrEmoji | null;
	/**
	 * minHeight allows scrolling agent's response to the top while it is being generated
	 */
	minHeight?: number;
	containerWidth: number;
}>();

const emit = defineEmits<{
	startEdit: [];
	cancelEdit: [];
	update: [message: ChatMessage];
	regenerate: [message: ChatMessage];
	switchAlternative: [messageId: ChatMessageId];
}>();

const chatStore = useChatStore();
const rootStore = useRootStore();
const { isCtrlKeyPressed } = useDeviceSupport();
const i18n = useI18n();
const styles = useCssModule();

const editedText = ref('');
const hoveredCodeBlockActions = ref<HTMLElement | null>(null);
const textareaRef = useTemplateRef('textarea');
const markdown = useChatHubMarkdownOptions(styles.codeBlockActions, styles.tableContainer);
const messageContent = computed(() => message.content);

const speech = useSpeechSynthesis(messageContent, {
	pitch: 1,
	rate: 1,
	volume: 1,
});

const agent = computed<ChatModelDto | null>(() => {
	const model = unflattenModel(message);

	if (!model) {
		return null;
	}

	return chatStore.getAgent(model, { name: cachedAgentDisplayName, icon: cachedAgentIcon });
});

const attachments = computed(() =>
	message.attachments.map(({ fileName, mimeType }, index) => ({
		file: new File([], fileName ?? 'file', { type: mimeType }), // Placeholder file for display
		downloadUrl: buildChatAttachmentUrl(
			rootStore.restApiContext,
			message.sessionId,
			message.id,
			index,
		),
	})),
);

const hideMessage = computed(() => {
	return message.status === 'success' && message.content === '';
});

const hoveredCodeBlockContent = computed(() => {
	const idx = hoveredCodeBlockActions.value?.getAttribute('data-markdown-token-idx');

	return idx ? markdown.codeBlockContents.value?.get(idx) : undefined;
});

function handleEdit() {
	emit('startEdit');
}

function handleCancelEdit() {
	emit('cancelEdit');
}

function handleConfirmEdit() {
	if (!editedText.value.trim()) {
		return;
	}

	emit('update', { ...message, content: editedText.value });
}

function handleKeydownTextarea(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		emit('cancelEdit');
		return;
	}

	const trimmed = editedText.value.trim();

	if (e.key === 'Enter' && isCtrlKeyPressed(e) && !e.isComposing && trimmed) {
		e.preventDefault();
		handleConfirmEdit();
	}
}

function handleRegenerate() {
	emit('regenerate', message);
}

function handleReadAloud() {
	if (speech.isSupported.value) {
		if (speech.isPlaying.value) {
			speech.stop();
		} else {
			speech.speak();
		}
	}
}

function handleSwitchAlternative(messageId: ChatMessageId) {
	emit('switchAlternative', messageId);
}

function handleMouseMove(e: MouseEvent | FocusEvent) {
	const container =
		e.target instanceof HTMLElement || e.target instanceof SVGElement
			? e.target.closest('pre')?.querySelector(`.${styles.codeBlockActions}`)
			: null;

	hoveredCodeBlockActions.value = container instanceof HTMLElement ? container : null;
}

function handleMouseLeave() {
	hoveredCodeBlockActions.value = null;
}

// Watch for isEditing prop changes to initialize edit mode
watch(
	() => isEditing,
	(editing) => {
		editedText.value = editing ? message.content : '';
	},
	{ immediate: true },
);

watch(
	textareaRef,
	async (textarea) => {
		if (textarea) {
			await new Promise((r) => setTimeout(r, 0));
			textarea.focus();
			textarea.$el.scrollIntoView({ block: 'nearest' });
		}
	},
	{ immediate: true, flush: 'post' },
);

onBeforeMount(() => {
	speech.stop();
});
</script>

<template>
	<div
		v-if="!hideMessage"
		:class="[
			$style.message,
			message.type === 'human' ? $style.user : $style.assistant,
			{
				[$style.compact]: compact,
			},
		]"
		:style="{
			minHeight: minHeight ? `${minHeight}px` : undefined,
			'--container--width': `${containerWidth}px`,
		}"
		:data-message-id="message.id"
	>
		<div :class="$style.avatar">
			<N8nIcon v-if="message.type === 'human'" icon="user" width="20" height="20" />
			<ChatAgentAvatar v-else-if="agent" :agent="agent" size="md" tooltip />
			<N8nIcon v-else icon="sparkles" width="20" height="20" />
		</div>
		<div :class="$style.content">
			<div v-if="isEditing" :class="$style.editContainer">
				<div v-if="attachments.length > 0" :class="$style.attachments">
					<ChatFile
						v-for="(attachment, index) in attachments"
						:key="index"
						:file="attachment.file"
						:is-removable="false"
						:href="attachment.downloadUrl"
					/>
				</div>
				<N8nInput
					ref="textarea"
					v-model="editedText"
					type="textarea"
					:autosize="{ minRows: 3, maxRows: 20 }"
					:class="$style.textarea"
					@keydown="handleKeydownTextarea"
				/>
				<div :class="$style.editActions">
					<N8nButton type="secondary" size="small" @click="handleCancelEdit">
						{{ i18n.baseText('chatHub.message.edit.cancel') }}
					</N8nButton>
					<N8nButton
						type="primary"
						size="small"
						:disabled="!editedText.trim()"
						@click="handleConfirmEdit"
					>
						{{ i18n.baseText('chatHub.message.edit.send') }}
					</N8nButton>
				</div>
			</div>
			<div v-else>
				<div
					:class="[$style.chatMessage, { [$style.errorMessage]: message.status === 'error' }]"
					@mousemove="handleMouseMove"
					@mouseleave="handleMouseLeave"
				>
					<div v-if="attachments.length > 0" :class="$style.attachments">
						<ChatFile
							v-for="(attachment, index) in attachments"
							:key="index"
							:file="attachment.file"
							:is-removable="false"
							:href="attachment.downloadUrl"
						/>
					</div>
					<div v-if="message.type === 'human'">{{ message.content }}</div>
					<VueMarkdown
						v-else
						:key="markdown.forceReRenderKey.value"
						:class="[$style.chatMessageMarkdown, 'chat-message-markdown']"
						:source="
							message.status === 'error' && !message.content
								? i18n.baseText('chatHub.message.error.unknown')
								: message.content
						"
						:options="markdown.options"
						:plugins="markdown.plugins.value"
					/>
				</div>
				<ChatTypingIndicator v-if="isStreaming" :class="$style.typingIndicator" />
				<ChatMessageActions
					v-else
					:is-speech-synthesis-available="speech.isSupported.value"
					:is-speaking="speech.isPlaying.value"
					:class="$style.actions"
					:message="message"
					:alternatives="message.alternatives"
					@edit="handleEdit"
					@regenerate="handleRegenerate"
					@read-aloud="handleReadAloud"
					@switchAlternative="handleSwitchAlternative"
				/>
			</div>
		</div>
		<Teleport
			v-if="hoveredCodeBlockActions && hoveredCodeBlockContent"
			:to="hoveredCodeBlockActions"
		>
			<CopyButton :content="hoveredCodeBlockContent" />
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.message {
	position: relative;
	scroll-margin-block: var(--spacing--sm);
}

.avatar {
	position: absolute;
	right: 100%;
	margin-right: var(--spacing--xs);
	top: 0;
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--color--background);
	color: var(--color--text--tint-1);

	.compact & {
		position: static;
		margin-bottom: var(--spacing--xs);
	}
}

.content {
	display: flex;
	flex-direction: column;
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);

	.chatMessage & {
		margin-top: var(--spacing--xs);
	}
}

.chatMessage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	position: relative;
	max-width: fit-content;
	overflow-wrap: break-word;
	font-size: var(--font-size--sm);
	line-height: 1.5;

	.user & {
		padding: var(--spacing--2xs) var(--spacing--sm);
		border-radius: var(--radius--xl);
		background-color: var(--color--background);
		white-space-collapse: preserve-breaks;
	}
}

.errorMessage {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	background-color: var(--color--danger--tint-4);
	border: var(--border-width) var(--border-style) var(--color--danger--tint-3);
	color: var(--color--danger);
}

.chatMessageMarkdown {
	display: block;
	box-sizing: border-box;

	> *:first-child {
		margin-top: 0;
	}

	> *:last-child {
		margin-bottom: 0;
	}

	& * {
		font-size: var(--font-size--sm);
		line-height: 1.5;
	}

	p {
		margin: var(--spacing--xs) 0;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin: 1em 0 0.8em;
		line-height: var(--line-height--md);
	}

	// Override heading sizes to be smaller
	h1 {
		font-size: var(--font-size--xl);
		font-weight: var(--font-weight--bold);
	}

	h2 {
		font-size: var(--font-size--lg);
		font-weight: var(--font-weight--bold);
	}

	h3 {
		font-size: var(--font-size--md);
		font-weight: var(--font-weight--bold);
	}

	h4 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	h5 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	h6 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	pre {
		width: 100%;
		font-family: inherit;
		font-size: inherit;
		margin: 0;
		white-space: pre-wrap;
		box-sizing: border-box;
		padding: var(--chat--spacing);
		background: var(--chat--message--pre--background);
		border-radius: var(--chat--border-radius);
		position: relative;

		code:last-of-type {
			padding-bottom: 0;
		}

		& .codeBlockActions {
			position: absolute;
			top: 0;
			right: 0;
			margin: var(--spacing--2xs);
		}

		& ~ pre {
			margin-bottom: 1em;
		}
	}

	.tableContainer {
		width: var(--container--width);
		padding-bottom: 1em;
		padding-left: calc((var(--container--width) - 100%) / 2);
		padding-right: var(--spacing--lg);
		margin-left: calc(-1 * (var(--container--width) - 100%) / 2);
		overflow-x: auto;
	}

	table {
		width: fit-content;
		border-bottom: var(--border);
		border-top: var(--border);
		border-width: 2px;
		border-color: var(--color--text--shade-1);
	}

	th,
	td {
		padding: 0.25em 1em 0.25em 0;
		min-width: 12em;
	}

	th {
		border-bottom: var(--border);
		border-color: var(--color--text--shade-1);
	}

	ul,
	ol {
		li {
			margin-bottom: 0.125rem;
		}
	}
}

.actions {
	margin-top: var(--spacing--2xs);
}

.editContainer {
	width: 100%;
	border-radius: var(--radius--lg);
	padding: var(--spacing--xs);
	background-color: var(--color--background--light-3);
	border: var(--border);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:focus-within,
	&:hover {
		border-color: var(--color--secondary);
	}
}

.textarea {
	scroll-margin-block: var(--spacing--sm);
}

.textarea textarea {
	font-family: inherit;
	line-height: 1.5em;
	resize: none;
	background-color: transparent !important;
	border: none !important;
	padding: 0 !important;
}

.editActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.typingIndicator {
	margin-top: var(--spacing--xs);
}
</style>
