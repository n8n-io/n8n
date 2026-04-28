<script lang="ts" setup>
import { ref, watch, computed, onBeforeUnmount, useTemplateRef } from 'vue';
import { N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PushMessage } from '@n8n/api-types';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useInstanceAiStore } from '../instanceAi.store';
import type { IWorkflowDb } from '@/Interface';

const props = withDefaults(
	defineProps<{
		workflowId: string | null;
		executionId: string | null;
		/** Incremented to force re-fetch even when workflowId stays the same (e.g. workflow was modified). */
		refreshKey?: number;
	}>(),
	{ refreshKey: 0 },
);

const emit = defineEmits<{
	'iframe-ready': [];
}>();

const i18n = useI18n();
const workflowsListStore = useWorkflowsListStore();
const workflowsStore = useWorkflowsStore();
const instanceAiStore = useInstanceAiStore();
const previewRef = useTemplateRef<InstanceType<typeof WorkflowPreview>>('previewComponent');

const workflow = ref<IWorkflowDb | null>(null);
const isLoading = ref(false);
const fetchError = ref<string | null>(null);
let fetchGeneration = 0;

// When executionId is set, switch WorkflowPreview to execution mode
const previewMode = computed(() => (props.executionId ? 'execution' : 'workflow'));

function handleIframeMessage(event: MessageEvent) {
	if (typeof event.data !== 'string' || !event.data.includes('"command"')) return;
	try {
		const json = JSON.parse(event.data);
		if (json.command === 'n8nReady') {
			emit('iframe-ready');
		}
	} catch {
		// Ignore parse errors
	}
}

function relayPushEvent(event: PushMessage) {
	const iframe = (previewRef.value as { iframeRef?: HTMLIFrameElement | null } | undefined)
		?.iframeRef;
	if (!iframe?.contentWindow) return;
	iframe.contentWindow.postMessage(
		JSON.stringify({ command: 'executionEvent', event }),
		window.location.origin,
	);
}

async function fetchWorkflow(id: string) {
	const isRefresh = workflow.value?.id === id;
	const generation = ++fetchGeneration;
	fetchError.value = null;
	if (!isRefresh) {
		isLoading.value = true;
		workflow.value = null;
	}

	try {
		const result = await workflowsListStore.fetchWorkflow(id);
		if (generation !== fetchGeneration) return;
		workflow.value = result;
	} catch {
		if (generation !== fetchGeneration) return;
		workflow.value = null;
		fetchError.value = i18n.baseText('instanceAi.workflowPreview.fetchError');
	} finally {
		if (generation === fetchGeneration) {
			isLoading.value = false;
		}
	}
}

// Re-fetch when workflowId changes OR when refreshKey increments (same workflow modified).
watch(
	() => [props.workflowId, props.refreshKey] as const,
	async ([id]) => {
		if (id) {
			await fetchWorkflow(id);
		} else {
			workflow.value = null;
			fetchError.value = null;
		}
	},
	{ immediate: true },
);

// The execute_workflow tool is fire-and-forget. Poll until the execution
// finishes so the iframe can reload with the final node statuses. Indefinite
// while the agent is streaming, then a short grace window after.
const POLL_INTERVAL_MS = 1_500;
const MAX_POST_STREAM_POLLS = 5;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let postStreamAttempts = 0;
// Only reload on a running → finished transition. If the first poll already
// sees `finished=true`, the initial openExecution already has final data.
let observedRunning = false;

function stopPolling() {
	if (pollTimer !== null) {
		clearTimeout(pollTimer);
		pollTimer = null;
	}
	postStreamAttempts = 0;
	observedRunning = false;
}

async function pollExecutionUntilDone(executionId: string) {
	if (executionId !== props.executionId) return;

	if (instanceAiStore.isStreaming) {
		postStreamAttempts = 0;
	} else {
		postStreamAttempts++;
		if (postStreamAttempts > MAX_POST_STREAM_POLLS) return;
	}

	try {
		const execution = await workflowsStore.fetchExecutionDataById(executionId);
		if (executionId !== props.executionId) return; // stale

		const isFinished = execution?.finished === true;
		if (isFinished) {
			if (observedRunning) {
				const preview = previewRef.value as
					| { reloadExecution?: () => void; iframeRef?: HTMLIFrameElement | null }
					| undefined;
				preview?.reloadExecution?.();
			}
			return;
		}
		observedRunning = true;
	} catch {
		// Execution might not be ready yet — retry
	}

	pollTimer = setTimeout(() => {
		void pollExecutionUntilDone(executionId);
	}, POLL_INTERVAL_MS);
}

watch(
	() => props.executionId,
	(execId) => {
		stopPolling();
		if (execId) {
			// Start polling after a short initial delay to give the execution time
			pollTimer = setTimeout(() => {
				void pollExecutionUntilDone(execId);
			}, POLL_INTERVAL_MS);
		}
	},
);

// Listen for iframe ready signal
window.addEventListener('message', handleIframeMessage);

onBeforeUnmount(() => {
	window.removeEventListener('message', handleIframeMessage);
	stopPolling();
});

defineExpose({ relayPushEvent });
</script>

<template>
	<div :class="$style.content">
		<!-- Error (only when no workflow to show) -->
		<div v-if="fetchError && !workflow" :class="$style.centerState">
			<N8nText color="text-light">{{ fetchError }}</N8nText>
		</div>

		<!-- Always mounted so the iframe boots before any artifact exists; it hides itself
		     internally when no workflow is set. -->
		<WorkflowPreview
			ref="previewComponent"
			:mode="previewMode"
			:workflow="workflow ?? undefined"
			:execution-id="props.executionId ?? undefined"
			:can-open-ndv="true"
			:can-execute="true"
			:hide-controls="false"
			:suppress-notifications="true"
			:allow-error-notifications="true"
			loader-type="spinner"
		/>

		<!-- Loading overlay (shown during initial load or when no workflow yet) -->
		<div v-if="isLoading && !workflow" :class="$style.centerState">
			<N8nIcon icon="loader-circle" :size="80" spin />
		</div>
	</div>
</template>

<style lang="scss" module>
.content {
	flex: 1;
	min-height: 0;
	position: relative;
	height: 100%;
}

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	height: 100%;
}
</style>
