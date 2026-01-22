<script setup lang="ts">
import { provide, watch, reactive, onUnmounted, computed } from 'vue';
import { WorkflowStateKey } from '@/app/constants';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import { useCrdtWorkflowState } from '../composables/useCrdtWorkflowState';
import CrdtNodeSettings from './CrdtNodeSettings.vue';
import type { INodeUi } from '@/Interface';
import type { WorkflowNode } from '../types/workflowDocument.types';
import type { Unsubscribe } from '@n8n/crdt';

const selectedNodeId = defineModel<string | null>({
	default: null,
});

const doc = useWorkflowDoc();

// Reactive state container - Vue tracks deep mutations
const state = reactive<{ node: INodeUi | null }>({ node: null });

// Computed for template access
const activeNode = computed(() => state.node);

// Track CRDT subscription for cleanup
let unsubscribeNode: Unsubscribe | null = null;

// Helper to find node ID by name (for workflowState)
function getNodeIdByName(name: string): string | undefined {
	return doc.getNodes().find((n) => n.name === name)?.id;
}

// Convert CRDT WorkflowNode to INodeUi (with reactive parameters and all settings)
function toINodeUi(crdtNode: WorkflowNode): INodeUi {
	return {
		id: crdtNode.id,
		name: crdtNode.name,
		type: crdtNode.type,
		typeVersion: crdtNode.typeVersion,
		position: crdtNode.position,
		parameters: reactive({ ...crdtNode.parameters }), // Make parameters reactive
		disabled: crdtNode.disabled ?? false,
		credentials: {},
		// Node settings (top-level properties)
		alwaysOutputData: crdtNode.alwaysOutputData,
		executeOnce: crdtNode.executeOnce,
		retryOnFail: crdtNode.retryOnFail,
		maxTries: crdtNode.maxTries,
		waitBetweenTries: crdtNode.waitBetweenTries,
		onError: crdtNode.onError,
		notes: crdtNode.notes,
		notesInFlow: crdtNode.notesInFlow,
		color: crdtNode.color,
	} as INodeUi;
}

// Subscribe to ALL node changes (parameters + settings) and apply atomic updates
function subscribeToNode(nodeId: string) {
	// Cleanup previous subscription
	unsubscribeNode?.();
	unsubscribeNode = null;

	if (!nodeId) {
		state.node = null;
		return;
	}

	// Initial build from CRDT
	const crdtNode = doc.findNode(nodeId);
	if (!crdtNode) {
		state.node = null;
		return;
	}
	state.node = toINodeUi(crdtNode);

	// Subscribe to ALL node changes (parameters + settings) - rebuild on any change
	// We rebuild for BOTH local and remote changes because components like AssignmentCollection
	// watch `props.node` reference (not `props.value`), so they need a new object to re-sync
	const nodeCrdtMap = doc.getNodeCrdtMap?.(nodeId);
	if (nodeCrdtMap && 'onDeepChange' in nodeCrdtMap) {
		unsubscribeNode = nodeCrdtMap.onDeepChange(() => {
			if (!state.node) return;
			const crdtNode = doc.findNode(nodeId);
			if (crdtNode) {
				state.node = toINodeUi(crdtNode);
			}
		});
	}
}

// Build activeNode and subscribe when selection changes
watch(
	selectedNodeId,
	(nodeId) => {
		subscribeToNode(nodeId ?? '');
	},
	{ immediate: true },
);

onUnmounted(() => {
	unsubscribeNode?.();
});

// Create and provide CRDT-backed workflow state
const workflowState = useCrdtWorkflowState(doc, getNodeIdByName) as WorkflowState;
provide(WorkflowStateKey, workflowState);

function handleClose() {
	selectedNodeId.value = null;
}
</script>

<template>
	<div v-if="activeNode" :class="$style.panel">
		<CrdtNodeSettings
			:key="selectedNodeId ?? undefined"
			:active-node="activeNode"
			:read-only="false"
			:dragging="false"
			push-ref="crdt"
			:block-u-i="false"
			:executable="false"
			:foreign-credentials="[]"
			@close="handleClose"
		/>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	width: 400px;
	max-height: calc(100vh - 100px);
	overflow: hidden;
	z-index: 100;
	background: var(--color--background);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
}
</style>
