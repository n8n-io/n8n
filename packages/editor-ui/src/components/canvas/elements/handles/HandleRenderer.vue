<script lang="ts" setup>
import { computed, h, provide, toRef, useCssModule } from 'vue';
import type { CanvasConnectionPort, CanvasElementPortWithPosition } from '@/types';

import { Handle } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import CanvasHandleMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainInput.vue';
import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';
import CanvasHandleNonMain from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMain.vue';
import { CanvasNodeHandleKey } from '@/constants';

const props = defineProps<{
	mode: 'output' | 'input';
	label?: string;
	type: CanvasConnectionPort['type'];
	index: CanvasConnectionPort['index'];
	position: CanvasElementPortWithPosition['position'];
	offset: CanvasElementPortWithPosition['offset'];
}>();

const $style = useCssModule();

const handleType = computed(() => (props.mode === 'input' ? 'target' : 'source'));

const isConnectableStart = computed(() => {
	return props.mode === 'output';
});

const isConnectableEnd = computed(() => {
	return props.mode === 'input';
});

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

/**
 * Provide
 */

const label = toRef(props, 'label');

provide(CanvasNodeHandleKey, {
	label,
});
</script>

<template>
	<Handle
		:id="`${mode}s/${type}/${index}`"
		:class="[$style.handle]"
		:type="handleType"
		:position="position"
		:style="offset"
		:connectable-start="isConnectableStart"
		:connectable-end="isConnectableEnd"
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
