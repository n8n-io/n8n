<script setup lang="ts">
import { N8nIcon, N8nNodeIcon } from '@n8n/design-system';
import type { AgentVisualizationNode } from './AgentVisualization.types';

defineProps<{ node: AgentVisualizationNode; size?: number }>();
</script>

<template>
	<N8nNodeIcon
		v-if="node.iconSource"
		:type="node.iconSource.type"
		:src="node.iconSource.type === 'file' ? node.iconSource.src : undefined"
		:name="node.iconSource.type === 'icon' ? node.iconSource.name : undefined"
		:color="node.iconSource.type === 'icon' ? node.iconSource.color : undefined"
		:size="size ?? 32"
	/>
	<N8nIcon v-else :icon="node.icon" :size="size ?? 32" />
</template>
