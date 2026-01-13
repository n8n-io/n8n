<script lang="ts" setup>
import { useUsersStore } from '@/features/settings/users/users.store';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { computed, markRaw, onMounted, provide } from 'vue';
import { useCanvasSync } from '../composables/useCanvasSync';
import { useWorkflowAwareness } from '../composables/useWorkflowAwareness';
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import { WorkflowAwarenessKey } from '../types/awareness.types';
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

// Set up awareness for real-time collaboration
const awareness = useWorkflowAwareness({ awareness: doc.awareness });

// Provide awareness for child components
provide(WorkflowAwarenessKey, awareness);

// Wire document ↔ Vue Flow (bidirectional sync) and get initial nodes
const initialNodes = useCanvasSync({ doc, instance, awareness });

// User colors for collaboration
const USER_COLORS = [
	'#e91e63',
	'#9c27b0',
	'#673ab7',
	'#3f51b5',
	'#2196f3',
	'#00bcd4',
	'#009688',
	'#4caf50',
	'#ff9800',
	'#ff5722',
];

// Set up local user awareness on mount
const usersStore = useUsersStore();

onMounted(() => {
	const currentUser = usersStore.currentUser;
	if (currentUser && awareness.isReady.value) {
		// Generate a color based on user ID
		const colorIndex =
			currentUser.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
			USER_COLORS.length;

		awareness.setUser({
			id: currentUser.id,
			name: currentUser.firstName ?? currentUser.email ?? 'Anonymous',
			color: USER_COLORS[colorIndex],
		});
	}
});

// Track mouse position for cursor awareness (in flow coordinates)
instance.onPaneMouseMove((event) => {
	if (!awareness.isReady.value) return;

	// Convert screen coordinates to flow coordinates (accounts for pan/zoom)
	const flowCoords = instance.screenToFlowCoordinate({
		x: event.clientX,
		y: event.clientY,
	});

	awareness.updateCursor({
		x: flowCoords.x,
		y: flowCoords.y,
	});
});

function handleMouseLeave() {
	awareness.updateCursor(null);
}

// Zoom for cursor size compensation (inverse scale)
const zoom = computed(() => instance.viewport.value.zoom);
</script>

<template>
	<div :class="$style.canvasWrapper" @mouseleave="handleMouseLeave">
		<VueFlow :id="doc.workflowId" :nodes="initialNodes" :node-types="nodeTypes" fit-view-on-init>
			<!-- Cursors rendered inside viewport (like React Flow's edgelabel-renderer) -->
			<template #zoom-pane>
				<CollaboratorCursors :collaborators="awareness.collaborators" :zoom="zoom" />
			</template>
		</VueFlow>
	</div>
</template>

<style lang="scss" module>
.canvasWrapper {
	position: relative;
	width: 100%;
	height: 100%;
}

.toolbar {
	position: absolute;
	top: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 10;
	display: flex;
	gap: var(--spacing--xs);
}

.button {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background);
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}
</style>
