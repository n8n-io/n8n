<script lang="ts" setup>
import { h, useCssModule } from 'vue';
import type { CanvasConnectionPort, CanvasElementPortWithPosition } from '@/types';

import { Handle } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import CanvasHandleMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainInput.vue';
import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';
import CanvasHandleNonMain from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMain.vue';

const props = defineProps<{
	mode: 'output' | 'input';
	source?: boolean;
	label?: string;
	type: CanvasConnectionPort['type'];
	index: CanvasConnectionPort['index'];
	position: CanvasElementPortWithPosition['position'];
	offset: CanvasElementPortWithPosition['offset'];
}>();

const $style = useCssModule();

const Render = (renderProps: { label?: string }) => {
	let Component;

	if (props.type === NodeConnectionType.Main) {
		if (props.mode === 'input') {
			Component = CanvasHandleMainInput;
		} else {
			Component = CanvasHandleMainOutput;
		}
	} else {
		Component = CanvasHandleNonMain;
	}

	return h(Component, renderProps);
};
</script>

<template>
	<Handle
		:id="`${mode}s/${type}/${index}`"
		:class="[$style.handle]"
		:type="source ? 'source' : 'target'"
		:position="position"
		:style="offset"
	>
		<Render :label="label" />
	</Handle>
</template>

<style lang="scss" module>
.handle {
	width: auto;
	height: auto;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	border: 0;
	background: none;

	> * {
		pointer-events: none;
	}
}
</style>
