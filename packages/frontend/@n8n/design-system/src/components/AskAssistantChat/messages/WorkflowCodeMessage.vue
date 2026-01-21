<script setup lang="ts">
import { computed } from 'vue';
import BaseMessage from './BaseMessage.vue';
import { useMarkdown } from './useMarkdown';
import { useI18n } from '../../../composables/useI18n';
import type { ChatUI } from '../../../types/assistant';
import N8nButton from '../../N8nButton';

interface WorkflowCodeData {
	workflowCode: string;
}

interface Props {
	message: ChatUI.WorkflowUpdatedMessage;
	isFirstOfRole: boolean;
}

const props = defineProps<Props>();
const { renderMarkdown } = useMarkdown();
const { t } = useI18n();

const isClipboardSupported = computed(() => {
	return !!navigator.clipboard?.writeText;
});

/**
 * Parse the codeSnippet and extract workflowCode if present
 */
const parsedCode = computed(() => {
	const { codeSnippet } = props.message;
	if (!codeSnippet) {
		return { isWorkflowCode: false, code: '' };
	}

	try {
		const parsed = JSON.parse(codeSnippet) as unknown;
		if (
			parsed &&
			typeof parsed === 'object' &&
			'workflowCode' in parsed &&
			typeof (parsed as WorkflowCodeData).workflowCode === 'string'
		) {
			return {
				isWorkflowCode: true,
				code: (parsed as WorkflowCodeData).workflowCode,
			};
		}
	} catch {
		// Not valid JSON, treat as raw code
	}

	return { isWorkflowCode: false, code: codeSnippet };
});

/**
 * Format the code as a JavaScript code block for markdown rendering
 */
const formattedCodeSnippet = computed(() => {
	const { code, isWorkflowCode } = parsedCode.value;
	if (!code) {
		return '';
	}
	// Wrap in JavaScript code fence for syntax highlighting
	if (isWorkflowCode) {
		return '```javascript\n' + code + '\n```';
	}
	// For non-workflowCode, try to detect if it's already fenced
	if (code.startsWith('```')) {
		return code;
	}
	return '```\n' + code + '\n```';
});

/**
 * Get the raw code for copying to clipboard
 */
const rawCodeForCopy = computed(() => {
	return parsedCode.value.code;
});

async function onCopyButtonClick(e: MouseEvent) {
	const button = e.target as HTMLButtonElement;
	await navigator.clipboard.writeText(rawCodeForCopy.value);
	button.innerText = t('assistantChat.copied');
	setTimeout(() => {
		button.innerText = t('assistantChat.copy');
	}, 2000);
}
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole">
		<div :class="$style.workflowCodeMessage">
			<div
				v-if="formattedCodeSnippet"
				:class="$style.codeSnippet"
				data-test-id="workflow-code-snippet"
			>
				<header v-if="isClipboardSupported">
					<N8nButton
						type="tertiary"
						:text="true"
						size="mini"
						data-test-id="workflow-code-copy-button"
						@click="onCopyButtonClick"
					>
						{{ t('assistantChat.copy') }}
					</N8nButton>
				</header>
				<div
					v-n8n-html="renderMarkdown(formattedCodeSnippet).trim()"
					data-test-id="workflow-code-content"
					:class="[$style.snippetContent, $style.renderedContent]"
				></div>
			</div>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.workflowCodeMessage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	word-break: break-word;
}

.codeSnippet {
	position: relative;
	border: var(--border);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	max-height: 400px;
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

.renderedContent {
	p {
		margin: 0;
	}
}
</style>
