<script lang="ts" setup>
import { h } from 'vue';
import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import CanvasNodeConfiguration from '@/components/canvas/elements/nodes/render-types/CanvasNodeConfiguration.vue';
import CanvasNodeConfigurable from '@/components/canvas/elements/nodes/render-types/CanvasNodeConfigurable.vue';
import type { CanvasElementData } from '@/types';
import type { INodeTypeDescription } from 'n8n-workflow';

const props = defineProps<{
	nodeType: INodeTypeDescription;
	data: CanvasElementData;
}>();

const slots = defineSlots<{
	default?: () => unknown;
}>();

const Render = () => {
	let Component;
	switch (props.data.renderType) {
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

	return h(
		Component,
		{
			nodeType: props.nodeType,
			data: props.data,
		},
		slots.default,
	);
};
</script>

<template>
	<Render />
</template>
