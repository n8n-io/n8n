<script lang="ts" setup>
import { h, inject } from 'vue';
import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import CanvasNodeConfiguration from '@/components/canvas/elements/nodes/render-types/CanvasNodeConfiguration.vue';
import CanvasNodeConfigurable from '@/components/canvas/elements/nodes/render-types/CanvasNodeConfigurable.vue';
import { CanvasNodeKey } from '@/constants';

const node = inject(CanvasNodeKey);

const slots = defineSlots<{
	default?: () => unknown;
}>();

const Render = () => {
	let Component;
	switch (node?.data.value.renderType) {
		case 'configurable':
			Component = CanvasNodeConfigurable;
			break;

		case 'configuration':
			Component = CanvasNodeConfiguration;
			break;

		case 'trigger':
			Component = CanvasNodeDefault;
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
