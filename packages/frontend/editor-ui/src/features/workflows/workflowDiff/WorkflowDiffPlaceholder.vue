<script setup lang="ts">
import WorkflowDiffIllustration from './WorkflowDiffIllustration.vue';
import WorkflowDiffPanels from './WorkflowDiffPanels.vue';
import WorkflowDiffToolbar from './WorkflowDiffToolbar.vue';

defineProps<{ hideIllustration?: boolean }>();
</script>

<template>
	<div :class="$style.placeholder" data-test-id="workflow-diff-placeholder">
		<div :class="$style.toolbar" inert aria-hidden="true">
			<WorkflowDiffToolbar hide-title show-fullscreen-button disabled />
		</div>
		<div :class="$style.content">
			<div :class="$style.chrome" inert aria-hidden="true">
				<WorkflowDiffPanels>
					<template #sourceLabel>
						<div :class="$style.label"><slot name="sourceLabel" /></div>
					</template>
					<template #targetLabel>
						<div :class="$style.label"><slot name="targetLabel" /></div>
					</template>
					<template #source>
						<div :class="$style.canvas">
							<WorkflowDiffIllustration v-if="!hideIllustration" :class="$style.illustration" />
						</div>
					</template>
					<template #target>
						<div :class="$style.canvas">
							<WorkflowDiffIllustration v-if="!hideIllustration" :class="$style.illustration" />
						</div>
					</template>
				</WorkflowDiffPanels>
			</div>
			<div :class="$style.overlay"><slot /></div>
		</div>
	</div>
</template>

<style module lang="scss">
.placeholder,
.chrome {
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.toolbar,
.content {
	position: relative;
}

.content {
	flex: 1;
	min-height: 0;
}

.toolbar::after {
	content: '';
}

.toolbar::after,
.overlay {
	position: absolute;
	inset: 0;
	background: color-mix(in srgb, var(--canvas--color--background) 35%, transparent);
}

.label {
	opacity: 0.5;
}

.canvas {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-image: radial-gradient(var(--canvas--dot--color) 1px, transparent 1px);
	// Match the canvas grid without initializing Vue Flow.
	background-size: var(--spacing--md) var(--spacing--md);
}

.illustration {
	width: 30%;
	height: 30%;
	color: var(--text-color--subtle);
	opacity: 0.45;
}

.overlay {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
}
</style>
