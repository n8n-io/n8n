<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, provide, shallowRef, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import NodeView from '@/app/views/NodeView.vue';
import type { IWorkflowDb, INodeUi } from '@/Interface';
import type { IWorkflowTemplate } from '@n8n/rest-api-client/api/templates';
import {
	EditorEnabledFeaturesKey,
	WorkflowDocumentStoreKey,
	WorkflowIdKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import { useWorkflowNormalization } from '@/app/composables/useWorkflowNormalization';
import { assignNodeId } from '@/app/utils/nodes/nodeTransforms';
import {
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

const props = defineProps<{
	/**
	 * Synthetic document id this preview is keyed by — never `{id}@latest`,
	 * so the preview can never collide with the editor's document store.
	 * Construct via `createWorkflowDocumentId(workflowId, <version token>)`.
	 */
	documentId: WorkflowDocumentId;
	workflow: IWorkflowDb | IWorkflowTemplate['workflow'];
}>();

const { normalizeWorkflowData } = useWorkflowNormalization();

const documentStore = shallowRef<WorkflowDocumentStore | null>(null);

// Scope every injection-aware consumer in this subtree (NodeView/canvas
// render data, NDV) to the preview's stores. Nothing in this setup injects
// these keys, so providing and rendering live in one component.
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

function disposePreviewStores() {
	const scopedDocumentStore = documentStore.value;
	if (!scopedDocumentStore) {
		return;
	}
	const documentId = scopedDocumentStore.documentId;
	documentStore.value = null;
	// NDV store first: its setup instantiates the document and execution-state
	// stores for its id, so disposing it afterwards would re-create what was
	// just removed.
	disposeNDVStore(useNDVStore(documentId));
	disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(documentId));
	disposeWorkflowDocumentStore(scopedDocumentStore);
}

async function hydratePreview() {
	// Tear down any previously hydrated scope before (re)hydrating, so a new
	// workflow never renders over a prior preview's NDV/execution-state stores —
	// including when the document id is unchanged.
	if (documentStore.value) {
		disposePreviewStores();
	}

	const [workflowIdFromDocumentId, version] = props.documentId.split('@');
	const scopedDocumentStore = useWorkflowDocumentStore(props.documentId);
	// Template workflow nodes have no canvas node ids — assign them, same as
	// the workflow import path does. The cast is safe once an id is ensured;
	// remaining template-node differences (e.g. legacy credential format) are
	// handled gracefully by normalization.
	const previewNodes = (props.workflow.nodes ?? []).map((node) => {
		const previewNode = { ...node } as INodeUi;
		if (!previewNode.id) {
			assignNodeId(previewNode);
		}
		return previewNode;
	});
	const { nodes, connections } = normalizeWorkflowData({
		nodes: previewNodes,
		connections: props.workflow.connections ?? {},
	});

	scopedDocumentStore.hydrate({
		name: '',
		active: false,
		isArchived: false,
		createdAt: '',
		updatedAt: '',
		...props.workflow,
		id: workflowIdFromDocumentId,
		versionId: version,
		nodes,
		connections,
	} as IWorkflowDb);

	documentStore.value = scopedDocumentStore;

	// Wait for NodeView/canvas to mount (first hydrate) before requesting fit.
	await nextTick();
	canvasEventBus.emit('fitView');
}

watch(() => [props.documentId, props.workflow] as const, hydratePreview, { immediate: true });

onBeforeUnmount(() => {
	disposePreviewStores();
});

const isReady = computed(() => documentStore.value !== null);
</script>

<template>
	<div :class="$style.host" data-test-id="workflow-preview-host">
		<NodeView v-if="isReady" />
		<div v-else :class="$style.centerState">
			<N8nIcon icon="loader-circle" :size="80" spin />
		</div>
	</div>
</template>

<style lang="scss" module>
.host {
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	min-height: 0;
}

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	flex: 1;
	min-height: 0;
}
</style>
