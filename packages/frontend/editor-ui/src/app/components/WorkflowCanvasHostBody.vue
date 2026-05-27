<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, provide, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { injectStrict } from '@/app/utils/injectStrict';
import {
	NDVStoreKey,
	WorkflowDocumentStoreKey,
	WorkflowStateKey,
} from '@/app/constants/injectionKeys';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import MainHeader from '@/app/components/MainHeader/MainHeader.vue';
import NodeView from '@/app/views/NodeView.vue';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useCanvasStore } from '@/app/stores/canvas.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';

const props = defineProps<{
	workflowId: string;
	refreshKey: number;
}>();

const emit = defineEmits<{
	ready: [];
	'workflow-loaded': [workflowId: string];
}>();

// Inject the host's scoped provides. Workflow id / state / document store all
// resolve to the host's local refs, not the app-level globals.
const workflowState = injectStrict(WorkflowStateKey);
const currentWorkflowDocumentStore = injectStrict(WorkflowDocumentStoreKey);

const canvasStore = useCanvasStore();
const nodeCreatorStore = useNodeCreatorStore();
const workflowSaveStore = useWorkflowSaveStore();

const { isLoading, currentNDVStore, initializeData, initializeWorkflow, cleanup } =
	useWorkflowInitialization(workflowState);

// NOTE: push-connection handlers (executionStarted, nodeExecuteAfter, etc.) are
// initialized today via MainHeader's onBeforeMount calling
// usePushConnection({ router }).initialize(). Because MainHeader is rendered
// inside this host, the artifact gets push handlers for free. If MainHeader
// were ever omitted from this body (e.g. a slimmer artifact header), execution
// events would silently stop landing on the canvas. Calling initialize() here
// would double-register the listener and double-process every event.
// Decoupling push init from MainHeader is a follow-up.

// NodeView's children (NDV, FocusSidebar, etc.) inject this. We bridge the
// composable's internal ref through provide so descendants see the same
// store the init flow writes to.
provide(NDVStoreKey, currentNDVStore);

async function loadWorkflow(force: boolean) {
	await initializeWorkflow(force);
	if (currentWorkflowDocumentStore.value) {
		emit('workflow-loaded', props.workflowId);
	}
}

onMounted(async () => {
	await initializeData();
	await loadWorkflow(false);
	emit('ready');
});

watch(
	() => [props.workflowId, props.refreshKey] as const,
	async () => {
		await loadWorkflow(true);
	},
);

onBeforeUnmount(() => {
	cleanup();

	// Reset global singletons that hold per-workflow state and don't otherwise
	// clear on unmount. Without these, the next editor mount (e.g. navigating
	// back to /workflow/X after closing the artifact) sees stale state from
	// this artifact session — most user-visibly stuck node-creator-open hints,
	// stale range-selection mode, and lingering autosave state.
	nodeCreatorStore.isCreateNodeActive = false;
	canvasStore.setHasRangeSelection(false);
	canvasStore.newNodeInsertPosition = null;
	workflowSaveStore.reset();
});

function requestFitView() {
	canvasEventBus.emit('fitView');
}

defineExpose({ requestFitView });

const isReady = computed(() => !isLoading.value && !!currentWorkflowDocumentStore.value);
</script>

<template>
	<div :class="$style.host" data-test-id="workflow-canvas-host">
		<template v-if="isReady">
			<MainHeader :class="$style.header" />
			<div :class="$style.canvas">
				<NodeView />
			</div>
			<LogsPanel :class="$style.logs" />
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

.header {
	flex-shrink: 0;
}

.canvas {
	flex: 1;
	min-height: 0;
	display: flex;
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
