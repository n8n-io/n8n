<script setup lang="ts">
import { useWorkflowNormalization } from '@/app/composables/useWorkflowNormalization';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, nextTick, onErrorCaptured, ref, watch } from 'vue';

import type { WorkflowVersionData } from '@mcp-apps/apps/workflow-diff/types';
import type { WorkflowPreviewNodeType } from '@mcp-apps/apps/workflow-preview/types';
import { useI18n } from '@mcp-apps/i18n';

/**
 * Renders editor-ui's workflow diff view (two synced canvases + change list)
 * for a previous/current version pair received over MCP.
 *
 * Like `workflow-canvas-host.vue`, this is the trust boundary between the
 * loosely-typed wire data (validated by the workflow-diff type guards) and
 * the editor-ui component tree. `WorkflowDiffView` creates and disposes its
 * own scoped document stores per side, so no store providers are needed here.
 */
const props = defineProps<{
	sourceWorkflow: WorkflowVersionData;
	targetWorkflow: WorkflowVersionData;
	workflowName?: string;
	nodeTypes?: Array<WorkflowPreviewNodeType | INodeTypeDescription>;
}>();

const emit = defineEmits<{
	/** Fired once the diff view has been handed renderable workflows. */
	ready: [];
	error: [error: unknown];
}>();

const { t } = useI18n();
const { normalizeWorkflowData } = useWorkflowNormalization();
const nodeTypesStore = useNodeTypesStore();

const source = ref<IWorkflowDb>();
const target = ref<IWorkflowDb>();

function toDiffWorkflow(version: WorkflowVersionData): IWorkflowDb {
	// Trust-boundary cast: guard-validated wire nodes mirror the sanitized
	// editor node shape; normalization assigns ids and materializes parameter
	// defaults (needed by node subtitles and expression-driven ports).
	const { nodes, connections } = normalizeWorkflowData({
		nodes: (version.nodes ?? []) as INodeUi[],
		connections: (version.connections ?? {}) as IWorkflowDb['connections'],
	});

	return {
		id: version.workflowId,
		versionId: version.versionId,
		name: props.workflowName ?? version.name ?? '',
		active: false,
		isArchived: false,
		createdAt: '',
		updatedAt: '',
		nodes,
		connections,
	} as IWorkflowDb;
}

function hydrate() {
	try {
		if (props.nodeTypes?.length) {
			// Trust-boundary cast: see toDiffWorkflow.
			nodeTypesStore.setNodeTypes(props.nodeTypes as INodeTypeDescription[]);
		}

		source.value = toDiffWorkflow(props.sourceWorkflow);
		target.value = toDiffWorkflow(props.targetWorkflow);

		void nextTick(() => emit('ready'));
	} catch (error) {
		source.value = undefined;
		target.value = undefined;
		emit('error', error);
	}
}

watch(() => [props.sourceWorkflow, props.targetWorkflow] as const, hydrate, { immediate: true });

const isReady = computed(() => !!source.value && !!target.value);

// The diff view is a large component subtree; treat any rendering error in it
// as a crash so the app can fall back to the open-workflow card.
onErrorCaptured((error) => {
	emit('error', error);
	return false;
});
</script>

<template>
	<div class="diff-host">
		<WorkflowDiffView
			v-if="isReady"
			:source-workflow="source"
			:target-workflow="target"
			:source-label="t('workflowDiff.label.before')"
			:target-label="t('workflowDiff.label.after')"
		/>
	</div>
</template>

<style scoped lang="scss">
.diff-host {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
}
</style>
