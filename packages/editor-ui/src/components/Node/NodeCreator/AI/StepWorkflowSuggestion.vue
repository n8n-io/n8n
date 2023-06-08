<script setup lang="ts">
/*
	eslint-disable unused-imports/no-unused-imports
*/
import { onMounted, ref, computed, getCurrentInstance } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getNodeSuggestionsPrompt, getActionsCompositionPrompt } from './templates';
import { useActions } from '../composables/useActions';
import minifier from 'string-minify';
import { useAI } from './useAI.composable';
import NodeIcon from '@/components/NodeIcon.vue';

const emit = defineEmits(['back', 'next', 'setWorkflow']);
interface SuggestedNode {
	node: string;
	explainWhy: string;
}

interface SuggestedActionConnection {
	id: string;
	node: string;
	actionKey: string;
	inputActions: string[];
	outputActions: string[];
	explainWhy: string;
}
interface Action {
	actionKey: string;
	description: string;
	displayName: string;
	node: string;
	inputs: number;
	outputs: number;
}

// const { visibleNodeTypes, getNodeTypes } = useNodeTypesStore();
const isLoading = computed(() => useAI().isLoading);
const mappedNodeTypes = computed(() => {
	const nodes = useAI().pseudoWorkflow;
	const visibleNodeTypes = useNodeTypesStore().visibleNodeTypes;

	return nodes
		.filter(
			(node) =>
				visibleNodeTypes.find((nodeType) => nodeType.name === `n8n-nodes-base.${node.node}`) !==
				undefined,
		)
		.map((node: SuggestedActionConnection) => {
			const nodeType = visibleNodeTypes.find(
				(nodeType) => nodeType.name === `n8n-nodes-base.${node.node}`,
			);
			return {
				node: node.node,
				explainWhy: node.explainWhy?.replace(node.node, nodeType?.displayName || node.node),
				nodeType,
			};
		});
});

function onSubmit() {
	emit('setWorkflow');
}
</script>

<template>
	<div :class="$style.container">
		<p>Done! We'll insert following nodes:</p>
		<div :class="$style.nodes">
			<n8n-node-creator-node
				v-for="(node, i) in mappedNodeTypes"
				:key="`${node.node}_${i}`"
				:draggable="false"
				:class="$style.nodeItem"
				:description="node?.explainWhy"
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
			<n8n-button @click="onSubmit" label="Next" type="primary" size="large" :loading="isLoading" />
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
	// gap: 5px;
	overflow-y: auto;
}
.nodeItem {
	width: 100%;
}
.controls {
	display: flex;
	justify-content: flex-end;
}
</style>
