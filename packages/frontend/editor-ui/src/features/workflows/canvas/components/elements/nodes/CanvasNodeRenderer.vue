<script lang="ts" setup>
import { h, inject } from 'vue';
import CanvasNodeDefault from './render-types/CanvasNodeDefault.vue';
import CanvasNodeStickyNote from './render-types/CanvasNodeStickyNote.vue';
import CanvasNodeAddNodes from './render-types/CanvasNodeAddNodes.vue';
import CanvasNodeChoicePrompt from './render-types/CanvasNodeChoicePrompt.vue';
import CanvasNodeFrame from './render-types/CanvasNodeFrame.vue';
import { CanvasNodeKey } from '@/app/constants';
import { CanvasNodeRenderType } from '../../../canvas.types';

const node = inject(CanvasNodeKey);

const Render = () => {
	const renderType = node?.data.value.render.type ?? CanvasNodeRenderType.Default;
	let Component;

	switch (renderType) {
		case CanvasNodeRenderType.StickyNote:
			Component = CanvasNodeStickyNote;
			break;
		case CanvasNodeRenderType.AddNodes:
			Component = CanvasNodeAddNodes;
			break;
		case CanvasNodeRenderType.ChoicePrompt:
			Component = CanvasNodeChoicePrompt;
			break;
		case CanvasNodeRenderType.Frame:
			Component = CanvasNodeFrame;
			break;
		default:
			Component = CanvasNodeDefault;
	}

	return h(Component, {
		'data-canvas-node-render-type': renderType,
	});
};
</script>

<template>
	<Render />
</template>
