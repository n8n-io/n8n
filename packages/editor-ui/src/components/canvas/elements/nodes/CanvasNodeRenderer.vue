<script lang="ts" setup>
import { h, inject } from 'vue';
import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import CanvasNodeAddNodes from '@/components/canvas/elements/nodes/render-types/CanvasNodeAddNodes.vue';
import { CanvasNodeKey } from '@/constants';
import { CanvasNodeRenderType } from '@/types';

const node = inject(CanvasNodeKey);

const slots = defineSlots<{
	default?: () => unknown;
}>();

const Render = () => {
	let Component;
	switch (node?.data.value.render.type) {
		// @TODO Add support for sticky notes here
		case CanvasNodeRenderType.AddNodes:
			Component = CanvasNodeAddNodes;
			break;
		default:
			Component = CanvasNodeDefault;
	}

	return h(Component, slots.default);
};
</script>

<template>
	<Render />
</template>
