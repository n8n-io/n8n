<script setup lang="ts">
import { computed } from 'vue';
import type { AgentNode, ConnectionLine } from '../agents.types';

const CARD_WIDTH = 240;
const CARD_HEIGHT = 110;

const props = defineProps<{
	connections: ConnectionLine[];
	agents: AgentNode[];
}>();

const emit = defineEmits<{
	'remove-connection': [lineId: string];
}>();

function getCenter(agent: AgentNode) {
	return {
		x: agent.position.x + CARD_WIDTH / 2,
		y: agent.position.y + CARD_HEIGHT / 2,
	};
}

const paths = computed(() =>
	props.connections
		.map((conn) => {
			const from = props.agents.find((a) => a.id === conn.fromAgentId);
			const to = props.agents.find((a) => a.id === conn.toAgentId);
			if (!from || !to) return null;

			const start = getCenter(from);
			const end = getCenter(to);
			const dx = (end.x - start.x) * 0.4;

			return {
				id: conn.id,
				d: `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`,
			};
		})
		.filter(Boolean),
);
</script>

<template>
	<svg :class="$style.overlay">
		<g v-for="path in paths" :key="path!.id">
			<!-- Invisible wider stroke for easier click targeting -->
			<path
				:d="path!.d"
				fill="none"
				stroke="transparent"
				stroke-width="16"
				:class="$style.hitArea"
				@click="emit('remove-connection', path!.id)"
			/>
			<!-- Visible dashed line -->
			<path
				:d="path!.d"
				fill="none"
				stroke="var(--color--text--tint-2)"
				stroke-width="2"
				stroke-dasharray="6 4"
				:class="$style.line"
				@click="emit('remove-connection', path!.id)"
			/>
		</g>
	</svg>
</template>

<style lang="scss" module>
.overlay {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 2;
}

.hitArea {
	pointer-events: stroke;
	cursor: pointer;
}

.line {
	pointer-events: stroke;
	cursor: pointer;
	transition: stroke 0.15s ease;

	&:hover,
	.hitArea:hover + & {
		stroke: var(--color--danger);
		stroke-width: 3;
	}
}
</style>
