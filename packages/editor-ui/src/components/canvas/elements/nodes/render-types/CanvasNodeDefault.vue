<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { CanvasNodeKey } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import CanvasNodeDisabledStrikeThrough from './parts/CanvasNodeDisabledStrikeThrough.vue';

const node = inject(CanvasNodeKey);

const $style = useCssModule();
const i18n = useI18n();

const label = computed(() => node?.label.value ?? '');

const inputs = computed(() => node?.data.value.inputs ?? []);
const outputs = computed(() => node?.data.value.outputs ?? []);
const connections = computed(() => node?.data.value.connections ?? { input: {}, output: {} });
const { mainOutputs } = useNodeConnections({
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
	return {
		'--node-main-output-count': mainOutputs.value.length,
	};
});
</script>

<template>
	<div v-if="node" :class="classes" :style="styles" data-test-id="canvas-node-default">
		<slot />
		<CanvasNodeDisabledStrikeThrough v-if="isDisabled" />
		<div v-if="label" :class="$style.label">
			{{ label }}
			<div v-if="isDisabled">({{ i18n.baseText('node.disabled') }})</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.node {
	--canvas-node--height: calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 50px);
	--canvas-node--width: 100px;

	height: var(--canvas-node--height);
	width: var(--canvas-node--width);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);
}

.label {
	top: 100%;
	position: absolute;
	font-size: var(--font-size-m);
	text-align: center;
	width: 100%;
	min-width: 200px;
	margin-top: var(--spacing-2xs);
}

.selected {
	box-shadow: 0 0 0 4px var(--color-canvas-selected);
}

.disabled {
	border-color: var(--color-canvas-node-disabled-border, var(--color-foreground-base));
}
</style>
