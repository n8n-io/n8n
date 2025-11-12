<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { getWorkflowHeatmap, type WorkflowHeatmapResponse } from '@/app/api/workflows';
import { N8nSelect, N8nOption, N8nText } from '@n8n/design-system';

type HeatmapMode = 'memory' | 'frequency' | 'duration';

const route = useRoute();
const locale = useI18n();
const toast = useToast();
const workflowsStore = useWorkflowsStore();
const rootStore = useRootStore();

const workflowId = computed(() => route.params.name as string);
const workflow = computed(() => workflowsStore.getWorkflowById(workflowId.value));
const heatmapData = ref<WorkflowHeatmapResponse | null>(null);
const selectedMode = ref<HeatmapMode>('memory');
const previewRef = ref<{
	sendCommand: (command: string, payload?: Record<string, unknown>) => void;
} | null>(null);
const isLoading = ref(false);
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

const modeOptions = computed(() => [
	{ value: 'memory', label: locale.baseText('heatmap.mode.memory') },
	{ value: 'frequency', label: locale.baseText('heatmap.mode.frequency') },
	{ value: 'duration', label: locale.baseText('heatmap.mode.duration') },
]);

async function fetchHeatmap() {
	if (!workflowId.value || workflowId.value === 'new') {
		return;
	}

	isLoading.value = true;
	try {
		heatmapData.value = await getWorkflowHeatmap(rootStore.restApiContext, workflowId.value);
	} catch (error) {
		toast.showError(error, locale.baseText('heatmap.fetchError.title'));
	} finally {
		isLoading.value = false;
	}
}

function scheduleHeatmapSend() {
	// Clear any existing timeout
	if (retryTimeout) {
		clearTimeout(retryTimeout);
		retryTimeout = null;
	}

	if (!previewRef.value || !heatmapData.value) {
		return;
	}

	// Try sending with retries - sendCommand will only execute when iframe is ready
	let attempts = 0;
	const maxAttempts = 25; // Up to 5 seconds (200ms * 25)

	const trySend = () => {
		attempts++;
		if (previewRef.value && heatmapData.value) {
			previewRef.value.sendCommand('setHeatmap', {
				mode: selectedMode.value,
				heatmap: heatmapData.value,
			});

			// Continue retrying until max attempts reached
			if (attempts < maxAttempts) {
				retryTimeout = setTimeout(trySend, 200);
			}
		}
	};

	// Start trying immediately
	trySend();
}

watch(selectedMode, () => {
	scheduleHeatmapSend();
});

watch(
	() => workflow.value,
	async (newWorkflow) => {
		if (!newWorkflow && workflowId.value && workflowId.value !== 'new') {
			await workflowsStore.fetchWorkflow(workflowId.value);
		}
		if (workflow.value) {
			await fetchHeatmap();
		}
	},
	{ immediate: true },
);

watch(heatmapData, () => {
	if (heatmapData.value) {
		scheduleHeatmapSend();
	}
});

onMounted(async () => {
	if (!workflow.value && workflowId.value && workflowId.value !== 'new') {
		await workflowsStore.fetchWorkflow(workflowId.value);
	}
	if (workflow.value) {
		await fetchHeatmap();
	}
});
</script>

<template>
	<div :class="$style.container" data-test-id="workflow-heatmap-preview">
		<div v-if="isLoading" :class="$style.loading">
			<N8nText color="text-light">{{ locale.baseText('heatmap.loading') }}</N8nText>
		</div>
		<div v-else-if="workflow" :class="$style.content">
			<div :class="$style.controls">
				<N8nSelect
					:model-value="selectedMode"
					data-test-id="heatmap-mode-select"
					@update:model-value="(value: HeatmapMode) => (selectedMode = value)"
				>
					<N8nOption
						v-for="option in modeOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
			</div>
			<WorkflowPreview
				ref="previewRef"
				mode="workflow"
				:workflow="workflow"
				:can-open-ndv="false"
				:hide-node-issues="true"
				loader-type="spinner"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
}

.content {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.controls {
	position: absolute;
	top: var(--spacing--md);
	right: var(--spacing--md);
	z-index: 10;
	background-color: var(--color--foreground);
	padding: var(--spacing--xs);
	border-radius: var(--radius);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
