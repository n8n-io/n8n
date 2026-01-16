<script setup lang="ts">
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
import type { AgentIconOrEmoji, ChatMessageId, ChatModelDto } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nIconButton, N8nInput } from '@n8n/design-system';
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

interface MergedAttachment {
	isNew: boolean;
	file: File;
	downloadUrl?: string;
	index: number;
}

const {
	message,
	compact,
	isEditing,
	isEditSubmitting,
	hasSessionStreaming,
	minHeight,
	cachedAgentDisplayName,
	cachedAgentIcon,
	containerWidth,
} = defineProps<{
	message: ChatMessage;
	compact: boolean;
	isEditing: boolean;
	isEditSubmitting: boolean;
	hasSessionStreaming: boolean;
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
	update: [content: string, keptAttachmentIndices: number[], newFiles: File[]];
	regenerate: [message: ChatMessage];
	switchAlternative: [messageId: ChatMessageId];
}>();

const chatStore = useChatStore();
const rootStore = useRootStore();
const { isCtrlKeyPressed } = useDeviceSupport();
const i18n = useI18n();
const styles = useCssModule();

const editedText = ref('');
const newFiles = ref<File[]>([]);
const removedExistingIndices = ref<Set<number>>(new Set());
const fileInputRef = useTemplateRef('fileInputRef');
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

const mergedAttachments = computed(() => [
	...attachments.value.flatMap<MergedAttachment>(({ downloadUrl, file }, idx) =>
		removedExistingIndices.value.has(idx) ? [] : [{ isNew: false, file, index: idx, downloadUrl }],
	),
	...newFiles.value.map<MergedAttachment>((file, index) => ({ isNew: true, file, index })),
]);

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

	// Calculate which original indices to keep (not removed)
	const keptAttachmentIndices = message.attachments
		.map((_, idx) => idx)
		.filter((idx) => !removedExistingIndices.value.has(idx));

	emit('update', editedText.value, keptAttachmentIndices, newFiles.value);
}

function handleAttachClick() {
	fileInputRef.value?.click();
}

function handleFileSelect(e: Event) {
	const target = e.target as HTMLInputElement;
	const files = target.files;

	if (!files || files.length === 0) {
		return;
	}

	for (const file of Array.from(files)) {
		newFiles.value.push(file);
	}

	if (target) {
		target.value = '';
	}
}

function handleRemoveFile(file: MergedAttachment) {
	if (file.isNew) {
		newFiles.value = newFiles.value.filter((_, idx) => idx !== file.index);
		return;
	}

	removedExistingIndices.value.add(file.index);
}

function addFiles(files: File[]) {
	for (const file of files) {
		newFiles.value.push(file);
	}
}

// Expose method for parent component to add files via template ref
defineExpose({
	addFiles,
});

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
		newFiles.value = [];
		removedExistingIndices.value = new Set();
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
		:data-test-id="`chat-message-${message.id}`"
	>
		<div :class="$style.avatar">
			<N8nIcon v-if="message.type === 'human'" icon="user" width="20" height="20" />
			<ChatAgentAvatar v-else :agent="agent" size="md" tooltip />
		</div>
		<div :class="$style.content">
			<input
				v-if="message.type === 'human'"
				ref="fileInputRef"
				type="file"
				data-test-id="message-edit-file-input"
				:class="$style.fileInput"
				multiple
				@change="handleFileSelect"
			/>
			<div v-if="isEditing" :class="$style.editContainer">
				<div
					v-if="message.type === 'human' && mergedAttachments.length > 0"
					:class="$style.attachments"
				>
					<ChatFile
						v-for="(attachment, index) in mergedAttachments"
						:key="index"
						:file="attachment.file"
						is-removable
						:href="attachment.isNew ? undefined : attachment.downloadUrl"
						@remove="handleRemoveFile(attachment)"
					/>
				</div>
				<N8nInput
					ref="textarea"
					v-model="editedText"
					type="textarea"
					:autosize="{ minRows: 1, maxRows: 20 }"
					:class="$style.textarea"
					@keydown="handleKeydownTextarea"
				/>
				<div :class="$style.editFooter">
					<N8nIconButton
						v-if="message.type === 'human'"
						native-type="button"
						type="secondary"
						icon="paperclip"
						text
						@click.stop="handleAttachClick"
					/>
					<div :class="$style.editActions">
						<N8nButton type="secondary" size="small" @click="handleCancelEdit">
							{{ i18n.baseText('chatHub.message.edit.cancel') }}
						</N8nButton>
						<N8nButton
							type="primary"
							size="small"
							:disabled="!editedText.trim() || isEditSubmitting"
							:loading="isEditSubmitting"
							@click="handleConfirmEdit"
						>
							{{ i18n.baseText('chatHub.message.edit.send') }}
						</N8nButton>
					</div>
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
				<ChatTypingIndicator v-if="message.status === 'running'" :class="$style.typingIndicator" />
				<ChatMessageActions
					v-else
					:is-speech-synthesis-available="speech.isSupported.value"
					:is-speaking="speech.isPlaying.value"
					:class="$style.actions"
					:message="message"
					:has-session-streaming="hasSessionStreaming"
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
			position: sticky;
			top: var(--spacing--sm);
			display: flex;
			justify-content: flex-end;
			height: 32px;
			pointer-events: none;

			& > * {
				pointer-events: auto;
			}
		}

		& .codeBlockActions ~ code {
			margin-top: -32px;
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

.fileInput {
	display: none;
}

.editFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.editActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.typingIndicator {
	margin-top: var(--spacing--xs);
}
</style>
