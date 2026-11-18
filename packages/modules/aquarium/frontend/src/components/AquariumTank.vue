<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { usePreferredReducedMotion, useRafFn, useResizeObserver } from '@vueuse/core';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';

import { PIXEL_SIZE, SAND_HEIGHT } from '../aquarium.constants';
import type { AquariumEntity } from '../aquarium.types';
import { AquariumRenderer } from '../engine/renderer';
import { failureRateOf } from '../engine/scaling';
import {
	clampToTank,
	findCreatureAt,
	spawnCreature,
	stepCreature,
	updateCreature,
	type Creature,
	type TankBounds,
} from '../engine/simulation';
import { defaultTraitRules, deriveTraits, type TraitRule } from '../engine/traits';
import { getSpecies } from '../species/species.registry';

const props = withDefaults(defineProps<{ entities: AquariumEntity[]; rules?: TraitRule[] }>(), {
	rules: () => defaultTraitRules,
});

const emit = defineEmits<{ select: [entity: AquariumEntity] }>();

const i18n = useI18n();
const reducedMotion = usePreferredReducedMotion();

const containerRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const hovered = shallowRef<Creature>();
const pointer = ref({ x: 0, y: 0 });

let renderer: AquariumRenderer | undefined;
let creatures: Creature[] = [];
let bounds: TankBounds = { width: 1, height: 1, floor: 1 };
let time = 0;

function syncCreatures() {
	const existing = new Map(creatures.map((creature) => [creature.entity.key, creature]));
	const next: Creature[] = [];

	for (const entity of props.entities) {
		const traits = deriveTraits(entity, props.rules);
		const species = getSpecies(traits.speciesId);
		if (!species) continue;

		const creature = existing.get(entity.key);
		if (creature) {
			updateCreature(creature, entity, traits, species, bounds);
			next.push(creature);
		} else {
			next.push(spawnCreature(entity, traits, species, bounds));
		}
	}

	// Big creatures go behind small ones, so small ones stay visible and clickable.
	creatures = next.sort((a, b) => b.width * b.height - a.width * a.height);
}

function resize() {
	const container = containerRef.value;
	if (!container || !renderer) return;
	const width = Math.max(1, Math.floor(container.clientWidth / PIXEL_SIZE));
	const height = Math.max(SAND_HEIGHT + 1, Math.floor(container.clientHeight / PIXEL_SIZE));
	bounds = { width, height, floor: height - SAND_HEIGHT };
	renderer.resize(bounds);
	for (const creature of creatures) clampToTank(creature, bounds);
}

onMounted(() => {
	if (!canvasRef.value) return;
	renderer = new AquariumRenderer(canvasRef.value);
	resize();
	syncCreatures();
});

useResizeObserver(containerRef, resize);

watch(() => [props.entities, props.rules], syncCreatures);

useRafFn(({ delta }) => {
	if (!renderer) return;
	// Clamp, so a background tab does not teleport creatures when it comes back.
	const dt = reducedMotion.value === 'reduce' ? 0 : Math.min(delta / 1000, 0.1);
	time += dt;
	for (const creature of creatures) stepCreature(creature, dt, bounds);
	renderer.render(creatures, bounds, time, hovered.value?.entity.key);
});

function onPointerMove(event: PointerEvent) {
	const canvas = canvasRef.value;
	if (!canvas) return;
	const rect = canvas.getBoundingClientRect();
	pointer.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
	hovered.value = findCreatureAt(
		creatures,
		pointer.value.x / PIXEL_SIZE,
		pointer.value.y / PIXEL_SIZE,
	);
}

function onClick() {
	if (hovered.value) emit('select', hovered.value.entity);
}

const tooltip = computed(() => {
	const creature = hovered.value;
	if (!creature) return undefined;
	const { metrics } = creature.entity;
	return {
		name: creature.entity.name,
		kind: i18n.baseText(
			creature.entity.kind === 'agent' ? 'aquarium.kind.agent' : 'aquarium.kind.workflow',
		),
		rows: [
			[i18n.baseText('aquarium.tooltip.complexity'), String(metrics.complexity)],
			[i18n.baseText('aquarium.tooltip.executions'), metrics.executionCount.toLocaleString()],
			[
				i18n.baseText('aquarium.tooltip.failureRate'),
				`${Math.round(failureRateOf(metrics) * 100)}%`,
			],
			[
				i18n.baseText('aquarium.tooltip.averageRunTime'),
				i18n.displayTimer(metrics.averageRunTimeMs, true),
			],
		],
	};
});

const ariaLabel = computed(() =>
	i18n.baseText('aquarium.tank.ariaLabel', {
		interpolate: { count: String(props.entities.length) },
	}),
);
</script>

<template>
	<div ref="containerRef" :class="$style.tank">
		<canvas
			ref="canvasRef"
			:class="[$style.canvas, { [$style.pointer]: !!hovered }]"
			role="img"
			:aria-label="ariaLabel"
			data-test-id="aquarium-canvas"
			@pointermove="onPointerMove"
			@pointerleave="hovered = undefined"
			@click="onClick"
		/>
		<div
			v-if="tooltip"
			:class="$style.tooltip"
			:style="{ left: `${pointer.x}px`, top: `${pointer.y}px` }"
			data-test-id="aquarium-tooltip"
		>
			<div :class="$style.tooltipTitle">{{ tooltip.name }}</div>
			<div :class="$style.tooltipKind">{{ tooltip.kind }}</div>
			<dl :class="$style.tooltipRows">
				<template v-for="[label, value] in tooltip.rows" :key="label">
					<dt>{{ label }}</dt>
					<dd>{{ value }}</dd>
				</template>
			</dl>
		</div>
	</div>
</template>

<style lang="scss" module>
.tank {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.canvas {
	display: block;
	width: 100%;
	height: 100%;
	image-rendering: pixelated;
}

.pointer {
	cursor: pointer;
}

.tooltip {
	position: absolute;
	transform: translate(var(--spacing--sm), var(--spacing--sm));
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--sm);
	font-size: var(--font-size--2xs);
	pointer-events: none;
	white-space: nowrap;
}

.tooltipTitle {
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.tooltipKind {
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--3xs);
}

.tooltipRows {
	display: grid;
	grid-template-columns: auto auto;
	column-gap: var(--spacing--xs);
	margin: 0;

	dt {
		color: var(--color--text--tint-1);
	}

	dd {
		margin: 0;
		text-align: right;
	}
}
</style>
