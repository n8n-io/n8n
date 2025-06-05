<script setup lang="ts">
import { useI18n } from '@n8n/design-system/composables/useI18n';

import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: ChatUI.WorkflowStepMessage & { id: string; read: boolean };
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
	<BaseWorkflowMessage
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		:next-step="t('assistantChat.builder.selectingNodes')"
	>
		<template #title>{{ t('assistantChat.builder.generatedNodes') }}</template>
		<ol :class="$style.stepsList">
			<li v-for="step in message.steps" :key="step">{{ step }}</li>
		</ol>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.stepsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
	list-style-position: outside;
	margin: 0;
	padding: 0 0 0 var(--spacing-s);

	li {
		color: var(--color-text-base);
		line-height: var(--font-line-height-loose);
	}
}
</style>
