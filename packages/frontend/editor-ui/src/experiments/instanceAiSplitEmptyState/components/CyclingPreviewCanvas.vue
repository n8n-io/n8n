<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getPreviewWorkflow } from '@/experiments/instanceAiWorkflowPreviewSuggestions';
import { useBuildManually } from '../useBuildManually';
import type { SplitEmptyStateExample } from '../examples';
import InstanceAiPreviewCanvas from './InstanceAiPreviewCanvas.vue';
import CanvasWaitingState from './CanvasWaitingState.vue';

const props = withDefaults(
	defineProps<{
		examples: readonly SplitEmptyStateExample[];
		activeIndex: number;
		projectId?: string;
		mode?: 'preview' | 'loader';
	}>(),
	{ projectId: undefined, mode: 'preview' },
);

const i18n = useI18n();
const { buildManually } = useBuildManually();

const activeWorkflow = computed(() =>
	getPreviewWorkflow(props.examples[props.activeIndex].workflowFile),
);
</script>

<template>
	<div :class="$style.frame">
		<N8nButton
			variant="outline"
			size="small"
			icon="plus"
			:class="$style.buildManually"
			data-test-id="instance-ai-canvas-build-manually"
			@click="buildManually(props.projectId)"
		>
			{{ i18n.baseText('experiments.instanceAiSplitEmptyState.cta.buildManually') }}
		</N8nButton>

		<div :class="$style.canvasArea">
			<CanvasWaitingState v-if="props.mode === 'loader'" />
			<InstanceAiPreviewCanvas
				v-else-if="activeWorkflow"
				:key="props.activeIndex"
				:workflow="activeWorkflow"
				:suggestion-id="props.examples[props.activeIndex].id"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.frame {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
	overflow: hidden;
	border-left: var(--border-base);
	background-color: var(--canvas--color--background);
	background-image: radial-gradient(
		color-mix(in srgb, var(--canvas--dot--color) 50%, transparent) 1px,
		transparent 0
	);
	background-size: 18px 18px;
}

.buildManually {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	z-index: 1;
}

.canvasArea {
	flex: 1;
	min-height: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
