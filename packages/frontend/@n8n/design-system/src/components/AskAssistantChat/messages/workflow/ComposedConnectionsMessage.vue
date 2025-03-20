<script setup lang="ts">
import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: ChatUI.ComposedConnectionsMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

defineProps<Props>();
</script>

<template>
	<BaseWorkflowMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<template #icon>
			<n8n-icon icon="network" size="medium" />
		</template>
		<template #title> Composed Workflow Connections </template>
		<div :class="$style.connections">
			<div
				v-for="(node, index) in message.workflowJSON.nodes"
				:key="node.name"
				:class="$style.node"
			>
				<div :class="$style.nodeInfo">
					<span :class="$style.nodeNumber">{{ index + 1 }}</span>
					<span :class="$style.nodeName">{{ node.name }}</span>
				</div>
				<div v-if="message.workflowJSON.connections[node.name]" :class="$style.nodeConnections">
					<div
						v-for="(connection, connIndex) in message.workflowJSON.connections[node.name].main"
						:key="connIndex"
					>
						<n8n-icon icon="arrow-right" size="xsmall" />
						<span>{{ connection[0]?.node }}</span>
					</div>
				</div>
			</div>
		</div>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.connections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.node {
	padding: var(--spacing-4xs) var(--spacing-2xs);
	background-color: var(--color-background-base);
	border-radius: var(--border-radius-base);
}

.nodeInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	margin-bottom: var(--spacing-4xs);
}

.nodeNumber {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	background-color: var(--color-primary);
	color: var(--color-foreground-xlight);
	border-radius: 50%;
	font-size: var(--font-size-3xs);
}

.nodeName {
	font-weight: var(--font-weight-bold);
}

.nodeConnections {
	padding-left: var(--spacing-l);
	font-size: var(--font-size-3xs);
	color: var(--color-text-light);

	> div {
		display: flex;
		align-items: center;
		gap: var(--spacing-4xs);
	}
}
</style>
