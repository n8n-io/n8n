<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useAI } from './useAI.composable';
import NodeIcon from '@/components/NodeIcon.vue';

const emit = defineEmits(['back', 'next']);
interface SuggestedNode {
	node: string;
	explainWhy: string;
}
const isLoading = computed(() => useAI().isLoading);
const mappedNodeTypes = computed(() => {
	const nodes = useAI().suggestedNodes;
	const visibleNodeTypes = useNodeTypesStore().visibleNodeTypes;

	return nodes
		.filter((node) =>
			visibleNodeTypes.some((nodeType) => nodeType.name === `n8n-nodes-base.${node.node}`),
		)
		.map((node: SuggestedNode) => {
			const nodeType = visibleNodeTypes.find(
				(nodeType) => nodeType.name === `n8n-nodes-base.${node.node}`,
			);
			return {
				node: node.node,
				explainWhy: node.explainWhy.replace(node.node, nodeType?.displayName || node.node),
				nodeType,
			};
		});
});
</script>

<template>
	<div :class="$style.container">
		<p>
			Based on your prompt, these are nodes AI recommends. <br />
			If you think node shouldn't be used, you can unselect it.
		</p>
		<div :class="$style.nodes">
			<n8n-node-creator-node
				v-for="(node, i) in mappedNodeTypes"
				:key="`${node.node}_${i}`"
				:draggable="false"
				:class="$style.nodeItem"
				:description="node.explainWhy"
				:is-trigger="node?.nodeType?.group.includes('trigger')"
				:title="node?.nodeType?.displayName"
				:show-action-arrow="false"
			>
				<template #icon>
					<node-icon :nodeType="node.nodeType" />
				</template>
			</n8n-node-creator-node>
		</div>
		<div :class="$style.controls">
			<n8n-button
				@click="emit('next')"
				label="Next"
				type="primary"
				size="large"
				:loading="isLoading"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: 10px;
	height: 100%;
}
.nodes {
	display: flex;
	flex-wrap: wrap;
	overflow-y: auto;
}
.controls {
	display: flex;
	justify-content: flex-end;
}
</style>
