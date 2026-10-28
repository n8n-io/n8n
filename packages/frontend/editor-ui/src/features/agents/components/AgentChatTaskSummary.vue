<script setup lang="ts">
import { N8nIcon, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { RouteLocationRaw } from 'vue-router';
import AgentMarkdownChunk from './AgentMarkdownChunk.vue';
import AgentChatRetryError from './AgentChatRetryError.vue';

defineProps<{
	content?: string;
	preparing: boolean;
	traceRoute?: RouteLocationRaw;
	retryableError?: boolean;
	retryMessageId?: string;
	retryDisabled?: boolean;
}>();

const emit = defineEmits<{ retry: [messageId: string] }>();
const i18n = useI18n();
</script>

<template>
	<div :class="$style.summary" data-testid="agent-chat-task-summary">
		<AgentChatRetryError
			v-if="retryableError && content"
			:message="content"
			:retry-message-id="retryMessageId"
			:retry-disabled="retryDisabled"
			@retry="emit('retry', $event)"
		/>
		<div v-else-if="content?.trim()" :class="$style.text">
			<AgentMarkdownChunk :source="content" />
		</div>
		<div v-else-if="preparing" :class="$style.preparing" role="status" aria-live="polite">
			<N8nIcon icon="loader-circle" spin size="small" aria-hidden="true" />
			<span>{{ i18n.baseText('agents.chat.tasks.summary.preparing') }}</span>
		</div>
		<p v-else :class="$style.fallback">{{ i18n.baseText('agents.chat.tasks.summary.empty') }}</p>
		<div v-if="traceRoute" :class="$style.links">
			<N8nLink :to="traceRoute" theme="text" size="small" underline>
				{{ i18n.baseText('agents.chat.plan.viewTrace') }}
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.summary {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	overflow-wrap: anywhere;
}

.preparing {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--text-color--subtle);
}

.text {
	--n8n-markdown--base-font-size: var(--font-size--sm);

	> *:first-child > *:first-child {
		margin-top: 0;
	}

	> *:last-child > *:last-child {
		margin-bottom: 0;
	}
}

.fallback {
	margin: 0;
}

.links {
	border-top: var(--border-width) dashed var(--border-color--subtle);
	padding-top: var(--spacing--2xs);
}
</style>
