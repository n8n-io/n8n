<script setup lang="ts">
import type { CanvasConnection, CanvasNode } from '@/types';
import { useVueFlow } from '@vue-flow/core';
import { useInjectViewportSync } from './viewport.sync';

const props = defineProps<{
	id: string;
	nodes: CanvasNode[];
	connections: CanvasConnection[];
}>();

const {
	setViewport,
	onViewportChange: onLocalViewportChange,
	onPaneContextMenu,
} = useVueFlow({ id: props.id });

const { triggerViewportChange, onViewportChange } = useInjectViewportSync();

/**
 * Flag to ignore viewport changes triggered by remote updates,
 * preventing infinite sync loops between canvases
 */
let isApplyingRemoteUpdate = false;

onLocalViewportChange((vp) => {
	if (isApplyingRemoteUpdate) return;

	triggerViewportChange({
		from: props.id,
		viewport: vp,
	});
});

onViewportChange(({ from, viewport }) => {
	if (from === props.id) return; // Ignore self

	isApplyingRemoteUpdate = true;
	setViewport(viewport);
	requestAnimationFrame(() => (isApplyingRemoteUpdate = false));
});

onPaneContextMenu((event) => {
	console.log('Context menu event', event);
	event.preventDefault();
	event.stopPropagation();
});
</script>

<template>
	<div style="width: 100%; height: 100%" @contextmenu.prevent>
		<Canvas :id :nodes :connections :read-only="true" style="width: 100%; height: 100%">
			<template #node="{ nodeProps }">
				<slot name="node" v-bind="{ nodeProps }" />
			</template>
		</Canvas>
	</div>
</template>
