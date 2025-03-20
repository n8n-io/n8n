<script setup lang="ts">
import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: ChatUI.ComposedNodesMessage & { id: string; read: boolean };
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
		next-step="Generating final workflow..."
	>
		<template #title>Composed Workflow Nodes</template>
		<div :class="$style.nodesList">
			<div v-for="node in message.nodes" :key="node.name" :class="$style.node">
				<div :class="$style.nodeName">{{ node.name }}</div>
				<div :class="$style.nodeType">{{ node.type }}</div>
			</div>
		</div>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.nodesList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.node {
	padding: var(--spacing-4xs) var(--spacing-2xs);
	background-color: var(--color-background-base);
	border-radius: var(--border-radius-base);
}

.nodeName {
	font-weight: var(--font-weight-bold);
	margin-bottom: var(--spacing-4xs);
}

.nodeType {
	font-size: var(--font-size-3xs);
	color: var(--color-text-light);
}
</style>
