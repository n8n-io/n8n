<script lang="ts" setup>
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';
import { useUsersStore } from '@/features/settings/users/users.store';
import CanvasBackground from '@/features/workflows/canvas/components/elements/background/CanvasBackground.vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import { computed, markRaw, onMounted } from 'vue';
import { useCanvasAwareness } from '../composables/useCanvasAwareness';
import { useCanvasSync } from '../composables/useCanvasSync';
import { useWorkflowAwarenessInject } from '../composables/useWorkflowAwareness';
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import CollaboratorCursors from './CollaboratorCursors.vue';
import CrdtTestNode from './CrdtTestNode.vue';

// Register custom node types with Vue Flow
const nodeTypes = {
	'crdt-node': markRaw(CrdtTestNode),
};

// Get injected document
const doc = useWorkflowDoc();

// Get VueFlow instance
const instance = useVueFlow(doc.workflowId);

// Inject awareness from parent (CrdtTestContent provides it)
const awareness = useWorkflowAwarenessInject();

// Wire document ↔ Vue Flow (bidirectional sync) and get initial nodes/edges + validation
const { initialNodes, initialEdges, isValidConnection } = useCanvasSync({ doc, instance });

// Wire awareness ↔ Vue Flow (ephemeral state: cursors, selections, live drag)
useCanvasAwareness({ instance, awareness });

// Note: Delete/Backspace key handling is built into Vue Flow via delete-key-code prop (default: Backspace)
// Vue Flow automatically removes selected nodes/edges and triggers onNodesChange/onEdgesChange

/**
 * Generate a visually distinct color from a number using golden ratio distribution.
 * This ensures colors are well-spaced across the hue spectrum regardless of input sequence.
 */
function generateUserColor(seed: number): string {
	// Golden ratio conjugate for optimal distribution
	const goldenRatio = 0.618033988749895;
	// Use seed to generate a hue distributed across the spectrum
	const hue = ((seed * goldenRatio) % 1) * 360;
	// Fixed saturation and lightness for vibrant, readable colors
	return `hsl(${Math.round(hue)}, 70%, 50%)`;
}

// Set up local user awareness on mount
const usersStore = useUsersStore();

onMounted(() => {
	const currentUser = usersStore.currentUser;
	if (currentUser && awareness.isReady.value) {
		// Use CRDT client ID for color - unique per browser tab
		const clientId = awareness.clientId.value ?? 0;

		awareness.setUser({
			id: currentUser.id,
			name: currentUser.firstName ?? currentUser.email ?? 'Anonymous',
			color: generateUserColor(clientId),
		});
	}
});

// Zoom for cursor size compensation (inverse scale)
const zoom = computed(() => instance.viewport.value.zoom);
</script>

<template>
	<div :class="$style.canvasWrapper">
		<VueFlow
			:id="doc.workflowId"
			:nodes="initialNodes"
			:edges="initialEdges"
			:node-types="nodeTypes"
			:is-valid-connection="isValidConnection"
			:delete-key-code="['Backspace', 'Delete']"
			snap-to-grid
			:snap-grid="[GRID_SIZE, GRID_SIZE]"
			fit-view-on-init
			pan-on-scroll
			:min-zoom="0"
			:max-zoom="4"
			edges-selectable
			:apply-default="false"
		>
			<!-- Cursors rendered inside viewport (like React Flow's edgelabel-renderer) -->
			<template #zoom-pane>
				<CollaboratorCursors :collaborators="awareness.collaborators" :zoom="zoom" />
			</template>

			<slot name="canvas-background" v-bind="{ viewport: instance.viewport }">
				<CanvasBackground :viewport="instance.viewport.value" :striped="false" />
			</slot>

			<Transition name="minimap">
				<MiniMap
					aria-label="n8n Minimap"
					:height="120"
					:width="200"
					position="bottom-left"
					pannable
					zoomable
					:node-border-radius="16"
				/>
			</Transition>
		</VueFlow>
	</div>
</template>

<style lang="scss" module>
.canvasWrapper {
	position: relative;
	width: 100%;
	height: 100%;
}
</style>
