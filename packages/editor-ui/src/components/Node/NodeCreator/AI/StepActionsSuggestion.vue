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

interface SuggestedActionConnection {
	id: string;
	node: string;
	actionKey: string;
	inputActions: string[];
	outputActions: string[];
}
interface Action {
	actionKey: string;
	description: string;
	displayName: string;
	node: string;
	inputs: number;
	outputs: number;
}

const { fetchActionsComposition, matchString, selectRelevantActions } = useAI();
const isLoading = computed(() => useAI().isLoading);

const mappedActions = computed(() => {
	const matchedActions = useAI().suggestedNodes.flatMap((n) => {
		const nodeActions = useAI().parsedActions.filter((a) => {
			const matchesNode = matchString(a.node, n.node, true);

			return matchesNode;
		});

		const relevantActions = selectRelevantActions(n.explainWhy, nodeActions, 5);

		return relevantActions.map((a) => ({
			node: a.node,
			actionKey: a.actionKey,
			description: a.description,
			displayName: a.displayName,
			nodeType: mappedNodeTypes.value.find((n) => n.node === a.node)?.nodeType,
		}));
	});
	// Only keep unique actions by actionKey
	const uniqueActions = matchedActions.filter(
		(action, index, self) => index === self.findIndex((t) => t.actionKey === action.actionKey),
	);

	return uniqueActions;
});
const mappedNodeTypes = computed(() => {
	const nodes = useAI().suggestedNodes;
	const visibleNodeTypes = useNodeTypesStore().visibleNodeTypes;

	return nodes.map((node: SuggestedNode) => {
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

async function onSubmit() {
	await fetchActionsComposition();
	emit('next');
}
</script>

<template>
	<div :class="$style.container">
		<p>Based on the nodes AI recommended, these are actions that our vector search returned</p>
		<div :class="$style.nodes">
			<n8n-node-creator-node
				v-for="(node, i) in mappedActions"
				:key="`${node.node}_${i}`"
				:draggable="false"
				:description="node?.description || node?.nodeType?.description"
				:class="$style.actionItem"
				:title="node?.displayName || node?.nodeType?.displayName"
				:show-action-arrow="false"
				:is-trigger="node?.nodeType?.group.includes('trigger')"
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
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	overflow-y: auto;
	gap: 5px;
}
.controls {
	display: flex;
	justify-content: flex-end;
}

.actionItem {
	--node-creator-name-size: var(--font-size-2xs);
	--node-creator-name-weight: var(--font-weight-normal);
	--trigger-icon-background-color: #{$trigger-icon-background-color};
	--trigger-icon-border-color: #{$trigger-icon-border-color};
	--node-icon-size: 20px;
	--node-icon-margin-right: var(--spacing-xs);

	padding: var(--spacing-2xs) 0;
	width: 100%;
}
</style>
