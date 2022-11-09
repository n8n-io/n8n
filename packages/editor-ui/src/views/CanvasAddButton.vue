<template>
	<div :class="$style.container" :style="containerCssVars" ref="container">
		<n8n-tooltip placement="top" :value="showTooltip" manual :disabled="isScrimActive" :popper-class="$style.tooltip" :open-delay="700">
			<button :class="$style.button" @click="$emit('click')">
				<font-awesome-icon icon="plus" size="lg" />
			</button>
			<template #content>
				<p v-text="$locale.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting')" />
			</template>
		</n8n-tooltip>
		<p :class="$style.label" v-text="$locale.baseText('nodeView.canvasAddButton.addFirstStep')" />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { XYPosition } from '@/Interface';
import { mapStores } from 'pinia';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

export default Vue.extend({
	name: 'CanvasAddButton',
	props: {
		showTooltip: {
			type: Boolean,
		},
		position: {
			type: Array,
		},
	},
	computed: {
		...mapStores(
			useNodeCreatorStore,
		),
		containerCssVars(): Record<string, string> {
			const position = this.position as XYPosition;
			return {
				'--trigger-placeholder-left-position': `${position[0]}px`,
				'--trigger-placeholder-top-position': `${position[1]}px`,
			};
		},
		isScrimActive(): boolean {
			return this.nodeCreatorStore.showScrim;
		},
	},
});
</script>

<style lang="scss" module>
.container {
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
	// otherwise the clics wouldn't register
	z-index: 101;

	&:hover .button svg path {
		fill: var(--color-primary)
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
			fill: var(--color-foreground-xdark)
		}
	}
}

.tooltip {
	max-width: 180px;
}

.label {
	width: max-content;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose	);
	color: var(--color-text-dark);
	margin-top: var(--spacing-2xs);
}
</style>
