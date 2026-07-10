<script lang="ts" setup>
import { computed, provide, useTemplateRef } from 'vue';
import { nodeIssuesToString, type IRunData } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import WorkflowCanvasHost from '@/app/components/WorkflowCanvasHost.vue';
import {
	EditorEnabledFeaturesKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import {
	InstanceAiEditorCapabilityKey,
	type InstanceAiEditorCapability,
} from '@/app/composables/useInstanceAiEditorCapability';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { isAgentEditingWorkflow, type ExecutionResult } from '../canvasPreview.utils';
import { buildInstanceAiArtifactCredentialQuestion } from '../composables/useInstanceAiHandoff';
import { useInstanceAiWorkflowPreviewExecution } from '../composables/useInstanceAiWorkflowPreviewExecution';
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
		/** Latest completed execution produced by the agent for this workflow. */
		executionResult?: ExecutionResult;
	}>(),
	{ refreshKey: 0, executionResult: undefined },
);

const emit = defineEmits<{
	'workflow-failures': [report: WorkflowFailuresReport];
}>();

const hostRef = useTemplateRef<InstanceType<typeof WorkflowCanvasHost>>('host');

function requestFitView() {
	hostRef.value?.requestFitView();
}

defineExpose({ requestFitView });

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

const { restoreExecutionResult } = useInstanceAiWorkflowPreviewExecution({
	workflowId: () => props.workflowId,
	executionResult: () => props.executionResult,
	reportWorkflowFailures,
});

// === Editing lock ===
// Lock the artifact's editor while the agent is actively mutating THIS
// workflow, so the user can't drag nodes into a mid-stream conflict.
// `isAgentEditingWorkflow` defines the signals that trigger the lock.
const thread = useThread();

// The workflow + execution the editor handed off, applied once when this
// preview first opens. Consumed (cleared) here, so it never re-applies on a
// later reload or re-open — it only reflects the redirect. Both snapshots are
// passed to the canvas host, which opens/seeds them directly (no refetch).
const handoff = thread.consumePendingHandoff(props.workflowId);
const initialWorkflow = handoff?.workflow;
const initialExecution = handoff?.execution;

const isAgentEditingThisWorkflow = computed(() => {
	for (const message of thread.messages) {
		if (!message.agentTree) continue;
		if (isAgentEditingWorkflow(message.agentTree, props.workflowId)) return true;
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

const rootStore = useRootStore();

// The artifact already lives inside an Instance AI thread, so its entry points
// append guidance to that conversation rather than opening a new one. It offers
// only `openCredential` — `openWorkflow` is omitted because the workflow is
// already the thread's subject, which hides the editor hand-off button here.
const instanceAiCapability: InstanceAiEditorCapability = {
	openCredential: async (credential) => {
		void thread.sendMessage(
			buildInstanceAiArtifactCredentialQuestion(credential),
			undefined,
			rootStore.pushRef,
		);
		// Appends to the current thread → close the modal so the conversation shows.
		return true;
	},
};
provide(InstanceAiEditorCapabilityKey, instanceAiCapability);
</script>

<template>
	<div :class="$style.content">
		<WorkflowCanvasHost
			ref="host"
			:workflow-id="workflowId"
			:refresh-key="refreshKey"
			:initial-workflow="initialWorkflow"
			:initial-execution="initialExecution"
			@workflow-loaded="restoreExecutionResult"
		/>
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
