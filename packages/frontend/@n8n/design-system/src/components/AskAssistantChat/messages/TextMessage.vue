<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue';

import BaseMessage from './BaseMessage.vue';
import RestoreVersionLink from './RestoreVersionLink.vue';
import { useMarkdown } from './useMarkdown';
import { useI18n } from '../../../composables/useI18n';
import type { ChatUI, RatingFeedback } from '../../../types/assistant';
import BlinkingCursor from '../../BlinkingCursor/BlinkingCursor.vue';
import N8nButton from '../../N8nButton';

interface Props {
	message: ChatUI.TextMessage & { quickReplies?: ChatUI.QuickReply[] };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
	streaming?: boolean;
	isLastMessage?: boolean;
	color?: string;
	pruneTimeHours?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	feedback: [RatingFeedback];
	restoreConfirm: [versionId: string, messageId: string];
	restoreCancel: [];
	showVersion: [versionId: string];
}>();
const { renderMarkdown } = useMarkdown();
const { t } = useI18n();

const isClipboardSupported = computed(() => {
	return navigator.clipboard?.writeText;
});

// User message expand/collapse functionality
const isExpanded = ref(false);
const userContentRef = ref<HTMLElement | null>(null);
const isOverflowing = ref(false);
// Should match --assistant--text-message--collapsed--max-height in _tokens.scss
const MAX_HEIGHT = 200;

function checkOverflow() {
	if (userContentRef.value) {
		isOverflowing.value = userContentRef.value.scrollHeight > MAX_HEIGHT;
	}
}

function toggleExpanded() {
	isExpanded.value = !isExpanded.value;
}

onMounted(() => {
	void nextTick(() => {
		checkOverflow();
	});
});

watch(
	() => props.message.content,
	() => {
		void nextTick(() => {
			checkOverflow();
		});
	},
);

const fallbackFocusedNodesLabel = computed(() => {
	const names = props.message.focusedNodeNames;
	if (!names?.length) return '';
	return `Focusing on ${names.map((n) => `'${n}'`).join(', ')}`;
});

async function onCopyButtonClick(content: string, e: MouseEvent) {
	const button = e.target as HTMLButtonElement;
	await navigator.clipboard.writeText(content);
	button.innerText = t('assistantChat.copied');
	setTimeout(() => {
		button.innerText = t('assistantChat.copy');
	}, 2000);
}
</script>

<template>
	<BaseMessage
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		@feedback="(feedback) => emit('feedback', feedback)"
	>
		<div :class="[$style.textMessage, { [$style.userMessage]: message.role === 'user' }]">
			<!-- Restore version link for user messages with revertVersion - positioned before the message -->
			<RestoreVersionLink
				v-if="message.role === 'user' && message.revertVersion && message.id"
				:revert-version="message.revertVersion"
				:streaming="streaming"
				:prune-time-hours="pruneTimeHours"
				@restore-confirm="(versionId) => emit('restoreConfirm', versionId, message.id!)"
				@restore-cancel="emit('restoreCancel')"
				@show-version="(versionId) => emit('showVersion', versionId)"
			/>
			<!-- User message with container -->
			<div v-if="message.role === 'user'" :class="$style.userMessageContainer">
				<div
					ref="userContentRef"
					:class="[$style.userContent, { [$style.collapsed]: !isExpanded && isOverflowing }]"
				>
					<span v-n8n-html="renderMarkdown(message.content)" :class="$style.renderedContent"></span>
				</div>
				<button
					v-if="isOverflowing"
					:class="$style.showMoreButton"
					type="button"
					@click="toggleExpanded"
				>
					{{ isExpanded ? t('notice.showLess') : t('notice.showMore') }}
				</button>
				<div
					v-if="message.focusedNodeNames?.length"
					:class="$style.focusedNodesSlotWrapper"
					data-test-id="message-focused-nodes"
				>
					<slot name="focused-nodes-chips" :message="message">
						<span :class="$style.focusedNodesFallback">
							{{ fallbackFocusedNodesLabel }}
						</span>
					</slot>
				</div>
			</div>
			<!-- Assistant message -->
			<div
				v-else
				v-n8n-html="renderMarkdown(message.content)"
				:class="[$style.assistantText, $style.renderedContent]"
				:style="color ? { color } : undefined"
			></div>
			<div
				v-if="message?.codeSnippet"
				:class="$style.codeSnippet"
				data-test-id="assistant-code-snippet"
			>
				<header v-if="isClipboardSupported">
					<N8nButton
						variant="ghost"
						size="xsmall"
						data-test-id="assistant-copy-snippet-button"
						@click="onCopyButtonClick(message.codeSnippet, $event)"
					>
						{{ t('assistantChat.copy') }}
					</N8nButton>
				</header>
				<div
					v-n8n-html="renderMarkdown(message.codeSnippet).trim()"
					data-test-id="assistant-code-snippet-content"
					:class="[$style.snippetContent, $style.renderedContent]"
				></div>
			</div>
			<BlinkingCursor v-if="streaming && isLastMessage && message.role === 'assistant'" />
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.textMessage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	word-break: break-word;
}

// User messages align right
.userMessage {
	align-items: flex-end;
}

// User message container styles per Figma
.userMessageContainer {
	background-color: var(--assistant--color--background--user-bubble);
	border-radius: var(--radius--lg);
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--assistant--color--text--user-bubble);
	max-width: calc(100% - 40px);
}

.userContent {
	&.collapsed {
		max-height: var(--assistant--text-message--collapsed--max-height);
		overflow: hidden;
	}
}

.showMoreButton {
	background: none;
	border: none;
	padding: 0;
	margin-top: var(--spacing--2xs);
	color: var(--assistant--color--text--subtle);
	font-size: var(--font-size--sm);
	font-weight: 500;
	cursor: pointer;
	text-align: left;

	&:hover {
		text-decoration: underline;
	}
}

.codeSnippet {
	position: relative;
	border: var(--border);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	max-height: 218px; // 12 lines
	overflow: auto;
	margin: var(--spacing--4xs) 0;

	header {
		display: flex;
		justify-content: flex-end;
		padding: var(--spacing--4xs);
		border-bottom: var(--border);

		button:active,
		button:focus {
			outline: none !important;
		}
	}

	.snippetContent {
		padding: var(--spacing--2xs);
	}

	pre {
		white-space-collapse: collapse;
	}

	code {
		background-color: transparent;
		font-size: var(--font-size--3xs);
	}
}

// Assistant message - simple text
.assistantText {
	display: inline-flex;
	flex-direction: column;
	color: var(--assistant--color--text);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	max-width: calc(100% - 40px);
}

.renderedContent {
	p {
		margin: 0;
	}

	// Hide horizontal rules - they don't look good in chat messages
	hr {
		display: none;
	}

	// Add top padding to strong elements only when there's content before them
	:not(:first-child) > strong:first-child,
	* + strong {
		display: inline-block;
		padding-top: var(--spacing--md);
	}

	h1,
	h2,
	h3 {
		font-weight: var(--font-weight--bold);
		font-size: var(--font-size--xs);
		margin: var(--spacing--xs) 0 var(--spacing--4xs);
	}

	h4,
	h5,
	h6 {
		font-weight: var(--font-weight--bold);
		font-size: var(--font-size--2xs);
	}

	ul,
	ol {
		margin: var(--spacing--4xs) 0 var(--spacing--4xs) var(--spacing--lg);

		li {
			margin-bottom: var(--spacing--5xs);
		}

		ul,
		ol {
			margin-left: var(--spacing--xs);
			margin-top: var(--spacing--4xs);
		}
	}

	:global(.table-wrapper) {
		overflow-x: auto;
	}

	table {
		margin: var(--spacing--4xs) 0;

		th {
			white-space: nowrap;
			min-width: 120px;
			width: auto;
		}

		th,
		td {
			border: var(--border);
			padding: var(--spacing--4xs);
		}
	}
}

.focusedNodesSlotWrapper {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--4xs);
}

.focusedNodesFallback {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	font-style: italic;
}
</style>
