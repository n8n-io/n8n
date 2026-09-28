<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { computed } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { AgentToolConfigData } from './AgentToolConfigContent.vue';

const props = defineProps<{
	data: AgentToolConfigData;
}>();

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => {
	if (props.data.kind === 'registryMcpServer') {
		const nodeTypeName = props.data.mcpServer.metadata?.nodeTypeName;
		return nodeTypeName ? nodeTypesStore.getNodeType(nodeTypeName) : null;
	}
	if (props.data.kind === 'mcpServer') {
		return nodeTypesStore.getNodeType(
			props.data.initialNode.type,
			props.data.initialNode.typeVersion,
		);
	}
	if (props.data.toolRef.type !== 'node') return null;
	return nodeTypesStore.getNodeType(
		props.data.toolRef.node.nodeType,
		props.data.toolRef.node.nodeTypeVersion,
	);
});

const fallbackIcon = computed<IconName | undefined>(() => {
	if (props.data.kind === 'registryMcpServer' || props.data.kind === 'mcpServer') return 'server';
	if (props.data.toolRef.type === 'workflow') return 'workflow';
	if (props.data.toolRef.type === 'custom') return 'code';
	return undefined;
});
</script>

<template>
	<span :class="$style.icon" data-testid="agent-tool-config-title-icon" aria-hidden="true">
		<NodeIcon v-if="nodeType" :node-type="nodeType" :size="24" :circle="true" />
		<N8nIcon v-else-if="fallbackIcon" :icon="fallbackIcon" :size="20" />
	</span>
</template>

<style module lang="scss">
.icon {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	color: var(--color--primary);
}
</style>
