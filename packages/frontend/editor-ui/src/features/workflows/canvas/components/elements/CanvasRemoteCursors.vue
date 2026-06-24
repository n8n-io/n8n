<script setup lang="ts">
import { computed } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import { N8nAvatar } from '@n8n/design-system';
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
			:style="{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }"
			data-test-id="canvas-remote-cursor"
		>
			<div :class="$style.scaler" :style="{ transform: `scale(${counterScale})` }">
				<svg :class="$style.pointer" width="32" height="32" viewBox="0 0 18 18" fill="none">
					<path
						d="M3 2l11 5.5-4.7 1.6-1.6 4.7L3 2z"
						:stroke="cursor.color"
						stroke-width="1.5"
						stroke-linejoin="round"
					/>
				</svg>
				<div :class="$style.label">
					<N8nAvatar
						:class="$style.avatar"
						:first-name="cursor.name"
						size="xxsmall"
						:style="`box-shadow: 0 0 0 1.5px ${cursor.color}`"
					/>
					<span :class="$style.name">{{ cursor.name }}</span>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<style lang="scss" module>
.cursor {
	position: absolute;
	top: 0;
	left: 0;
	pointer-events: none;
	z-index: 10;
	will-change: transform;
	// Glide between the throttled (~100ms) position broadcasts instead of
	// snapping. Linear keeps the motion constant-speed so the cursor lands just
	// as the next update arrives; easing would read as floaty lag.
	transition: transform 100ms linear;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

// Counter-scale lives on its own element so viewport zoom stays instant while
// the translate above transitions. transform-origin keeps the pointer tip
// anchored to the flow coordinate as it scales.
.scaler {
	transform-origin: top left;
}

.pointer {
	display: block;
	filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.15));
}

.label {
	position: absolute;
	top: 20px;
	left: 20px;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 180px;
	padding: var(--spacing--4xs) var(--spacing--xs) var(--spacing--4xs) var(--spacing--4xs);
	border-radius: var(--radius--xl);
	// Constant white label text: the background is an arbitrary per-user color
	// (broadcast verbatim), so it is theme-independent by design rather than a token.
	color: #fff;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
	background: rgba(0, 0, 0, 0.5);
}

.avatar {
	flex-shrink: 0;
	border-radius: 50%;
	// White ring so the avatar reads clearly against the per-user pill color.
	box-shadow: 0 0 0 1.5px #fff;
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
