<script setup lang="ts">
import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: ChatUI.GeneratedNodesMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

defineProps<Props>();
</script>

<template>
	<BaseWorkflowMessage
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		next-step="Composing nodes..."
	>
		<template #title>Selected Workflow Nodes</template>
		<ul :class="$style.nodesList">
			<li v-for="node in message.nodes" :key="node">{{ node }}</li>
		</ul>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.nodesList {
	list-style: none;
	margin: 0;
	padding: 0;

	li {
		margin-bottom: var(--spacing-4xs);
		line-height: var(--font-line-height-loose);
		padding-left: var(--spacing-2xs);
		border-left: 2px solid var(--color-primary);
	}
}
</style>
