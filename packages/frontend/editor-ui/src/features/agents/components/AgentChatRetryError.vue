<script setup lang="ts">
import { N8nButton, N8nCallout, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	message: string;
	retryMessageId?: string;
	retryDisabled?: boolean;
}>();

const emit = defineEmits<{
	retry: [messageId: string];
}>();
const i18n = useI18n();
</script>

<template>
	<N8nCallout theme="danger" :class="$style.callout" data-testid="agent-chat-retry-error">
		{{ message }}
		<template v-if="retryMessageId" #trailingContent>
			<N8nButton
				size="small"
				variant="subtle"
				:class="$style.retryButton"
				:disabled="retryDisabled"
				data-testid="agent-chat-retry"
				@click="emit('retry', retryMessageId)"
			>
				<template #icon><N8nIcon icon="refresh-cw" size="small" /></template>
				{{ i18n.baseText('agents.chat.retry') }}
			</N8nButton>
		</template>
	</N8nCallout>
</template>

<style module>
.callout {
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.callout > :first-child {
	flex: 1 1 auto;
	min-width: 0;
}

.callout :global(.n8n-text) {
	min-width: 0;
	overflow-wrap: anywhere;
}

.retryButton {
	flex-shrink: 0;
	margin-left: auto;
}
</style>
