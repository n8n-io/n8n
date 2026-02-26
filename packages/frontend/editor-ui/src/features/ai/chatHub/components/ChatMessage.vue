<script setup lang="ts">
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import type {
	AgentIconOrEmoji,
	ChatMessageContentChunk,
	ChatMessageId,
	ChatModelDto,
} from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nIconButton, N8nInput } from '@n8n/design-system';
import { useSpeechSynthesis } from '@vueuse/core';
import {
	computed,
	onBeforeMount,
	ref,
	useTemplateRef,
	watch,
	type ComponentPublicInstance,
} from 'vue';
import type { ChatMessage } from '../chat.types';
import ChatMessageActions from './ChatMessageActions.vue';
import { unflattenModel, splitMarkdownIntoChunks } from '@/features/ai/chatHub/chat.utils';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { buildChatAttachmentUrl } from '@/features/ai/chatHub/chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useI18n } from '@n8n/i18n';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
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
}>();

const emit = defineEmits<{
	startEdit: [];
	cancelEdit: [];
	update: [content: string, keptAttachmentIndices: number[], newFiles: File[]];
	regenerate: [message: ChatMessage];
	switchAlternative: [messageId: ChatMessageId];
	openArtifact: [title: string];
}>();

const chatStore = useChatStore();
const rootStore = useRootStore();
const { isCtrlKeyPressed } = useDeviceSupport();
const i18n = useI18n();

const editedText = ref('');
const newFiles = ref<File[]>([]);
const removedExistingIndices = ref<Set<number>>(new Set());
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const textareaRef = useTemplateRef<InstanceType<typeof N8nInput>>('textarea');
const markdownChunkRefs = useTemplateRef<
	Array<ComponentPublicInstance<{
		hoveredCodeBlockActions: HTMLElement | null;
		getHoveredCodeBlockContent: () => string | undefined;
	}> | null>
>('markdownChunk');

const activeCodeBlockTeleport = computed<{
	target: HTMLElement;
	content: string;
} | null>(() => {
	const refs = markdownChunkRefs.value;
	if (!refs || !Array.isArray(refs)) {
		return null;
	}

	for (const chunkRef of refs) {
		if (chunkRef?.hoveredCodeBlockActions) {
			const content = chunkRef.getHoveredCodeBlockContent();
			if (content) {
				return { target: chunkRef.hoveredCodeBlockActions, content };
			}
		}
	}
	return null;
});

const messageChunks = computed(() =>
	message.content.flatMap<ChatMessageContentChunk>((chunk, index, arr) => {
		if (chunk.type === 'hidden') {
			return [];
		}

		if (chunk.type === 'with-buttons') {
			return [chunk];
		}

		if (chunk.type === 'artifact-create' || chunk.type === 'artifact-edit') {
			const prev = arr[index - 1];
			return prev?.type === chunk.type && prev.command.title === chunk.command.title ? [] : [chunk]; // dedupe command
		}

		// Handle error case with no content
		if (message.status === 'error' && !chunk.content) {
			return [{ type: 'text', content: i18n.baseText('chatHub.message.error.unknown') }];
		}

		return splitMarkdownIntoChunks(chunk.content).flatMap((content) =>
			content.trim() === '' ? [] : [{ type: 'text', content }],
		);
	}),
);
const text = computed(() =>
	messageChunks.value.flatMap((chunk) => (chunk.type === 'text' ? [chunk.content] : [])).join(''),
);

const speech = useSpeechSynthesis(text, {
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
	return (
		message.status === 'success' &&
		text.value === '' &&
		!message.content.some((c) => c.type === 'with-buttons')
	);
});

const shouldShowTypingIndicator = computed(() => message.status === 'running');

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

// Watch for isEditing prop changes to initialize edit mode
watch(
	() => isEditing,
	(editing) => {
		editedText.value = editing ? text.value : '';
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
						variant="ghost"
						icon="paperclip"
						@click.stop="handleAttachClick"
					/>
					<div :class="$style.editActions">
						<N8nButton variant="subtle" size="small" @click="handleCancelEdit">
							{{ i18n.baseText('chatHub.message.edit.cancel') }}
						</N8nButton>
						<N8nButton
							variant="solid"
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
			<template v-else>
				<div :class="[$style.chatMessage, { [$style.errorMessage]: message.status === 'error' }]">
					<div v-if="attachments.length > 0" :class="$style.attachments">
						<ChatFile
							v-for="(attachment, index) in attachments"
							:key="index"
							:file="attachment.file"
							:is-removable="false"
							:href="attachment.downloadUrl"
						/>
					</div>
					<div v-if="message.type === 'human'">
						{{ text }}
					</div>
					<div v-else :class="$style.markdownContent">
						<ChatMarkdownChunk
							v-for="(chunk, index) in messageChunks"
							ref="markdownChunk"
							:key="index"
							:source="chunk"
							:is-buttons-disabled="message.status !== 'waiting'"
							@open-artifact="emit('openArtifact', $event)"
						/>
						<Teleport v-if="activeCodeBlockTeleport" :to="activeCodeBlockTeleport.target">
							<CopyButton :content="activeCodeBlockTeleport.content" />
						</Teleport>
					</div>
				</div>
				<ChatTypingIndicator v-if="shouldShowTypingIndicator" :class="$style.typingIndicator" />
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
					@switch-alternative="handleSwitchAlternative"
				/>
			</template>
		</div>
	</div>
</template>
<style lang="scss" module>
.message {
	position: relative;
	scroll-margin-block: var(--spacing--sm);
}

.markdownContent {
	> *:last-child > *:last-child {
		margin-bottom: 0;
	}
	> *:first-child > *:first-child {
		margin-top: 0;
	}
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
		margin-left: calc(-1 * var(--spacing--2xs));
		position: static;
		margin-bottom: var(--spacing--xs);
	}
}

.content {
	display: flex;
	flex-direction: column;
	align-items: stretch;

	@media (hover: hover) {
		&:hover .actions,
		&:focus-within .actions {
			opacity: 1;
			pointer-events: auto;
		}
	}
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
	overflow-wrap: break-word;
	font-size: var(--font-size--sm);
	line-height: 1.5;

	.user & {
		padding: var(--spacing--2xs) var(--spacing--sm);
		border-radius: var(--radius--xl);
		background-color: var(--color--background);
		white-space-collapse: preserve-breaks;
		width: fit-content;
		max-width: 100%;
		font-size: var(--font-size--md);
		line-height: var(--line-height--xl);
	}
}

.errorMessage {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	background-color: var(--color--danger--tint-4);
	border: var(--border-width) var(--border-style) var(--color--danger--tint-3);
	color: var(--color--danger);

	p,
	a {
		color: var(--color--danger);
	}
}

.actions {
	margin-top: var(--spacing--2xs);
	transition: opacity 0.15s;

	@media (hover: hover) {
		opacity: 0;
		pointer-events: none;

		&:hover {
			opacity: 1;
			pointer-events: auto;
		}
	}
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
