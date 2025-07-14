<script setup lang="ts">
import { useI18n } from '@n8n/design-system/composables/useI18n';

import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: ChatUI.WorkflowComposedMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}
const { t } = useI18n();
defineProps<Props>();
</script>

<template>
	<BaseWorkflowMessage
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		:next-step="t('assistantChat.builder.generatingFinalWorkflow')"
	>
		<template #title>{{ t('assistantChat.builder.configuredNodes') }}</template>
		<ol :class="$style.nodesList">
			<li v-for="node in message.nodes" :key="node.name" :class="$style.node">
				<div :class="$style.nodeName">{{ node.name }}</div>
			</li>
		</ol>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.nodesList {
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

.nodeType {
	font-size: var(--font-size-3xs);
	color: var(--color-text-light);
}
</style>
