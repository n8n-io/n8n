<script lang="ts" setup>
import { computed, onBeforeUnmount, provide, useTemplateRef } from 'vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { nodeIssuesToString, type IRunData } from 'n8n-workflow';
import WorkflowCanvasHost from '@/app/components/WorkflowCanvasHost.vue';
import {
	EditorEnabledFeaturesKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
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
// postMessage from the iframe (useReportWorkflowFailuresToParent); now we read
// the per-execution data directly.

function collectNodeErrors(runData: IRunData | null | undefined): FixWithAiError[] {
	const errors: FixWithAiError[] = [];
	for (const [nodeName, tasks] of Object.entries(runData ?? {})) {
		const error = tasks?.at(-1)?.error;
		if (!error) continue;
		const description = error.description ? ` (${error.description})` : '';
		errors.push({ nodeName, errorMessage: `${error.message ?? 'Unknown error'}${description}` });
	}
	return errors;
}

// A pre-execution validation abort ("The 'X' node has issues — Parameter Y
// required") executes no nodes, so it leaves no live error. But the FE has
// already validated the workflow with the same NodeHelpers the backend aborts
// on, so the failing node's issues are already on the document store — read
// them synchronously instead of round-tripping for the execution.
function collectValidationIssues(workflowId: string): FixWithAiError[] {
	const docStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
	const errors: FixWithAiError[] = [];
	for (const node of docStore.allNodes) {
		if (!node.issues) continue;
		const messages = nodeIssuesToString(node.issues, node);
		if (messages.length === 0) continue;
		errors.push({ nodeName: node.name, errorMessage: messages.join(' ') });
	}
	return errors;
}

function reportWorkflowFailures(executionId: string, workflowId: string) {
	// Node-level runtime errors stream into the store live during the run, so
	// they're already present when it finishes.
	const execStore = useExecutionDataStore(createExecutionDataId(executionId));
	let errors = collectNodeErrors(execStore.executionRunData);

	// A pre-execution validation abort runs no nodes, so there's no live error —
	// but the FE has already validated the workflow, so read the failing node's
	// issues straight from the document store (see collectValidationIssues).
	if (errors.length === 0) {
		errors = collectValidationIssues(workflowId);
	}

	if (errors.length === 0) return;
	emit('workflow-failures', { workflowId, executionId, errors });
}

const removeExecutionFinishedListener = pushStore.addEventListener((event) => {
	if (event.type !== 'executionFinished') return;
	if (event.data.workflowId !== props.workflowId) return;
	if (event.data.status === 'success') return;
	// Only offer "Fix with AI" for human-initiated runs. When the agent ran the
	// workflow itself (source 'instance_ai'), it already sees the errors in its
	// tool result and fixes them on its own.
	if (event.data.source === 'instance_ai') return;
	reportWorkflowFailures(event.data.executionId, event.data.workflowId);
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

// Per-editor host overrides for the embedded editor. Instance AI supersedes the
// standalone AI helpers (`false`), forces the canvas read-only while a
// workflow-builder agent is mutating this workflow, and suppresses workflow
// execution result toasts (success + error) — the agent surfaces run outcomes
// in the thread UI, so the canvas would only duplicate them. NodeView derives
// its read-only state from these via useEditorContext(); usePushConnection
// reads the toast flags to gate execution result notifications.
const enabledFeatures = computed<EditorEnabledFeatures>(() => ({
	aiAssistant: false,
	aiBuilder: false,
	askAi: false,
	readOnly: isAgentEditingThisWorkflow.value,
	executionSuccessToasts: false,
	executionErrorToasts: false,
}));
provide(EditorEnabledFeaturesKey, enabledFeatures);
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
