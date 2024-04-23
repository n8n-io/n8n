<template>
	<div :class="$style.container">
		<template v-for="node in nodeTypes" :key="node.name">
			<NodeIcon
				:node-type="node"
				show-tooltip
				tooltip-position="top"
				@click="($e) => onClick($e, node)"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import type { AddedNodesAndConnections } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';

const emit = defineEmits<{
	(event: 'addNode', value: AddedNodesAndConnections): void;
}>();
const props = defineProps<{
	nodeTypes: INodeTypeDescription[];
}>();
function onClick(event: UIEvent, node: INodeTypeDescription) {
	// We wrap the click event in node-icon emit, so to avoid double adding of nodes
	if (event?.type === 'click') return;
	emit('addNode', {
		nodes: [
			{
				type: node.name ?? 'n8n-nodes-base.noOp',
				position: [500, 500],
			},
		],
		connections: [],
	});
}
</script>

<style module lang="scss">
.container {
	display: flex;
	gap: 1rem;
}
</style>
