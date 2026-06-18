<script setup lang="ts">
import { computed } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import { useVueFlowTransformPaneTeleport } from '../../composables/useVueFlowTransformPaneTeleport';
import type { AwarenessClientId } from '@n8n/crdt';
import type { WorkflowAwarenessState } from '@/app/stores/crdt/useWorkflowDocumentAwareness';

const props = defineProps<{
	states: Map<AwarenessClientId, WorkflowAwarenessState>;
}>();

const { teleportTarget } = useVueFlowTransformPaneTeleport();
const { findNode } = useVueFlow();

interface RemoteSelectionBox {
	key: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
}

const selections = computed<RemoteSelectionBox[]>(() => {
	const boxes: RemoteSelectionBox[] = [];
	for (const [clientId, state] of props.states.entries()) {
		const selectedNodeIds = state.selectedNodeIds;
		if (!selectedNodeIds?.length) continue;

		for (const nodeId of selectedNodeIds) {
			const node = findNode(nodeId);
			const width = node?.dimensions?.width ?? 0;
			const height = node?.dimensions?.height ?? 0;
			if (!node || !width || !height) continue;

			boxes.push({
				key: `${clientId}:${nodeId}`,
				x: node.position.x,
				y: node.position.y,
				width,
				height,
				color: state.user.color,
			});
		}
	}
	return boxes;
});
</script>

<template>
	<Teleport :to="teleportTarget" :disabled="!teleportTarget">
		<div
			v-for="box in selections"
			:key="box.key"
			:class="$style.selection"
			:style="{
				transform: `translate(${box.x}px, ${box.y}px)`,
				width: `${box.width}px`,
				height: `${box.height}px`,
				borderColor: box.color,
			}"
			data-test-id="canvas-remote-selection"
		/>
	</Teleport>
</template>

<style lang="scss" module>
.selection {
	position: absolute;
	top: 0;
	left: 0;
	border: 4px solid;
	border-radius: var(--radius--lg);
	pointer-events: none;
	box-sizing: border-box;
	// Below remote cursors (z-index 10), above canvas nodes.
	z-index: 9;
}
</style>
