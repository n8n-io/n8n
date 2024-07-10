<script lang="ts" setup>
import { h, inject } from 'vue';
import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import { CanvasNodeKey } from '@/constants';

const node = inject(CanvasNodeKey);

const slots = defineSlots<{
	default?: () => unknown;
}>();

const Render = () => {
	let Component;
	switch (node?.data.value.render.type) {
		// @TODO Add support for sticky notes here
		default:
			Component = CanvasNodeDefault;
	}

	return h(Component, slots.default);
};
</script>

<template>
	<Render />
</template>
