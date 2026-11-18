<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onKeyStroke, usePreferredReducedMotion, useRafFn, useResizeObserver } from '@vueuse/core';
import { computed, onMounted, ref, shallowRef, triggerRef, watch } from 'vue';

import { DRAG_THRESHOLD, LIVE_SPEED, PROJECT_LABEL_MIN_WIDTH, ZOOM } from '../aquarium.constants';
import { displayProjectName } from '../aquarium.utils';
import type {
	ActivitySnapshot,
	AquariumEntity,
	CreatureTraits,
	TankGrouping,
} from '../aquarium.types';
import {
	clampCamera,
	fitCamera,
	panBy,
	worldSizeFor,
	zoomAt,
	type Camera,
	type Point,
	type Size,
	type Viewport,
} from '../engine/camera';
import {
	packTanks,
	regionAt,
	singleRegion,
	type TankContent,
	type TankRegion,
} from '../engine/layout';
import { AquariumRenderer } from '../engine/renderer';
import { failureRateOf, recentRate } from '../engine/scaling';
import {
	findCreatureAt,
	spawnCreature,
	stepCreature,
	updateCreature,
	type Creature,
} from '../engine/simulation';
import { defaultTraitRules, deriveTraits, type TraitRule } from '../engine/traits';
import { getSpecies } from '../species/species.registry';
import { spriteSize, type SpeciesDefinition } from '../species/species.types';

const props = withDefaults(
	defineProps<{
		entities: AquariumEntity[];
		activity?: ActivitySnapshot;
		rules?: TraitRule[];
		grouping?: TankGrouping;
		/** CSS pixels at the top that page UI covers. Project view fits its tanks below them. */
		topInset?: number;
	}>(),
	{ activity: undefined, rules: () => defaultTraitRules, grouping: 'single', topInset: 0 },
);

const SINGLE_TANK_ID = 'all';
const NO_PROJECT_ID = 'no-project';

const emit = defineEmits<{ select: [entity: AquariumEntity] }>();

const i18n = useI18n();
const reducedMotion = usePreferredReducedMotion();

const containerRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const hovered = shallowRef<Creature>();
/** A clicked creature. Its popup stays open, keeps updating, and takes clicks. */
const pinned = shallowRef<Creature>();
const pointer = ref({ x: 0, y: 0 });
const pinnedAt = ref({ x: 0, y: 0 });
const tankSize = ref({ width: 0, height: 0 });
const isDragging = ref(false);
/** Tanks on the wall. Reactive, so the project labels follow them. */
const regions = shallowRef<TankRegion[]>([]);
/** Changes on every camera move, so the project labels follow the camera. */
const cameraVersion = ref(0);

let renderer: AquariumRenderer | undefined;
let creatures: Creature[] = [];
let creaturesByTank = new Map<string, Creature[]>();
let regionsById = new Map<string, TankRegion>();
/** Element size in CSS pixels. In project view it has the top inset, so labels stay visible. */
let viewport: Viewport = { width: 1, height: 1 };
/** Size of all tanks together, in logical pixels. The camera shows a part of it. */
let world: Size = { width: 1, height: 1 };
let camera: Camera = { x: 0, y: 0, zoom: ZOOM.default };
/** After the user zooms or pans, a new world size keeps their view and does not fit again. */
let hasUserMovedCamera = false;
let drag: { start: Point; camera: Camera; moved: boolean } | undefined;
let suppressNextClick = false;
let time = 0;

function applyCamera(next: Camera) {
	camera = clampCamera(next, viewport, world);
	renderer?.setViewSize({
		width: viewport.width / camera.zoom,
		height: viewport.height / camera.zoom,
	});
	cameraVersion.value++;
}

interface PlannedCreature {
	entity: AquariumEntity;
	traits: CreatureTraits;
	species: SpeciesDefinition;
	tankId: string;
	width: number;
	height: number;
}

function tankOf(entity: AquariumEntity): { id: string; label: string } {
	if (props.grouping === 'single') return { id: SINGLE_TANK_ID, label: '' };
	if (!entity.project) return { id: NO_PROJECT_ID, label: i18n.baseText('aquarium.noProject') };
	return { id: entity.project.id, label: displayProjectName(entity.project.name) };
}

/** Lays out the tanks for the planned creatures, and sets `world` and `regions`. */
function layoutTanks(planned: PlannedCreature[]) {
	const contents = new Map<string, TankContent>();
	for (const { entity, tankId, width, height } of planned) {
		const content = contents.get(tankId) ?? {
			id: tankId,
			label: tankOf(entity).label,
			creatureArea: 0,
			widestCreature: 0,
			tallestCreature: 0,
		};
		content.creatureArea += width * height;
		content.widestCreature = Math.max(content.widestCreature, width);
		content.tallestCreature = Math.max(content.tallestCreature, height);
		contents.set(tankId, content);
	}

	if (props.grouping === 'single') {
		const area = contents.get(SINGLE_TANK_ID)?.creatureArea ?? 0;
		world = worldSizeFor(area, viewport);
		regions.value = [singleRegion(SINGLE_TANK_ID, world)];
	} else {
		// The wall takes the shape of the free area below the page header.
		const freeHeight = Math.max(1, viewport.height - (viewport.insetTop ?? 0));
		const packed = packTanks([...contents.values()], viewport.width / freeHeight);
		world = packed.world;
		regions.value = packed.regions;
	}
	regionsById = new Map(regions.value.map((region) => [region.id, region]));
	renderer?.setRegions(regions.value);
}

function syncCreatures() {
	const existing = new Map(creatures.map((creature) => [creature.entity.key, creature]));
	const previousRegions = regionsById;
	const planned: PlannedCreature[] = [];

	for (const entity of props.entities) {
		const traits = deriveTraits(entity, props.rules);
		const species = getSpecies(traits.speciesId);
		if (!species) continue;
		const size = spriteSize(species.sprite);
		planned.push({
			entity,
			traits,
			species,
			tankId: tankOf(entity).id,
			width: size.width * traits.scale,
			height: size.height * traits.scale,
		});
	}

	// The tanks get their new size first, so new creatures are placed over all of a tank.
	layoutTanks(planned);

	const next = planned.map(({ entity, traits, species, tankId }) => {
		const bounds = regionsById.get(tankId)?.bounds ?? singleRegion(tankId, world).bounds;
		const creature = existing.get(entity.key);
		if (!creature) return spawnCreature(entity, traits, species, bounds, Math.random, tankId);

		// A creature keeps its relative position when its tank changes or resizes.
		const previous = previousRegions.get(creature.tankId)?.bounds;
		if (previous && previous !== bounds) {
			creature.x *= bounds.width / previous.width;
			creature.y *= bounds.floor / previous.floor;
			creature.targetY *= bounds.floor / previous.floor;
		}
		creature.tankId = tankId;
		updateCreature(creature, entity, traits, species, bounds);
		return creature;
	});

	// Big creatures go behind small ones, so small ones stay visible and clickable.
	creatures = next.sort((a, b) => b.width * b.height - a.width * a.height);
	creaturesByTank = new Map();
	for (const creature of creatures) {
		const list = creaturesByTank.get(creature.tankId) ?? [];
		list.push(creature);
		creaturesByTank.set(creature.tankId, list);
	}

	applyCamera(hasUserMovedCamera ? camera : fitCamera(viewport, world));

	if (pinned.value) {
		// The creature object is kept and changed in place, so tell the popup to read it again.
		if (creatures.includes(pinned.value)) triggerRef(pinned);
		else pinned.value = undefined;
	}
}

function applyActivity() {
	for (const creature of creatures) {
		creature.activity = props.activity?.byKey.get(creature.entity.key);
	}
}

function resize() {
	const container = containerRef.value;
	if (!container || !renderer) return;
	viewport = {
		width: Math.max(1, container.clientWidth),
		height: Math.max(1, container.clientHeight),
		insetTop: props.grouping === 'project' ? props.topInset : 0,
	};
	tankSize.value = { width: viewport.width, height: viewport.height };
	// The viewport sets the single tank size and the wall shape, so lay out again.
	syncCreatures();
}

onMounted(() => {
	if (!canvasRef.value) return;
	renderer = new AquariumRenderer(canvasRef.value);
	resize();
	applyActivity();
});

useResizeObserver(containerRef, resize);

watch(
	() => [props.entities, props.rules],
	() => {
		syncCreatures();
		applyActivity();
	},
);
watch(
	() => [props.grouping, props.topInset],
	() => {
		// A new layout is a new picture: show all of it.
		hasUserMovedCamera = false;
		resize();
	},
);
watch(() => props.activity, applyActivity);

useRafFn(({ delta }) => {
	if (!renderer) return;
	// Clamp, so a background tab does not teleport creatures when it comes back.
	const dt = reducedMotion.value === 'reduce' ? 0 : Math.min(delta / 1000, 0.1);
	time += dt;
	for (const creature of creatures) {
		const bounds = regionsById.get(creature.tankId)?.bounds;
		if (bounds) stepCreature(creature, dt, bounds);
	}
	renderer.render(creaturesByTank, camera, time, (pinned.value ?? hovered.value)?.entity.key);
});

function pointFrom(event: MouseEvent): Point {
	const rect = containerRef.value?.getBoundingClientRect();
	return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
}

/** Logical pixels for each CSS pixel. Uses the real canvas size, which is rounded. */
function canvasScale(): Point {
	const canvas = canvasRef.value;
	return {
		x: canvas ? canvas.width / viewport.width : 1 / camera.zoom,
		y: canvas ? canvas.height / viewport.height : 1 / camera.zoom,
	};
}

function toWorld(point: Point): Point {
	const scale = canvasScale();
	return {
		x: Math.round(camera.x) + point.x * scale.x,
		y: Math.round(camera.y) + point.y * scale.y,
	};
}

/** The creature under a screen point. Creature positions are local to their tank. */
function creatureAt(point: Point): Creature | undefined {
	const at = toWorld(point);
	const region = regionAt(regions.value, at.x, at.y);
	if (!region) return undefined;
	return findCreatureAt(creaturesByTank.get(region.id) ?? [], at.x - region.x, at.y - region.y);
}

/** Labels for the project tanks that are on screen and wide enough to read. */
const projectLabels = computed(() => {
	// Read the version, so the labels move with the camera.
	if (cameraVersion.value < 0 || props.grouping === 'single') return [];
	const scale = canvasScale();
	const left = Math.round(camera.x);
	const top = Math.round(camera.y);
	return regions.value.flatMap((region) => {
		const x = (region.x - left) / scale.x;
		const y = (region.y - top) / scale.y;
		const width = region.bounds.width / scale.x;
		const height = region.bounds.height / scale.y;
		const onScreen = x + width > 0 && x < viewport.width && y + height > 0 && y < viewport.height;
		if (!onScreen || width < PROJECT_LABEL_MIN_WIDTH) return [];
		return [{ id: region.id, label: region.label, x, y, maxWidth: width }];
	});
});

function onPointerDown(event: PointerEvent) {
	if (event.button !== 0) return;
	drag = { start: pointFrom(event), camera, moved: false };
	canvasRef.value?.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
	pointer.value = pointFrom(event);

	if (drag && event.buttons & 1) {
		const delta = { x: pointer.value.x - drag.start.x, y: pointer.value.y - drag.start.y };
		if (drag.moved || Math.hypot(delta.x, delta.y) >= DRAG_THRESHOLD) {
			drag.moved = true;
			isDragging.value = true;
			hovered.value = undefined;
			hasUserMovedCamera = true;
			applyCamera(panBy(drag.camera, delta, viewport, world));
			return;
		}
	}

	hovered.value = creatureAt(pointer.value);
}

function onPointerUp() {
	// The browser still sends `click` after a drag. It must not pin or unpin.
	if (drag?.moved) suppressNextClick = true;
	drag = undefined;
	isDragging.value = false;
}

function onPointerLeave() {
	if (!drag) hovered.value = undefined;
}

function onWheel(event: WheelEvent) {
	// Line mode (Firefox) reports about 3 for one step. Pixel mode reports about 100.
	const pixels = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
	hasUserMovedCamera = true;
	applyCamera(zoomAt(camera, ZOOM.wheelStep ** (-pixels / 100), pointFrom(event), viewport, world));
}

function zoomBy(factor: number) {
	hasUserMovedCamera = true;
	const centre = { x: viewport.width / 2, y: viewport.height / 2 };
	applyCamera(zoomAt(camera, factor, centre, viewport, world));
}

function showAll() {
	hasUserMovedCamera = false;
	applyCamera(fitCamera(viewport, world));
}

/** A click on a creature pins its popup. A click on the water closes it. */
function onClick() {
	if (suppressNextClick) {
		suppressNextClick = false;
		return;
	}
	pinned.value = hovered.value;
	if (hovered.value) pinnedAt.value = { ...pointer.value };
}

function unpin() {
	pinned.value = undefined;
}

function openPinned() {
	if (pinned.value) emit('select', pinned.value.entity);
}

onKeyStroke('Escape', unpin);

function liveRows(key: string): Array<[string, string]> {
	const windowSeconds = props.activity?.windowSeconds ?? 0;
	if (windowSeconds === 0) return [];
	const activity = props.activity?.byKey.get(key);
	const interpolate = { seconds: String(windowSeconds) };
	return [
		[i18n.baseText('aquarium.tooltip.runningNow'), String(activity?.running ?? 0)],
		[
			i18n.baseText('aquarium.tooltip.runsPerSecond', {
				interpolate: { seconds: String(LIVE_SPEED.rateSeconds) },
			}),
			recentRate(activity?.startedPerSecond ?? []).toFixed(1),
		],
		[i18n.baseText('aquarium.tooltip.recentRuns', { interpolate }), String(activity?.started ?? 0)],
		[
			i18n.baseText('aquarium.tooltip.recentFailures', { interpolate }),
			String(activity?.failed ?? 0),
		],
	];
}

const tooltip = computed(() => {
	const creature = pinned.value ?? hovered.value;
	if (!creature) return undefined;
	const { metrics } = creature.entity;
	return {
		isPinned: creature === pinned.value,
		canOpen: creature.entity.route !== undefined,
		name: creature.entity.name,
		kind: i18n.baseText(
			creature.entity.kind === 'agent' ? 'aquarium.kind.agent' : 'aquarium.kind.workflow',
		),
		rows: [
			...(creature.entity.project
				? [
						[
							i18n.baseText('aquarium.tooltip.project'),
							displayProjectName(creature.entity.project.name),
						],
					]
				: []),
			[i18n.baseText('aquarium.tooltip.complexity'), String(metrics.complexity)],
			[i18n.baseText('aquarium.tooltip.executions'), metrics.executionCount.toLocaleString()],
			[
				i18n.baseText('aquarium.tooltip.failureRate'),
				`${Math.round(failureRateOf(metrics) * 100)}%`,
			],
			[
				i18n.baseText('aquarium.tooltip.averageRunTime'),
				i18n.displayTimer(Math.round(metrics.averageRunTimeMs), true),
			],
			...liveRows(creature.entity.key),
		],
	};
});

/** Opens the popup toward the middle of the tank, so it is not cut off at an edge. */
const tooltipStyle = computed(() => {
	const { x, y } = tooltip.value?.isPinned ? pinnedAt.value : pointer.value;
	const gap = 'var(--spacing--sm)';
	const shiftX = x > tankSize.value.width / 2 ? `calc(-100% - ${gap})` : gap;
	const shiftY = y > tankSize.value.height / 2 ? `calc(-100% - ${gap})` : gap;
	return { left: `${x}px`, top: `${y}px`, transform: `translate(${shiftX}, ${shiftY})` };
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
			:class="[
				$style.canvas,
				{ [$style.pointer]: !!hovered && !isDragging, [$style.dragging]: isDragging },
			]"
			role="img"
			:aria-label="ariaLabel"
			data-test-id="aquarium-canvas"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@pointerleave="onPointerLeave"
			@wheel.prevent="onWheel"
			@click="onClick"
		/>
		<div
			v-for="label in projectLabels"
			:key="label.id"
			:class="$style.projectLabel"
			:style="{
				left: `${label.x}px`,
				top: `${label.y}px`,
				maxWidth: `${label.maxWidth}px`,
			}"
			data-test-id="aquarium-project-label"
		>
			{{ label.label }}
		</div>
		<div :class="$style.zoomControls" data-test-id="aquarium-zoom-controls">
			<N8nButton
				variant="outline"
				size="small"
				icon-only
				:aria-label="i18n.baseText('aquarium.zoom.in')"
				data-test-id="aquarium-zoom-in"
				@click="zoomBy(ZOOM.buttonStep)"
			>
				<template #icon><N8nIcon icon="zoom-in" size="small" /></template>
			</N8nButton>
			<N8nButton
				variant="outline"
				size="small"
				icon-only
				:aria-label="i18n.baseText('aquarium.zoom.out')"
				data-test-id="aquarium-zoom-out"
				@click="zoomBy(1 / ZOOM.buttonStep)"
			>
				<template #icon><N8nIcon icon="zoom-out" size="small" /></template>
			</N8nButton>
			<N8nButton
				variant="outline"
				size="small"
				icon-only
				:aria-label="i18n.baseText('aquarium.zoom.fit')"
				data-test-id="aquarium-zoom-fit"
				@click="showAll"
			>
				<template #icon><N8nIcon icon="maximize" size="small" /></template>
			</N8nButton>
		</div>
		<div
			v-if="tooltip"
			:class="[$style.tooltip, { [$style.pinned]: tooltip.isPinned }]"
			:style="tooltipStyle"
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
			<div v-if="tooltip.isPinned && tooltip.canOpen" :class="$style.tooltipActions">
				<N8nButton
					variant="outline"
					size="mini"
					data-test-id="aquarium-tooltip-open"
					@click="openPinned"
				>
					<template #icon><N8nIcon icon="external-link" size="small" /></template>
					{{ i18n.baseText('aquarium.tooltip.open') }}
				</N8nButton>
			</div>
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
	cursor: grab;
	touch-action: none;
}

.pointer {
	cursor: pointer;
}

.dragging {
	cursor: grabbing;
}

.projectLabel {
	position: absolute;
	transform: translate(var(--spacing--4xs), var(--spacing--4xs));
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--xs);
	background: color-mix(in srgb, var(--color--background--light-3) 80%, transparent);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--3xs);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	pointer-events: none;
}

.zoomControls {
	position: absolute;
	right: var(--spacing--sm);
	bottom: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: color-mix(in srgb, var(--color--background--light-3) 85%, transparent);
	backdrop-filter: blur(4px);
}

.tooltip {
	position: absolute;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--sm);
	font-size: var(--font-size--2xs);
	pointer-events: none;
	white-space: nowrap;
}

.pinned {
	pointer-events: auto;
}

.tooltipActions {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--2xs);
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
