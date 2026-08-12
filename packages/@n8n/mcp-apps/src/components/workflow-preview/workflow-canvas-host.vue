<script setup lang="ts">
import { useWorkflowNormalization } from '@/app/composables/useWorkflowNormalization';
import {
	EditorEnabledFeaturesKey,
	WorkflowDocumentStoreKey,
	WorkflowIdKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { assignNodeId } from '@/app/utils/nodes/nodeTransforms';
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { useVueFlow } from '@vue-flow/core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, nextTick, onBeforeUnmount, provide, shallowRef, watch } from 'vue';

import type {
	WorkflowPreviewData,
	WorkflowPreviewNodeType,
} from '@mcp-apps/apps/workflow-preview/types';

/**
 * Renders the n8n editor workflow canvas directly (no iframe), scoped to a
 * synthetic, read-only workflow document store — the same host pattern used
 * by editor-ui's `WorkflowPreviewHost.vue`, minus `NodeView`.
 *
 * `nodeTypes` should contain the (trimmed) node type descriptions for the
 * node types used in the workflow; without them nodes still render, but
 * connection handles, icons, and subtitles are unavailable.
 *
 * This component is the trust boundary between the loosely-typed data
 * received over MCP (validated by the workflow-preview type guards) and the
 * editor-ui component tree, which expects editor types (`INodeUi`,
 * `INodeTypeDescription`).
 */
const props = defineProps<{
	workflow: WorkflowPreviewData;
	nodeTypes?: Array<WorkflowPreviewNodeType | INodeTypeDescription>;
}>();

const emit = defineEmits<{
	/** Fired once the canvas has laid out the workflow nodes. */
	ready: [];
	error: [error: unknown];
}>();

const CANVAS_ID = 'mcp-workflow-preview';

const { normalizeWorkflowData } = useWorkflowNormalization();
const nodeTypesStore = useNodeTypesStore();

const documentStore = shallowRef<WorkflowDocumentStore | null>(null);

// Creating the vue-flow state here (same id as the canvas below) lets the
// host observe node initialization to signal readiness.
const { onNodesInitialized } = useVueFlow(CANVAS_ID);
let readyEmitted = false;

function emitReadyOnce() {
	if (readyEmitted) return;
	readyEmitted = true;
	emit('ready');
}

onNodesInitialized(() => {
	emitReadyOnce();
});

// Scope every injection-aware consumer in this subtree to the preview's
// stores, and force read-only behavior on the embedded canvas.
const workflowId = computed(() => documentStore.value?.workflowId ?? '');
provide(WorkflowIdKey, workflowId);
provide(WorkflowDocumentStoreKey, documentStore);
provide(
	EditorEnabledFeaturesKey,
	computed<EditorEnabledFeatures>(() => ({
		readOnly: true,
		expandGroups: 'all',
		aiAssistant: false,
		aiBuilder: false,
		askAi: false,
		executionSuccessToasts: false,
		executionErrorToasts: false,
	})),
);

// Each hydration gets a fresh synthetic version token so the document id can
// never collide with a previous hydration of the same workflow.
let hydrationCounter = 0;

function disposePreviewStores() {
	const scopedDocumentStore = documentStore.value;
	if (!scopedDocumentStore) {
		return;
	}
	const documentId = scopedDocumentStore.documentId;
	documentStore.value = null;
	disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(documentId));
	disposeWorkflowDocumentStore(scopedDocumentStore);
}

function hydratePreview() {
	if (documentStore.value) {
		disposePreviewStores();
	}

	try {
		if (props.nodeTypes?.length) {
			// Trust-boundary cast: the wire shape is guard-validated upstream and
			// mirrors the server's trimmed `INodeTypeDescription` subset.
			nodeTypesStore.setNodeTypes(props.nodeTypes as INodeTypeDescription[]);
		}

		const version = `mcp-preview-${++hydrationCounter}`;
		const documentId = createWorkflowDocumentId(props.workflow.id || 'mcp-preview', version);
		const scopedDocumentStore = useWorkflowDocumentStore(documentId);

		// The sanitized graph from the MCP server may omit canvas node ids —
		// assign them, same as the workflow import path does.
		const previewNodes = (props.workflow.nodes ?? []).map((node) => {
			const previewNode = { ...(node as INodeUi) };
			if (!previewNode.id) {
				assignNodeId(previewNode);
			}
			return previewNode;
		});
		const { nodes, connections } = normalizeWorkflowData({
			nodes: previewNodes,
			connections: (props.workflow.connections ?? {}) as IWorkflowDb['connections'],
		});

		scopedDocumentStore.hydrate({
			name: props.workflow.name ?? '',
			active: false,
			isArchived: false,
			createdAt: '',
			updatedAt: '',
			id: props.workflow.id || 'mcp-preview',
			versionId: version,
			nodes,
			connections,
			settings: props.workflow.settings,
			meta: props.workflow.meta,
		} as IWorkflowDb);

		documentStore.value = scopedDocumentStore;

		// vue-flow never initializes nodes for an empty graph, so signal
		// readiness ourselves once the (empty) canvas has mounted.
		if (nodes.length === 0) {
			void nextTick(() => emitReadyOnce());
		}
	} catch (error) {
		disposePreviewStores();
		emit('error', error);
	}
}

watch(() => props.workflow, hydratePreview, { immediate: true });

onBeforeUnmount(() => {
	disposePreviewStores();
});

const isReady = computed(() => documentStore.value !== null);
</script>

<template>
	<div class="canvas-host">
		<WorkflowCanvas
			v-if="isReady"
			:id="CANVAS_ID"
			read-only
			hide-controls
			:key-bindings="false"
			:show-fallback-nodes="false"
			:striped-background="false"
			group-expansion-mode="all"
		/>
	</div>
</template>

<style scoped lang="scss">
.canvas-host {
	position: relative;
	display: flex;
	width: 100%;
	height: 100%;
	min-height: 0;
}
</style>
