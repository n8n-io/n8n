<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ExecutionSummary } from 'n8n-workflow';
import { useExecutionsStore } from '@/stores/executions.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';

const executionsStore = useExecutionsStore();

const { showError } = useToast();
const i18n = useI18n();
const telemetry = useTelemetry();

const tagsEventBus = createEventBus();
const isTagsEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const tagsSaving = ref(false);

const activeExecution = computed(() => {
	return executionsStore.activeExecution as ExecutionSummary & {
		customData?: Record<string, string>;
	};
});
</script>

<template>
	<div
		ref="container"
		:class="['execution-annotation-panel', $style.container]"
		data-test-id="execution-annotation-panel"
	>
		<div :class="$style.section">
			<div :class="$style.heading">
				<n8n-heading tag="h3" size="small" color="text-dark">
					{{ i18n.baseText('generic.annotationData') }}
				</n8n-heading>
			</div>
			<div
				v-if="activeExecution?.customData && Object.keys(activeExecution?.customData).length > 0"
				:class="$style.metadata"
			>
				<div
					v-for="attr in Object.keys(activeExecution?.customData)"
					:key="attr"
					:class="$style.customDataEntry"
				>
					<n8n-text :class="$style.key" size="small" color="text-base">
						{{ attr }}
					</n8n-text>
					<n8n-text :class="$style.value" size="small" color="text-base">
						{{ activeExecution?.customData[attr] }}
					</n8n-text>
				</div>
			</div>
			<div v-else :class="$style.noResultsContainer" data-test-id="execution-annotation-data-empty">
				<n8n-text color="text-base" size="small" align="center">
					<span v-n8n-html="i18n.baseText('executionAnnotationView.data.notFound')" />
				</n8n-text>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	z-index: 1;
	max-height: calc(100vh - 250px);
	width: 250px;

	display: flex;
	flex-direction: column;
	overflow: auto;

	background-color: var(--color-background-xlight);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
}

.section {
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;

	&:not(:last-child) {
		border-bottom: var(--border-base);
	}
}

.metadata {
	padding-top: var(--spacing-s);
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing-l);
}

.controls {
	padding: var(--spacing-s) 0 var(--spacing-xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing-m);

	button {
		display: flex;
		align-items: center;
	}
}

.customDataEntry {
	display: flex;
	flex-direction: column;

	&:not(:first-of-type) {
		margin-top: var(--spacing-s);
	}

	.key {
		font-weight: var(--font-weight-bold);
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing-s);
}

.execution-annotation-panel {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}
</style>
