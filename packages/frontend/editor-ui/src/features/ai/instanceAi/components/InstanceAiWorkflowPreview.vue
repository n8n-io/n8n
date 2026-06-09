<script lang="ts" setup>
import { computed, onBeforeUnmount, provide, useTemplateRef } from 'vue';
import WorkflowCanvasHost from '@/app/components/WorkflowCanvasHost.vue';
import { EditorExternalReadOnlyKey } from '@/app/constants/injectionKeys';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { isAgentEditingWorkflow } from '../canvasPreview.utils';
import { IS_FIX_WITH_AI_OFFER_ENABLED, type FixWithAiError } from '../fixWithAi';
import { useThread } from '../instanceAi.store';

export interface WorkflowFailuresReport {
	workflowId: string;
	executionId: string;
	errors: FixWithAiError[];
}

const props = withDefaults(
	defineProps<{
		workflowId: string;
		/** Incremented to force re-init even when workflowId stays the same (e.g. workflow was modified). */
		refreshKey?: number;
	}>(),
	{ refreshKey: 0 },
);

const emit = defineEmits<{
	'workflow-failures': [report: WorkflowFailuresReport];
}>();

const hostRef = useTemplateRef<InstanceType<typeof WorkflowCanvasHost>>('host');

function requestFitView() {
	hostRef.value?.requestFitView();
}

defineExpose({ requestFitView });

// === Artifact-context push listeners ===
// Registered here (in the AI-aware wrapper) rather than inside the generic
// WorkflowCanvasHost so the host stays decoupled from instance-ai concerns.
// This wrapper's setup runs before the host body's, which runs before
// MainHeader's onBeforeMount registers the global push handler — so our
// listener fires first, which is required for the activeExecutionId reset
// below to take effect before the global executionStarted handler reads it.
const pushStore = usePushConnectionStore();

// Reset activeExecutionId to null on every executionStarted for the displayed
// workflow. The global executionStarted handler only enters its needsInit
// branch (which calls promotePendingExecution and re-points activeExecutionId
// at the new run) when activeExecutionId is null/undefined or we're in an
// iframe. Without this reset, agent-triggered runs after the first one keep
// activeExecutionId stuck on the previous run's id, so nodeExecuteAfter
// writes land in the wrong store: previous-run errors persist on the canvas
// and post-Wait events never paint.
const removeExecutionStartedListener = pushStore.addEventListener((event) => {
	if (event.type !== 'executionStarted') return;
	if (event.data.workflowId !== props.workflowId) return;
	useWorkflowExecutionStateStore(createWorkflowDocumentId(props.workflowId)).setActiveExecutionId(
		null,
	);
});

// On executionFinished with errors, surface a structured failures report so
// InstanceAiThreadView can offer "Fix with AI". This used to come via
// postMessage from the iframe (useReportWorkflowFailuresToParent); now we
// read the per-execution data store directly.
const removeExecutionFinishedListener = pushStore.addEventListener((event) => {
	if (event.type !== 'executionFinished') return;
	if (event.data.workflowId !== props.workflowId) return;
	if (event.data.status === 'success') return;
	// Only offer "Fix with AI" for human-initiated runs. When the agent ran the
	// workflow itself (source 'instance_ai'), it already sees the errors in its
	// tool result and fixes them on its own.
	if (event.data.source === 'instance_ai') return;

	const execStore = useExecutionDataStore(createExecutionDataId(event.data.executionId));
	const runData = execStore.executionRunData;
	if (!runData) return;

	const errors: FixWithAiError[] = [];
	for (const [nodeName, tasks] of Object.entries(runData)) {
		const error = tasks?.at(-1)?.error;
		if (!error) continue;
		const description = error.description ? ` (${error.description})` : '';
		errors.push({
			nodeName,
			errorMessage: `${error.message ?? 'Unknown error'}${description}`,
		});
	}
	if (errors.length === 0) return;
	if (!IS_FIX_WITH_AI_OFFER_ENABLED) return;

	emit('workflow-failures', {
		workflowId: event.data.workflowId,
		executionId: event.data.executionId,
		errors,
	});
});

onBeforeUnmount(() => {
	removeExecutionStartedListener();
	removeExecutionFinishedListener();
});

// === Editing lock ===
// Lock the artifact's editor while the agent is actively mutating THIS
// workflow, so the user can't drag nodes into a mid-stream conflict.
// `isAgentEditingWorkflow` defines the signals that trigger the lock.
const thread = useThread();

const isAgentEditingThisWorkflow = computed(() => {
	for (const message of thread.messages) {
		if (!message.agentTree) continue;
		if (isAgentEditingWorkflow(message.agentTree, props.workflowId)) return true;
	}
	return false;
});

// Surface the signal to NodeView as an external read-only source. NodeView's
// own isCanvasReadOnly check ORs this in alongside its existing signals
// (permissions, archive, collab, etc.), so the canvas + chrome use their
// native read-only rendering instead of a separate overlay.
provide(EditorExternalReadOnlyKey, isAgentEditingThisWorkflow);
</script>

<template>
	<div :class="$style.content">
		<WorkflowCanvasHost ref="host" :workflow-id="workflowId" :refresh-key="refreshKey" />
	</div>
</template>

<style lang="scss" module>
.content {
	flex: 1;
	min-height: 0;
	position: relative;
	height: 100%;
}
</style>
