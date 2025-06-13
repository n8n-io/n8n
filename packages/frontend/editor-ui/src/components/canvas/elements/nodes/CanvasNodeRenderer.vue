<script lang="ts" setup>
import { h, inject } from 'vue';
import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import CanvasNodeStickyNote from '@/components/canvas/elements/nodes/render-types/CanvasNodeStickyNote.vue';
import CanvasNodeAddNodes from '@/components/canvas/elements/nodes/render-types/CanvasNodeAddNodes.vue';
import CanvasNodeAIPrompt from '@/components/canvas/elements/nodes/render-types/CanvasNodeAIPrompt.vue';
import { CanvasNodeKey } from '@/constants';
import { CanvasNodeRenderType } from '@/types';

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
		case CanvasNodeRenderType.AIPrompt:
			Component = CanvasNodeAIPrompt;
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
