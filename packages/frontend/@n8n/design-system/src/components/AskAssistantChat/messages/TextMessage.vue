<script setup lang="ts">
import { computed } from 'vue';

import BaseMessage from './BaseMessage.vue';
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
}

defineProps<Props>();

const emit = defineEmits<{
	feedback: [RatingFeedback];
}>();
const { renderMarkdown } = useMarkdown();
const { t } = useI18n();

const isClipboardSupported = computed(() => {
	return navigator.clipboard?.writeText;
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
		<div :class="$style.textMessage">
			<span
				v-if="message.role === 'user'"
				v-n8n-html="renderMarkdown(message.content)"
				:class="$style['rendered-content']"
			></span>
			<div
				v-else
				v-n8n-html="renderMarkdown(message.content)"
				:class="[$style.assistantText, $style['rendered-content']]"
			></div>
			<div
				v-if="message?.codeSnippet"
				:class="$style['code-snippet']"
				data-test-id="assistant-code-snippet"
			>
				<header v-if="isClipboardSupported">
					<N8nButton
						type="tertiary"
						:text="true"
						size="mini"
						data-test-id="assistant-copy-snippet-button"
						@click="onCopyButtonClick(message.codeSnippet, $event)"
					>
						{{ t('assistantChat.copy') }}
					</N8nButton>
				</header>
				<div
					v-n8n-html="renderMarkdown(message.codeSnippet).trim()"
					data-test-id="assistant-code-snippet-content"
					:class="[$style['snippet-content'], $style['rendered-content']]"
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
	gap: var(--spacing-xs);
	font-size: var(--font-size-2xs);
	word-break: break-word;
}

.code-snippet {
	position: relative;
	border: var(--border-base);
	background-color: var(--color-foreground-xlight);
	border-radius: var(--border-radius-base);
	font-family: var(--font-family-monospace);
	font-size: var(--font-size-3xs);
	max-height: 218px; // 12 lines
	overflow: auto;
	margin: var(--spacing-4s) 0;

	header {
		display: flex;
		justify-content: flex-end;
		padding: var(--spacing-4xs);
		border-bottom: var(--border-base);

		button:active,
		button:focus {
			outline: none !important;
		}
	}

	.snippet-content {
		padding: var(--spacing-2xs);
	}

	pre {
		white-space-collapse: collapse;
	}

	code {
		background-color: transparent;
		font-size: var(--font-size-3xs);
	}
}

.assistantText {
	display: inline-flex;
	flex-direction: column;
}

.rendered-content {
	p {
		margin: 0;
		margin: var(--spacing-4xs) 0;
	}

	h1,
	h2,
	h3 {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-xs);
		margin: var(--spacing-xs) 0 var(--spacing-4xs);
	}

	h4,
	h5,
	h6 {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-2xs);
	}

	ul,
	ol {
		margin: var(--spacing-4xs) 0 var(--spacing-4xs) var(--spacing-l);

		ul,
		ol {
			margin-left: var(--spacing-xs);
			margin-top: var(--spacing-4xs);
		}
	}

	:global(.table-wrapper) {
		overflow-x: auto;
	}

	table {
		margin: var(--spacing-4xs) 0;

		th {
			white-space: nowrap;
			min-width: 120px;
			width: auto;
		}

		th,
		td {
			border: var(--border-base);
			padding: var(--spacing-4xs);
		}
	}
}
</style>
