<script lang="ts" setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { N8nIconButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
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
	close: [];
	'push-ref-ready': [pushRef: string];
}>();

const i18n = useI18n();
const workflowsListStore = useWorkflowsListStore();

const workflow = ref<IWorkflowDb | null>(null);
const isLoading = ref(false);
const fetchError = ref<string | null>(null);

const workflowName = computed(() => workflow.value?.name ?? '');

// When executionId is set, switch WorkflowPreview to execution mode
const previewMode = computed(() => (props.executionId ? 'execution' : 'workflow'));

function handleIframeMessage(event: MessageEvent) {
	if (typeof event.data !== 'string' || !event.data.includes('"command"')) return;
	try {
		const json = JSON.parse(event.data);
		if (json.command === 'n8nReady' && json.pushRef) {
			emit('push-ref-ready', json.pushRef);
		}
	} catch {
		// Ignore parse errors
	}
}

async function fetchWorkflow(id: string) {
	const isRefresh = workflow.value?.id === id;
	console.log('[WorkflowPreview] fetchWorkflow called', {
		id,
		isRefresh,
		currentWorkflowId: workflow.value?.id,
		currentNodeCount: workflow.value?.nodes?.length,
	});

	fetchError.value = null;
	if (!isRefresh) {
		isLoading.value = true;
		workflow.value = null;
	}

	try {
		const fetched = await workflowsListStore.fetchWorkflow(id);
		console.log('[WorkflowPreview] fetchWorkflow result', {
			id: fetched.id,
			name: fetched.name,
			nodeCount: fetched.nodes?.length,
			nodeNames: fetched.nodes?.map((n: { name: string }) => n.name),
		});
		workflow.value = fetched;
	} catch (err) {
		console.error('[WorkflowPreview] fetchWorkflow error', err);
		workflow.value = null;
		fetchError.value = i18n.baseText('instanceAi.workflowPreview.fetchError');
	} finally {
		isLoading.value = false;
	}
}

// Re-fetch when workflowId changes OR when refreshKey increments (same workflow modified).
watch(
	() => [props.workflowId, props.refreshKey] as const,
	async ([id, refreshKey], oldVal) => {
		console.log('[WorkflowPreview] watcher fired', {
			id,
			refreshKey,
			oldId: oldVal?.[0],
			oldRefreshKey: oldVal?.[1],
		});
		if (id) {
			await fetchWorkflow(id);
		} else {
			workflow.value = null;
			fetchError.value = null;
		}
	},
	{ immediate: true },
);

// Listen for pushRef from iframe's n8nReady message
window.addEventListener('message', handleIframeMessage);

onBeforeUnmount(() => {
	window.removeEventListener('message', handleIframeMessage);
});
</script>

<template>
	<div :class="$style.container">
		<!-- Header -->
		<div :class="$style.header">
			<N8nText size="small" bold :class="$style.headerTitle">
				{{ workflowName || i18n.baseText('instanceAi.workflowPreview.title') }}
			</N8nText>
			<div :class="$style.headerActions">
				<a
					v-if="workflow"
					:href="`/workflow/${workflow.id}`"
					target="_blank"
					:class="$style.openLink"
				>
					{{ i18n.baseText('instanceAi.workflowPreview.openInEditor') }}
				</a>
				<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
			</div>
		</div>

		<!-- Content -->
		<div :class="$style.content">
			<!-- Error (only when no workflow to show) -->
			<div v-if="fetchError && !workflow" :class="$style.centerState">
				<N8nText color="text-light">{{ fetchError }}</N8nText>
				<N8nIconButton icon="x" variant="outline" size="small" @click="emit('close')" />
			</div>

			<!-- Preview — stays mounted during re-fetch to keep iframe ready state -->
			<WorkflowPreview
				v-if="workflow"
				:mode="previewMode"
				:workflow="workflow"
				:execution-id="props.executionId ?? undefined"
				:can-open-ndv="true"
				:hide-controls="true"
				loader-type="spinner"
			/>

			<!-- Loading overlay (shown during initial load or when no workflow yet) -->
			<div v-if="isLoading && !workflow" :class="$style.centerState">
				<N8nSpinner type="dots" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.header {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
	flex-shrink: 0;
	gap: var(--spacing--2xs);
}

.headerTitle {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.openLink {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--primary);
	text-decoration: none;
	white-space: nowrap;

	&:hover {
		text-decoration: underline;
	}
}

.content {
	flex: 1;
	min-height: 0;
	position: relative;
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
