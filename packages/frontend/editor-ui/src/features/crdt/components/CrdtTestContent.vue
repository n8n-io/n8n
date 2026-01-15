<script lang="ts" setup>
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeCreation from '@/features/shared/nodeCreator/views/NodeCreation.vue';
import type { AddedNodesAndConnections, INodeUi, ToggleNodeCreatorOptions } from '@/Interface';
import { useVueFlow } from '@vue-flow/core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ref } from 'vue';
import { useWorkflowAwareness } from '../composables/useWorkflowAwareness';
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import type { WorkflowNode } from '../types/workflowDocument.types';
import CrdtParameterTestPanel from './CrdtParameterTestPanel.vue';
import WorkflowCanvas from './WorkflowCanvas.vue';

const doc = useWorkflowDoc();
const awareness = useWorkflowAwareness({ awareness: doc.awareness });
const instance = useVueFlow(doc.workflowId);
const selectedNode = ref<string | null>(null);

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

instance.onNodeDoubleClick(({ event, node }) => {
	selectedNode.value = node.id;
	// console.log('Node double-clicked:', event, node);
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.toolbar">
			<button :disabled="!doc.canUndo.value" :class="$style.button" @click="doc.undo()">
				Undo
			</button>
			<button :disabled="!doc.canRedo.value" :class="$style.button" @click="doc.redo()">
				Redo
			</button>
			<span v-if="awareness.isReady.value" :class="$style.collaborators">
				{{ awareness.collaboratorCount.value }} online
			</span>
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
		<CrdtParameterTestPanel v-if="doc.isReady.value" v-model="selectedNode" />
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	width: 100%;
	height: 100%;
}

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

.collaborators {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius);
	background: var(--color--success--tint-2);
	color: var(--color--success--shade-1);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}
</style>
