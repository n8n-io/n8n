<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { CanvasNodeKey, NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS } from '@/constants';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { useI18n } from '@/composables/useI18n';
import CanvasNodeDisabledStrikeThrough from './parts/CanvasNodeDisabledStrikeThrough.vue';

const node = inject(CanvasNodeKey);

const $style = useCssModule();
const i18n = useI18n();

const label = computed(() => node?.label.value ?? '');

const inputs = computed(() => node?.data.value.inputs ?? []);
const outputs = computed(() => node?.data.value.outputs ?? []);
const connections = computed(() => node?.data.value.connections ?? { input: {}, output: {} });
const { nonMainInputs, requiredNonMainInputs } = useNodeConnections({
	inputs,
	outputs,
	connections,
});

const isDisabled = computed(() => node?.data.value.disabled ?? false);

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: node?.selected.value,
		[$style.disabled]: isDisabled.value,
	};
});

const styles = computed(() => {
	const stylesObject: {
		[key: string]: string | number;
	} = {};

	if (requiredNonMainInputs.value.length > 0) {
		let spacerCount = 0;
		if (NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS) {
			const requiredNonMainInputsCount = requiredNonMainInputs.value.length;
			const optionalNonMainInputsCount = nonMainInputs.value.length - requiredNonMainInputsCount;
			spacerCount = requiredNonMainInputsCount > 0 && optionalNonMainInputsCount > 0 ? 1 : 0;
		}

		stylesObject['--configurable-node-input-count'] = nonMainInputs.value.length + spacerCount;
	}

	return stylesObject;
});
</script>

<template>
	<div :class="classes" :style="styles" data-test-id="canvas-node-configurable">
		<slot />
		<CanvasNodeDisabledStrikeThrough v-if="isDisabled" />
		<div :class="$style.label">
			{{ label }}
			<div v-if="isDisabled">({{ i18n.baseText('node.disabled') }})</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.node {
	--configurable-node-min-input-count: 4;
	--configurable-node-input-width: 65px;
	--canvas-node--height: 100px;
	--canvas-node--width: calc(
		max(var(--configurable-node-input-count, 5), var(--configurable-node-min-input-count)) *
			var(--configurable-node-input-width)
	);

	width: var(--canvas-node--width);
	height: var(--canvas-node--height);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);
}

.label {
	top: 100%;
	font-size: var(--font-size-m);
	text-align: center;
	margin-left: var(--spacing-s);
	max-width: calc(
		var(--node-width) - var(--configurable-node-icon-offset) - var(--configurable-node-icon-size) -
			2 * var(--spacing-s)
	);
}

.selected {
	box-shadow: 0 0 0 4px var(--color-canvas-selected);
}

.disabled {
	border-color: var(--color-canvas-node-disabled-border, var(--color-foreground-base));
}
</style>
