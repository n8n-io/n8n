<script setup lang="ts">
import { computed } from 'vue';
import type { XYPosition } from '@/Interface';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useI18n } from '@n8n/i18n';

export interface Props {
	showTooltip: boolean;
	position: XYPosition;
}

const i18n = useI18n();

const props = defineProps<Props>();

const nodeCreatorStore = useNodeCreatorStore();
const containerCssVars = computed(() => ({
	'--trigger-placeholder-left-position': `${props.position[0]}px`,
	'--trigger-placeholder-top-position': `${props.position[1]}px`,
}));
</script>

<template>
	<div
		ref="container"
		:class="$style.canvasAddButton"
		:style="containerCssVars"
		data-test-id="canvas-add-button"
	>
		<n8n-tooltip
			placement="top"
			:visible="showTooltip"
			:disabled="nodeCreatorStore.showScrim"
			:popper-class="$style.tooltip"
			:show-after="700"
		>
			<button :class="$style.button" data-test-id="canvas-plus-button" @click="$emit('click')">
				<n8n-icon icon="plus" size="large" />
			</button>
			<template #content>
				{{ i18n.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting') }}
			</template>
		</n8n-tooltip>
		<p :class="$style.label" v-text="i18n.baseText('nodeView.canvasAddButton.addFirstStep')" />
	</div>
</template>

<style lang="scss" module>
.canvasAddButton {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100px;
	height: 100px;
	position: absolute;
	top: var(--trigger-placeholder-top-position);
	left: var(--trigger-placeholder-left-position);
	// We have to increase z-index to make sure it's higher than selecting box in NodeView
	// otherwise the clicks wouldn't register
	z-index: var(--z-index-canvas-add-button);

	&:hover .button svg path {
		fill: var(--color-primary);
	}
}

.button {
	background: var(--color-foreground-xlight);
	border: 2px dashed var(--color-foreground-xdark);
	border-radius: 8px;
	padding: 0;

	min-width: 100px;
	min-height: 100px;
	cursor: pointer;

	svg {
		width: 26px !important;
		height: 40px;
		path {
			fill: var(--color-foreground-xdark);
		}
	}
}

.label {
	width: max-content;
	font-weight: var(--font-weight-medium);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
	color: var(--color-text-dark);
	margin-top: var(--spacing-2xs);
}
</style>
