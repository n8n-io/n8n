<script lang="ts" setup>
import { computed, onBeforeUnmount, useTemplateRef } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import WorkflowCanvasHost from '@/app/components/WorkflowCanvasHost.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
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
	'iframe-ready': [];
	'workflow-loaded': [workflowId: string];
	'workflow-failures': [report: WorkflowFailuresReport];
}>();

const hostRef = useTemplateRef<InstanceType<typeof WorkflowCanvasHost>>('host');

function requestFitView() {
	hostRef.value?.requestFitView();
}

// Kept as a no-op for backwards compatibility with the existing useEventRelay
// wiring in InstanceAiThreadView. The direct-mount host receives push events
// through the shared connection — no postMessage relay is needed.
function relayPushEvent(_event: PushMessage) {
	// no-op
}

defineExpose({ relayPushEvent, requestFitView });

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
	useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(props.workflowId),
	).setActiveExecutionId(null);
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
// editing THIS workflow — a workflow-mutating tool call (build-workflow,
// build-workflow-with-agent, apply-workflow-credentials, setup-workflow) is
// in flight with args.workflowId matching ours. Without this, the user can
// drag nodes around concurrently with the agent's mutations, producing
// mid-stream conflicts.
const thread = useThread();

const WORKFLOW_EDITING_TOOLS = new Set([
	'build-workflow',
	'build-workflow-with-agent',
	'apply-workflow-credentials',
	'setup-workflow',
]);

const isAgentEditingThisWorkflow = computed(() => {
	for (const message of thread.messages) {
		for (const tc of message.toolCalls ?? []) {
			if (!tc.isLoading) continue;
			if (!WORKFLOW_EDITING_TOOLS.has(tc.toolName)) continue;
			const args = tc.args as { workflowId?: string } | undefined;
			if (args?.workflowId === props.workflowId) return true;
		}
	}
	return false;
});
</script>

<template>
	<div :class="$style.content">
		<WorkflowCanvasHost
			ref="host"
			:workflow-id="workflowId"
			:refresh-key="refreshKey"
			@ready="emit('iframe-ready')"
			@workflow-loaded="(id) => emit('workflow-loaded', id)"
		/>

		<!-- Block all interaction while the agent is actively editing this
		     workflow. Pointer-events overlay; agent's mutations still render
		     live underneath. The chat / AI thread (sibling of this wrapper)
		     stays interactive so the user can still talk to the agent. -->
		<div
			v-if="isAgentEditingThisWorkflow"
			:class="$style.editLock"
			data-test-id="instance-ai-artifact-edit-lock"
			aria-hidden="true"
		/>

		<!-- <N8nIconButton
			v-if="workflowId"
			icon="external-link"
			variant="subtle"
			size="large"
			:class="$style.openWorkflowButton"
			:aria-label="i18n.baseText('instanceAi.previewTabBar.openWorkflowInEditor')"
			data-test-id="instance-ai-workflow-preview-open-editor"
			@click="openWorkflowInEditor"
		/> -->
	</div>
</template>

<style lang="scss" module>
.content {
	flex: 1;
	min-height: 0;
	position: relative;
	height: 100%;
}

.openWorkflowButton {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	z-index: 1;
}

.editLock {
	position: absolute;
	inset: 0;
	z-index: 5;
	cursor: not-allowed;
	background: transparent;
}
</style>
