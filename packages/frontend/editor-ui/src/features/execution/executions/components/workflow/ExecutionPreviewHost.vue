<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import NodeView from '@/app/views/NodeView.vue';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import {
	EditorEnabledFeaturesKey,
	WorkflowDocumentStoreKey,
	WorkflowIdKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import { useExecutionPreviewDocument } from '@/features/execution/executions/composables/useExecutionPreviewDocument';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

const props = defineProps<{
	workflowId: string;
	executionId: string;
	nodeId?: string;
}>();

// These provides scope every injection-aware consumer in this subtree
// (NodeView/canvas render data, NDV, logs) to the preview's isolated stores.
// Unlike WorkflowCanvasHost — whose body composables inject the host's own
// provides and therefore need an outer/body split — nothing in this setup
// injects these keys, so providing and rendering live in one component.
provide(
	WorkflowIdKey,
	computed(() => props.workflowId),
);

const preview = useExecutionPreviewDocument({ executionId: () => props.executionId });
provide(WorkflowDocumentStoreKey, preview.documentStore);

// Mirrors the old iframe knobs: the preview is always read-only, AI editing
// affordances are superseded, and execution result toasts are owned by the
// preview itself (the loader surfaces failed-execution toasts on open).
provide(
	EditorEnabledFeaturesKey,
	computed<EditorEnabledFeatures>(() => ({
		readOnly: true,
		aiAssistant: false,
		aiBuilder: false,
		askAi: false,
		executionSuccessToasts: false,
		executionErrorToasts: false,
	})),
);

const isReady = computed(() => preview.documentStore.value !== null);
const hasExecutionData = computed(() => preview.execution.value !== null);

function openDeepLinkedNode() {
	const documentStore = preview.documentStore.value;
	if (!documentStore || !props.nodeId) {
		return;
	}
	const node = documentStore.getNodeById(props.nodeId);
	if (node) {
		useNDVStore(documentStore.documentId).setActiveNodeName(node.name, 'other');
	}
}

async function loadExecution() {
	// Parity with the iframe (which was recreated per execution): close any
	// open NDV before swapping the displayed execution.
	const previousDocumentId = preview.documentStore.value?.documentId;
	if (previousDocumentId) {
		useNDVStore(previousDocumentId).unsetActiveNodeName();
	}

	await preview.load();

	if (!preview.documentStore.value) {
		return;
	}

	openDeepLinkedNode();

	// Wait for NodeView/canvas to mount (first load) before requesting fit.
	await nextTick();
	canvasEventBus.emit('fitView');
}

onMounted(loadExecution);
watch(() => props.executionId, loadExecution);
watch(() => props.nodeId, openDeepLinkedNode);

onBeforeUnmount(() => {
	preview.dispose();
});
</script>

<template>
	<div :class="$style.host" data-test-id="execution-preview-host">
		<template v-if="isReady">
			<div :class="$style.canvas">
				<NodeView />
				<div v-if="preview.isLoading.value" :class="$style.loadingOverlay">
					<N8nIcon icon="loader-circle" :size="48" spin />
				</div>
			</div>
			<LogsPanel v-if="hasExecutionData" :class="$style.logs" :is-read-only="true" />
		</template>
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
	flex-direction: column;
	min-height: 0;
}

.canvas {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
}

.loadingOverlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--canvas--color--background);
	opacity: 0.75;
}

.logs {
	flex-shrink: 0;
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
