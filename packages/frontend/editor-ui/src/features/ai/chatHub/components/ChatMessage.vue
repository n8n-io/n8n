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
					<div :class="$style.messageContent" v-if="message.type === 'human'">
						{{ message.content }}
					</div>
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
			<div :class="$style.codeBlockActions">
				<CopyButton :content="hoveredCodeBlockContent" />
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.message {
	position: relative;
	scroll-margin-block: var(--spacing--sm);
}

.messageContent {
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
}

.codeBlockActions > * {
	margin-top: -2px;
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
	color: var(--color--text--shade-1);

	// Base spacing rhythm between sibling elements
	> * + * {
		margin-top: var(--spacing--sm);
	}

	> *:first-child {
		margin-top: 0;
	}

	> *:last-child {
		margin-bottom: 0;
	}

	// Paragraphs and normal text
	p,
	li {
		font-size: var(--font-size--md);
		line-height: var(--line-height--xl);
		margin: var(--spacing--sm) 0;
	}

	li {
		margin: 0;
	}

	// Headings - with scroll margin for anchor navigation
	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		color: var(--color--text--shade-1);
		line-height: var(--line-height--md);
		scroll-margin-top: var(--spacing--xl);
	}

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

	h2 + h3 {
		margin-top: var(--spacing--sm);
	}

	h4 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	h5,
	h6 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		margin-top: var(--spacing--sm);
	}

	// Strong/bold text
	strong,
	b {
		font-size: var(--font-size--md);
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
	}

	// Links
	a:not(:where(h1, h2, h3, h4, h5, h6) *) {
		font-size: var(--font-size--md);
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--medium);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--color--secondary);
		text-decoration-thickness: 1px;
		transition: text-decoration-thickness 0.15s ease;

		&:hover {
			text-decoration-thickness: 2px;
		}

		code {
			font-weight: var(--font-weight--medium);
		}
	}

	// Inline code (not in pre blocks)
	:not(pre) > code {
		font-family: var(--font-family--monospace);
		font-weight: var(--font-weight--medium);
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
		background-color: var(--chat--message--pre--background);
		border-radius: var(--radius--sm);
		font-variant-ligatures: none;
	}

	// Code in headings
	:is(h1, h2, h3, h4, h5, h6) code {
		font-weight: var(--font-weight--bold);
	}

	// Code blocks
	pre {
		width: 100%;
		font-family: var(--font-family--monospace);
		font-size: var(--font-size--sm);
		line-height: var(--line-height--xl);
		margin: var(--spacing--2xs) 0 var(--spacing--md);
		white-space: pre-wrap;
		box-sizing: border-box;
		padding: var(--spacing--sm);
		background: var(--chat--message--pre--background);
		border-radius: var(--radius--lg);
		position: relative;

		code {
			font-family: var(--font-family--monospace);
			font-variant-ligatures: none;

			&::before,
			&::after {
				content: none;
			}
		}

		code:last-of-type {
			padding-bottom: 0;
		}

		// Reset spacing inside code blocks
		code * + * {
			margin-top: 0;
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
			margin-bottom: var(--spacing--md);
		}
	}

	// Blockquotes
	blockquote {
		font-size: var(--font-size--md);
		font-style: italic;
		border-left: var(--spacing--4xs) solid var(--color--foreground--shade-1);
		padding-left: var(--spacing--sm);
		margin: var(--spacing--sm) 0;
		color: var(--color--text--tint-1);

		p:first-of-type::before {
			content: open-quote;
		}

		p:last-of-type::after {
			content: close-quote;
		}
	}

	// Horizontal rules
	hr {
		border: none;
		border-top: var(--border-width) var(--border-style) var(--color--foreground);
		margin: var(--spacing--lg) 0;

		& + h2 {
			margin-top: var(--spacing--lg);
		}
	}

	// Ordered lists
	ol {
		padding-left: 0;
		list-style-type: decimal;
		list-style-position: inside;
		margin: var(--spacing--sm) 0;

		li + li {
			margin-top: var(--spacing--xs);
		}

		li::marker {
			font-family: var(--font-family--monospace);
			color: var(--color--text);
		}
	}

	// Unordered lists
	ul {
		padding-left: 0;
		list-style-type: disc;
		list-style-position: inside;
		margin: var(--spacing--sm) 0;

		li + li {
			margin-top: var(--spacing--2xs);
		}

		li::marker {
			color: var(--color--foreground--shade-1);
		}
	}

	// Nested lists
	ul ul,
	ol ol,
	ul ol,
	ol ul {
		margin-top: var(--spacing--2xs);
		margin-bottom: 0;
		padding-left: var(--spacing--lg);
	}

	// Tables
	.tableContainer {
		width: 100%;
		overflow-x: auto;
	}

	table {
		width: 100%;
		table-layout: auto;
		margin: var(--spacing--sm) 0;
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	thead {
		border-bottom-width: 1px;
		border-bottom-style: solid;
		border-bottom-color: var(--color--neutral-300);
	}

	thead th {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
		vertical-align: bottom;
		padding-inline-start: 0.6em;
		padding-inline-end: 0.6em;
		padding-bottom: 0.8em;
		text-align: start;
	}

	thead th:first-child {
		padding-inline-start: 0;
	}

	thead th:last-child {
		padding-inline-end: 0;
	}

	tbody tr {
		border-bottom-width: 1px;
		border-bottom-style: solid;
		border-bottom-color: var(--color--neutral-200);
	}

	tbody tr:last-child {
		border-bottom-width: 0;
	}

	tbody td {
		vertical-align: baseline;
		padding-top: 0.8em;
		padding-inline-start: 0.6em;
		padding-inline-end: 0.6em;
		padding-bottom: 0.8em;
	}

	tbody td:first-child {
		padding-inline-start: 0;
	}

	tbody td:last-child {
		padding-inline-end: 0;
	}

	tfoot {
		border-top-width: 1px;
		border-top-style: solid;
		border-top-color: var(--color--neutral-300);
	}

	tfoot td {
		vertical-align: top;
		padding-top: 0.8em;
		padding-inline-start: 0.6em;
		padding-inline-end: 0.6em;
		padding-bottom: 0.8em;
	}

	tfoot td:first-child {
		padding-inline-start: 0;
	}

	tfoot td:last-child {
		padding-inline-end: 0;
	}

	td code {
		font-size: var(--font-size--xs);
	}

	th,
	td {
		text-align: start;
	}

	// Figures and captions
	figure {
		margin: var(--spacing--sm) 0;
	}

	figcaption {
		margin-top: var(--spacing--xs);
		text-align: center;
		font-size: var(--font-size--sm);
		font-style: italic;
		color: var(--color--text--tint-1);
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
