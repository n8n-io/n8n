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
const { viewport } = useVueFlow();

const cursors = computed(() =>
	[...props.states.entries()]
		.filter(([, state]) => state.cursor)
		.map(([clientId, state]) => ({
			clientId,
			x: state.cursor?.x ?? 0,
			y: state.cursor?.y ?? 0,
			name: state.user.name,
			color: state.user.color,
		})),
);

// The teleport target (.vue-flow__transformationpane) is scaled by the
// viewport zoom; counter-scale so cursors keep a constant on-screen size.
const counterScale = computed(() => 1 / (viewport.value.zoom || 1));
</script>

<template>
	<Teleport :to="teleportTarget" :disabled="!teleportTarget">
		<div
			v-for="cursor in cursors"
			:key="cursor.clientId"
			:class="$style.cursor"
			:style="{ transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${counterScale})` }"
			data-test-id="canvas-remote-cursor"
		>
			<svg :class="$style.pointer" width="18" height="18" viewBox="0 0 18 18" fill="none">
				<path
					d="M3 2l11 5.5-4.7 1.6-1.6 4.7L3 2z"
					:fill="cursor.color"
					stroke="white"
					stroke-width="1"
				/>
			</svg>
			<span :class="$style.label" :style="{ backgroundColor: cursor.color }">
				{{ cursor.name }}
			</span>
		</div>
	</Teleport>
</template>

<style lang="scss" module>
.cursor {
	position: absolute;
	top: 0;
	left: 0;
	transform-origin: top left;
	pointer-events: none;
	z-index: 10;
	will-change: transform;
}

.pointer {
	display: block;
}

.label {
	position: absolute;
	top: var(--spacing-s);
	left: var(--spacing-3xs);
	padding: var(--spacing-5xs) var(--spacing-3xs);
	border-radius: var(--border-radius-base);
	// Constant white label text: the background is an arbitrary per-user color
	// (broadcast verbatim), so it is theme-independent by design rather than a token.
	color: #fff;
	font-size: var(--font-size-3xs);
	font-weight: var(--font-weight-bold);
	white-space: nowrap;
}
</style>
