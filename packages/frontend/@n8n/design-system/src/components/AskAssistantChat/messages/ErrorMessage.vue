<script setup lang="ts">
import BaseMessage from './BaseMessage.vue';
import { useI18n } from '../../../composables/useI18n';
import type { ChatUI } from '../../../types/assistant';

interface Props {
	message: ChatUI.ErrorMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

defineProps<Props>();
const { t } = useI18n();
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.error" data-test-id="chat-message-system">
			<span>⚠️ {{ message.content }}</span>
			<n8n-button
				v-if="message.retry"
				type="secondary"
				size="mini"
				:class="$style.retryButton"
				data-test-id="error-retry-button"
				@click="() => message.retry?.()"
			>
				{{ t('generic.retry') }}
			</n8n-button>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.error {
	color: var(--color-danger);
	display: flex;
	flex-direction: column;
	align-items: start;
}

.retryButton {
	margin-top: var(--spacing-3xs);
}
</style>
