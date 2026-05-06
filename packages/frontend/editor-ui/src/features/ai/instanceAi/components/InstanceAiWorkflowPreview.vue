<script lang="ts" setup>
import { ref, watch, nextTick, onBeforeUnmount, useTemplateRef } from 'vue';
import { N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PushMessage } from '@n8n/api-types';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IWorkflowDb } from '@/Interface';

const props = withDefaults(
	defineProps<{
		workflowId: string | null;
		/** Incremented to force re-fetch even when workflowId stays the same (e.g. workflow was modified). */
		refreshKey?: number;
	}>(),
	{ refreshKey: 0 },
);

const emit = defineEmits<{
	'iframe-ready': [];
	/** Fires after a workflow fetch resolves and the new workflow has been
	 * propagated to the embedded WorkflowPreview (which sends `openWorkflow` to
	 * the iframe). Used by `useEventRelay` to gate buffered-event replay so the
	 * iframe always receives `openWorkflow` before the `executionEvent`s. */
	'workflow-loaded': [workflowId: string];
}>();

const i18n = useI18n();
const workflowsListStore = useWorkflowsListStore();
const previewRef = useTemplateRef<InstanceType<typeof WorkflowPreview>>('previewComponent');

const workflow = ref<IWorkflowDb | null>(null);
const isLoading = ref(false);
const fetchError = ref<string | null>(null);
let fetchGeneration = 0;

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
		// Wait for Vue to propagate the new workflow to <WorkflowPreview>'s
		// reactive watcher, which posts `openWorkflow` to the iframe. Emitting
		// after this tick lets parents replay buffered execution events
		// without racing the workflow load.
		await nextTick();
		if (generation !== fetchGeneration) return;
		emit('workflow-loaded', id);
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

// Listen for iframe ready signal
window.addEventListener('message', handleIframeMessage);

onBeforeUnmount(() => {
	window.removeEventListener('message', handleIframeMessage);
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
		     internally when no workflow is set. Live execution state is painted onto
		     the canvas via `relayPushEvent` from SDK push events. -->
		<WorkflowPreview
			ref="previewComponent"
			mode="workflow"
			:workflow="workflow ?? undefined"
			:can-open-ndv="true"
			:can-execute="true"
			:hide-controls="false"
			:suppress-notifications="true"
			:allow-error-notifications="false"
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
