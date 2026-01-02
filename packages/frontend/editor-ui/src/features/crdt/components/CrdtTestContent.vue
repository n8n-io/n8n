<script lang="ts" setup>
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeCreation from '@/features/shared/nodeCreator/views/NodeCreation.vue';
import type {
	AddedNodesAndConnections,
	INodeTypeDescription,
	INodeUi,
	ToggleNodeCreatorOptions,
} from '@/Interface';
import { useVueFlow } from '@vue-flow/core';
import { ref } from 'vue';
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import type { WorkflowNode } from '../types/workflowDocument.types';
import WorkflowCanvas from './WorkflowCanvas.vue';

const doc = useWorkflowDoc();
const instance = useVueFlow(doc.workflowId);

// Dummy state for NodeCreation props
const createNodeActive = ref(false);
const nodeViewScale = ref(1);
const focusPanelActive = ref(false);

const nodeTypesStore = useNodeTypesStore();

function requireNodeTypeDescription(
	type: INodeUi['type'],
	version?: INodeUi['typeVersion'],
): INodeTypeDescription {
	const nodeType =
		nodeTypesStore.getNodeType(type, version) ??
		nodeTypesStore.communityNodeType(type)?.nodeDescription;

	if (nodeType) {
		return nodeType;
	}

	// Fallback for unknown node types
	return {
		properties: [],
		displayName: type,
		name: type,
		group: [],
		description: '',
		version: version ?? 1,
		defaults: { name: type },
		inputs: [],
		outputs: [],
	} as INodeTypeDescription;
}

// Dummy handlers that log results
const onToggleNodeCreator = (options: ToggleNodeCreatorOptions) => {
	console.log('Toggle node creator:', options);
	createNodeActive.value = options.createNodeActive ?? !createNodeActive.value;
};

const onAddNodesAndConnections = (payload: AddedNodesAndConnections) => {
	const nodesToAdd: WorkflowNode[] = payload.nodes.map((node, index) => {
		const nodeTypeDescription = requireNodeTypeDescription(node.type, node.typeVersion);

		let typeVersion: number;
		if (node.typeVersion !== undefined) {
			typeVersion = node.typeVersion;
		} else if (Array.isArray(nodeTypeDescription.version)) {
			typeVersion = nodeTypeDescription.version[nodeTypeDescription.version.length - 1];
		} else {
			typeVersion = nodeTypeDescription.version;
		}

		const position: [number, number] = [100 + index * 200, 100];

		const name =
			node.name ??
			(typeof nodeTypeDescription.defaults.name === 'string'
				? nodeTypeDescription.defaults.name
				: nodeTypeDescription.displayName);

		return {
			id: crypto.randomUUID(),
			name,
			type: node.type,
			typeVersion,
			position,
			parameters: {},
		};
	});

	const { off } = instance.onNodesInitialized(() => {
		instance.addSelectedNodes(nodesToAdd.map((node) => instance.findNode(node.id)!));
		instance.nodesSelectionActive.value = true;
		// here
		off();
	});
	doc.addNodes(nodesToAdd);

	createNodeActive.value = false;
};

const onNodeCreatorClose = () => {
	console.log('Node creator closed');
	createNodeActive.value = false;
};
</script>

<template>
	<div :class="$style.toolbar">
		<button :disabled="!doc.canUndo.value" :class="$style.button" @click="doc.undo()">Undo</button>
		<button :disabled="!doc.canRedo.value" :class="$style.button" @click="doc.redo()">Redo</button>
	</div>
	<WorkflowCanvas v-if="doc.isReady.value" />
	<div v-else-if="doc.state.value === 'connecting'" :class="$style.loading">
		Connecting to workflow...
	</div>
	<div v-else-if="doc.state.value === 'error'" :class="$style.error">
		<h2>Error Loading CRDT Workflow</h2>
		<p>{{ doc.error.value }}</p>
	</div>
	<NodeCreation
		:create-node-active="createNodeActive"
		:node-view-scale="nodeViewScale"
		:focus-panel-active="focusPanelActive"
		@toggle-node-creator="onToggleNodeCreator"
		@add-nodes="onAddNodesAndConnections"
		@close="onNodeCreatorClose"
	/>
</template>

<style lang="scss" module>
.toolbar {
	position: absolute;
	top: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 100;
	display: flex;
	gap: var(--spacing--2xs);
}

.button {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover:not(:disabled) {
		background: var(--color--foreground--tint-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	font-size: var(--font-size--lg);
	color: var(--color--text--tint-1);
}

.error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--danger);

	h2 {
		margin-bottom: var(--spacing--sm);
	}
}
</style>
