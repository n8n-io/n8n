<script lang="ts" setup>
import { computed, onBeforeUnmount, provide, useTemplateRef } from 'vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import WorkflowCanvasHost from '@/app/components/WorkflowCanvasHost.vue';
import { EditorExternalReadOnlyKey } from '@/app/constants/injectionKeys';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { FixWithAiError } from '../fixWithAi';
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
// Lock interaction with the artifact's editor while the agent is actively
// editing THIS workflow. Two signals trigger the lock; either is enough:
//
// 1. A workflow-builder sub-agent is running with `targetResource.id`
//    matching ours. This is the primary signal — it covers the entire build
//    window (read file → edit file → submit-workflow → verify). The
//    orchestrator's `build-workflow-with-agent` tool call returns
//    immediately with a taskId; the actual work happens in the sub-agent.
//
// 2. A workflow-mutating tool call is in flight with `args.workflowId`
//    matching ours. Fallback for direct orchestrator calls that don't
//    spawn a sub-agent (e.g. apply-workflow-credentials, setup-workflow).
//
// Without this, the user can drag nodes around concurrently with the
// agent's mutations, producing mid-stream conflicts.
const thread = useThread();

const WORKFLOW_EDITING_TOOLS = new Set([
	'build-workflow',
	'build-workflow-with-agent',
	'apply-workflow-credentials',
	'setup-workflow',
]);

function nodeIsEditingWorkflow(node: InstanceAiAgentNode, workflowId: string): boolean {
	// Signal 1: workflow-builder sub-agent active with our workflow id
	if (
		node.role === 'workflow-builder' &&
		node.status === 'active' &&
		node.targetResource?.type === 'workflow' &&
		node.targetResource.id === workflowId
	) {
		return true;
	}

	// Signal 2: in-flight workflow-editing tool call targeting our workflow id
	for (const tc of node.toolCalls) {
		if (!tc.isLoading) continue;
		if (!WORKFLOW_EDITING_TOOLS.has(tc.toolName)) continue;
		const args = tc.args as { workflowId?: string } | undefined;
		if (args?.workflowId === workflowId) return true;
	}

	for (const child of node.children) {
		if (nodeIsEditingWorkflow(child, workflowId)) return true;
	}
	return false;
}

const isAgentEditingThisWorkflow = computed(() => {
	for (const message of thread.messages) {
		if (!message.agentTree) continue;
		if (nodeIsEditingWorkflow(message.agentTree, props.workflowId)) return true;
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
