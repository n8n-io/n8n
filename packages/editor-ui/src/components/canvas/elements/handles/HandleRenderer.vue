<script lang="ts" setup>
import { h, useCssModule } from 'vue';
import type { CanvasConnectionPort, CanvasElementPortWithPosition } from '@/types';

import { Handle } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';

const props = defineProps<{
	mode: 'output' | 'input';
	type: CanvasConnectionPort['type'];
	index: CanvasConnectionPort['index'];
	position: CanvasElementPortWithPosition['position'];
	offset: CanvasElementPortWithPosition['offset'];
}>();

const $style = useCssModule();

const Render = () => {
	let Component;

	if (props.type === NodeConnectionType.Main) {
		if (props.mode === 'input') {
			Component = CanvasHandleMainOutput;
		} else {
			Component = CanvasHandleMainOutput;
		}
	} else {
		Component = CanvasHandleMainOutput;
	}

	return h(Component);
};
</script>

<template>
	<Handle
		:id="`${mode}s/${type}/${index}`"
		:class="[$style.handle, $style[`handle--${mode}--${type}`]]"
		type="source"
		:position="position"
		:style="offset"
	>
	</Handle>
</template>

<style lang="scss" module>
.handle {
	width: 16px;
	height: 16px;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	border: 0;
}

.handle--input,
.handle--output {
	border: 0;
}

.handle--output--main,
.handle--input--main {
	background: var(--node-type-main-color);

	&:hover {
		background: var(--color-primary);
	}
}

.handle--output--main {
	width: 14px;
	height: 14px;
}

.handle--input--main {
	width: 8px;
	height: 20px;
	border-radius: 0;
}

@each $node-type in $supplemental-node-types {
	.handle--output--#{$node-type},
	.handle--input--#{$node-type} {
		width: 14px;
		height: 14px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 0;
		background: hsl(
			var(--node-type-supplemental-color-h)
				var(--node-type-supplemental-color-s)
				var(--node-type-supplemental-color-l)
		);
	}
}
</style>
