<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/** The "Test chat" line at the top of a safe test chat. After a run it says what was sent. */
const props = defineProps<{
	/** Actions of this chat that ran in the real apps. */
	sentCount: number;
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.subHeader" data-testid="agent-test-chat-sub-header">
		<N8nText tag="p" size="small" bold :class="$style.title">
			{{ i18n.baseText('agents.testRun.subHeader.title') }}
			<N8nIcon icon="flask-conical" size="small" :class="$style.icon" aria-hidden="true" />
		</N8nText>
		<N8nText
			v-if="props.sentCount > 0"
			tag="p"
			size="small"
			color="text-light"
			:class="$style.status"
			aria-live="polite"
			data-testid="agent-test-chat-sent-status"
		>
			<N8nIcon icon="check" size="xsmall" aria-hidden="true" />
			{{
				i18n.baseText('agents.testRun.subHeader.sent', {
					adjustToNumber: props.sentCount,
					interpolate: { count: props.sentCount },
				})
			}}
		</N8nText>
	</div>
</template>

<style module>
.subHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex-shrink: 0;
	margin: 0 var(--spacing--xs);
	/* Lines up with the icon of the chat history button above. */
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

.title,
.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin: 0;
}

.icon {
	color: var(--text-color--subtle);
}
</style>
