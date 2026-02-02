<script lang="ts" setup>
import { computed } from 'vue';
import type { Collaborator } from '../types/awareness.types';

const props = defineProps<{
	collaborators: Map<number, Collaborator>;
	/** Current zoom level for inverse scale */
	zoom: number;
}>();

// Inverse scale to keep cursor size constant (like React Flow does)
const inverseScale = computed(() => 1 / props.zoom);
</script>

<template>
	<!-- Render in flow coordinates inside zoom-pane (like React Flow's edgelabel-renderer) -->
	<div :class="$style.cursorsContainer">
		<div
			v-for="collaborator in collaborators.values()"
			v-show="collaborator.state.cursor"
			:key="collaborator.clientId"
			:class="$style.cursor"
			:style="{
				transform: collaborator.state.cursor
					? `translate(${collaborator.state.cursor.x}px, ${collaborator.state.cursor.y}px)`
					: undefined,
				'--cursor-color': collaborator.state.user.color,
			}"
		>
			<svg :class="$style.cursorIcon" width="16" height="16" viewBox="0 0 16 16">
				<!-- Apply inverse scale to keep cursor size constant regardless of zoom -->
				<g :style="{ transform: `scale(${inverseScale})` }">
					<path
						d="M0 0L5 13L7 7L13 5L0 0Z"
						fill="var(--cursor-color)"
						stroke="white"
						stroke-width="1"
					/>
				</g>
			</svg>
			<span
				:class="$style.label"
				:style="{
					backgroundColor: collaborator.state.user.color,
					transform: `scale(${inverseScale})`,
					transformOrigin: 'top left',
				}"
			>
				{{ collaborator.state.user.name }}
			</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.cursorsContainer {
	pointer-events: none;
}

.cursor {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1000;
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--4xs);
}

.cursorIcon {
	flex-shrink: 0;
}

.label {
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--radius--sm);
	color: white;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	max-width: 120px;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
