<script setup lang="ts">
import { N8nIcon, N8nInput, N8nButton, N8nTooltip } from '@n8n/design-system';
import VueMarkdown from 'vue-markdown-render';
import markdownLink from 'markdown-it-link-attributes';
import type MarkdownIt from 'markdown-it';
import ChatMessageActions from './ChatMessageActions.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useClipboard } from '@/composables/useClipboard';
import { ref, nextTick, watch, useTemplateRef, computed, onBeforeMount } from 'vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import { PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
import { useSpeechSynthesis } from '@vueuse/core';
import type { ChatMessage } from '../chat.types';
import type { ChatMessageId } from '@n8n/api-types';

const { message, compact, isEditing, isStreaming, minHeight } = defineProps<{
	message: ChatMessage;
	compact: boolean;
	isEditing: boolean;
	isStreaming: boolean;
	/**
	 * minHeight allows scrolling agent's response to the top while it is being generated
	 */
	minHeight?: number;
}>();

const emit = defineEmits<{
	startEdit: [];
	cancelEdit: [];
	update: [message: ChatMessage];
	regenerate: [message: ChatMessage];
	switchAlternative: [messageId: ChatMessageId];
}>();

const clipboard = useClipboard();

const editedText = ref('');
const textareaRef = useTemplateRef('textarea');
const justCopied = ref(false);
const { markdownOptions, forceReRenderKey } = useChatHubMarkdownOptions();
const messageContent = computed(() => message.content);

const speech = useSpeechSynthesis(messageContent, {
	pitch: 1,
	rate: 1,
	volume: 1,
});

const credentialTypeName = computed(() => {
	if (message.type !== 'ai' || !message.provider) {
		return null;
	}
	return PROVIDER_CREDENTIAL_TYPE_MAP[message.provider] ?? null;
});

async function handleCopy() {
	const text = message.content;
	await clipboard.copy(text);
	justCopied.value = true;
	setTimeout(() => {
		justCopied.value = false;
	}, 1000);
}

function handleEdit() {
	emit('startEdit');
}

function handleCancelEdit() {
	emit('cancelEdit');
}

function handleConfirmEdit() {
	if (message.type === 'ai' || !editedText.value.trim()) {
		return;
	}

	emit('update', { ...message, content: editedText.value });
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

const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	vueMarkdownItInstance.use(markdownLink, {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	});
};

// Watch for isEditing prop changes to initialize edit mode
watch(
	() => isEditing,
	async (editing) => {
		if (editing) {
			editedText.value = message.content;
			await nextTick();
			textareaRef.value?.focus();
		} else {
			editedText.value = '';
		}
	},
	{ immediate: true },
);

onBeforeMount(() => {
	speech.stop();
});
</script>

<template>
	<div
		:class="[
			$style.message,
			message.type === 'human' ? $style.user : $style.assistant,
			{
				[$style.compact]: compact,
			},
		]"
		:style="minHeight ? { minHeight: `${minHeight}px` } : undefined"
		:data-message-id="message.id"
	>
		<div :class="$style.avatar">
			<N8nIcon v-if="message.type === 'human'" icon="user" width="20" height="20" />
			<N8nTooltip
				v-else-if="message.type === 'ai' && credentialTypeName"
				:show-after="100"
				placement="left"
			>
				<template #content>{{ message.model }}</template>
				<CredentialIcon :size="20" :credential-type-name="credentialTypeName" />
			</N8nTooltip>
			<N8nIcon v-else icon="sparkles" width="20" height="20" />
		</div>
		<div :class="$style.content">
			<div v-if="isEditing" :class="$style.editContainer">
				<N8nInput
					ref="textarea"
					v-model="editedText"
					type="textarea"
					:autosize="{ minRows: 3, maxRows: 20 }"
					:class="$style.textarea"
				/>
				<div :class="$style.editActions">
					<N8nButton type="secondary" size="small" @click="handleCancelEdit"> Cancel </N8nButton>
					<N8nButton
						type="primary"
						size="small"
						:disabled="!editedText.trim()"
						@click="handleConfirmEdit"
					>
						Send
					</N8nButton>
				</div>
			</div>
			<template v-else>
				<div :class="$style.chatMessage">
					<VueMarkdown
						:key="forceReRenderKey"
						:class="[$style.chatMessageMarkdown, 'chat-message-markdown']"
						:source="message.content"
						:options="markdownOptions"
						:plugins="[linksNewTabPlugin]"
					/>
				</div>
				<ChatTypingIndicator v-if="isStreaming" :class="$style.typingIndicator" />
				<ChatMessageActions
					v-else
					:type="message.type"
					:just-copied="justCopied"
					:is-speech-synthesis-available="speech.isSupported.value"
					:is-speaking="speech.isPlaying.value"
					:class="$style.actions"
					:message-id="message.id"
					:alternatives="message.alternatives"
					@copy="handleCopy"
					@edit="handleEdit"
					@regenerate="handleRegenerate"
					@read-aloud="handleReadAloud"
					@switchAlternative="handleSwitchAlternative"
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
	background: var(--color--background--light-3);
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

.chatMessage {
	display: block;
	position: relative;
	max-width: fit-content;

	.user & {
		padding: var(--spacing--4xs) var(--spacing--md);
		border-radius: var(--radius--xl);
		background-color: var(--color--background);
	}

	> .chatMessageMarkdown {
		display: block;
		box-sizing: border-box;

		> *:first-child {
			margin-top: 0;
		}

		> *:last-child {
			margin-bottom: 0;
		}

		& * {
			font-size: var(--font-size--md);
			line-height: 1.8;
		}

		p {
			margin: var(--spacing--xs) 0;
		}

		pre {
			font-family: inherit;
			font-size: inherit;
			margin: 0;
			white-space: pre-wrap;
			box-sizing: border-box;
			padding: var(--chat--spacing);
			background: var(--chat--message--pre--background);
			border-radius: var(--chat--border-radius);
		}

		table {
			width: 100%;
			border-bottom: var(--border);
			border-top: var(--border);
			border-width: 2px;
			margin-bottom: 1em;
			border-color: var(--color--text--shade-1);
		}

		th,
		td {
			padding: 0.25em 1em 0.25em 0;
		}

		th {
			border-bottom: var(--border);
			border-color: var(--color--text--shade-1);
		}
	}
}

.actions {
	margin-top: var(--spacing--2xs);
}

.editContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.textarea textarea {
	font-family: inherit;
	background-color: var(--color--background--light-3);
	border-radius: var(--radius--lg);
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
