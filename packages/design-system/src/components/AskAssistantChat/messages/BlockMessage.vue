<script setup lang="ts">
import Markdown from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';

import BaseMessage from './BaseMessage.vue';
import { useI18n } from '../../../composables/useI18n';
import type { ChatUI } from '../../../types/assistant';
import BlinkingCursor from '../../BlinkingCursor/BlinkingCursor.vue';

interface Props {
	message: ChatUI.SummaryBlock & { id: string; read: boolean; quickReplies?: ChatUI.QuickReply[] };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
	streaming?: boolean;
	isLastMessage?: boolean;
}

defineProps<Props>();
const { t } = useI18n();

const md = new Markdown({
	breaks: true,
});

md.use(markdownLink, {
	attrs: {
		target: '_blank',
		rel: 'noopener',
	},
});

function renderMarkdown(content: string) {
	try {
		return md.render(content);
	} catch (e) {
		console.error(`Error parsing markdown content ${content}`);
		return `<p>${t('assistantChat.errorParsingMarkdown')}</p>`;
	}
}
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.block">
			<div :class="$style.blockTitle">
				{{ message.title }}
				<BlinkingCursor v-if="streaming && isLastMessage && !message.content" />
			</div>
			<div :class="$style.blockBody">
				<span
					v-n8n-html="renderMarkdown(message.content)"
					:class="$style['rendered-content']"
				></span>
				<BlinkingCursor v-if="streaming && isLastMessage && message.title && message.content" />
			</div>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.block {
	font-size: var(--font-size-2xs);
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	word-break: break-word;

	li {
		margin-left: var(--spacing-xs);
	}
}

.blockTitle {
	border-bottom: var(--border-base);
	padding: var(--spacing-2xs);
	font-weight: var(--font-weight-bold);
}

.blockBody {
	padding: var(--spacing-xs);
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
