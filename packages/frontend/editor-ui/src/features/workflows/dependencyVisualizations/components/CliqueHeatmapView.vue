<script lang="ts" setup>
import type { DependencyGraphResponse } from '@n8n/api-types';
import * as d3 from 'd3';
import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	useCssModule,
	useTemplateRef,
	watch,
} from 'vue';

import { buildWorkflowAffinity } from '../dependencyVisualizations.utils';

const props = defineProps<{
	graph: DependencyGraphResponse;
}>();

const styles = useCssModule();

const container = useTemplateRef<HTMLDivElement>('container');
const order = ref<'cluster' | 'name' | 'project'>('cluster');
const metric = ref<'shared' | 'jaccard'>('shared');
const minShared = ref(1);
let resizeObserver: ResizeObserver | null = null;

const affinity = computed(() => buildWorkflowAffinity(props.graph));

/**
 * Greedy reordering of workflows so heavily-coupled ones cluster on the
 * diagonal. We treat affinity as similarity, do a nearest-neighbor walk
 * starting from the highest-degree node, and append nodes by the strongest
 * remaining link. This is cheap (no eigen decomposition) and produces nice
 * block patterns on the kind of graphs n8n produces in practice.
 */
function clusterOrder(): string[] {
	const a = affinity.value;
	const neighbours = new Map<string, Map<string, number>>();
	for (const w of a.workflows) neighbours.set(w.id, new Map());
	for (const cell of a.cells) {
		const w = metric.value === 'shared' ? cell.shared : cell.jaccard;
		neighbours.get(cell.a)!.set(cell.b, w);
		neighbours.get(cell.b)!.set(cell.a, w);
	}
	const remaining = new Set(a.workflows.map((w) => w.id));
	const ordered: string[] = [];
	while (remaining.size > 0) {
		let seed: string | null = null;
		let seedDegree = -1;
		for (const id of remaining) {
			const deg = neighbours.get(id)!.size;
			if (deg > seedDegree) {
				seedDegree = deg;
				seed = id;
			}
		}
		if (!seed) break;
		ordered.push(seed);
		remaining.delete(seed);
		let cursor = seed;
		while (remaining.size > 0) {
			const candidates = neighbours.get(cursor)!;
			let best: string | null = null;
			let bestWeight = -Infinity;
			for (const [id, weight] of candidates) {
				if (!remaining.has(id)) continue;
				if (weight > bestWeight) {
					bestWeight = weight;
					best = id;
				}
			}
			if (!best) break;
			ordered.push(best);
			remaining.delete(best);
			cursor = best;
		}
	}
	return ordered;
}

const orderedIds = computed(() => {
	const a = affinity.value;
	switch (order.value) {
		case 'name':
			return [...a.workflows].sort((x, y) => x.name.localeCompare(y.name)).map((w) => w.id);
		case 'project':
			return [...a.workflows]
				.sort((x, y) => {
					const px = x.projectId ?? 'zzz';
					const py = y.projectId ?? 'zzz';
					if (px !== py) return px.localeCompare(py);
					return x.name.localeCompare(y.name);
				})
				.map((w) => w.id);
		case 'cluster':
		default:
			return clusterOrder();
	}
});

function render() {
	if (!container.value) return;
	const host = container.value;
	host.innerHTML = '';
	const a = affinity.value;
	if (a.workflows.length === 0) {
		host.innerHTML =
			'<div style="padding: 1rem; color: var(--color-text-light)">No workflows share credentials or data tables yet.</div>';
		return;
	}

	const ids = orderedIds.value;
	const indexById = new Map(ids.map((id, i) => [id, i]));
	const nameById = new Map(a.workflows.map((w) => [w.id, w]));
	const cells = a.cells.filter((c) => c.shared >= minShared.value);

	const labelWidth = 180;
	const margin = { top: 110, right: 30, bottom: 30, left: labelWidth + 12 };
	const hostWidth = host.clientWidth || 800;
	const hostHeight = host.clientHeight || 600;
	const matrixWidth = Math.max(200, hostWidth - margin.left - margin.right);
	const matrixHeight = Math.max(200, hostHeight - margin.top - margin.bottom);
	const cellSize = Math.max(6, Math.min(matrixWidth / ids.length, matrixHeight / ids.length));

	const width = margin.left + cellSize * ids.length + margin.right;
	const height = margin.top + cellSize * ids.length + margin.bottom;

	const svg = d3
		.select(host)
		.append('svg')
		.attr('class', styles.heatmapSvg)
		.attr('width', width)
		.attr('height', height);

	const root = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

	const scale =
		metric.value === 'jaccard'
			? d3.scaleSequential(d3.interpolateInferno).domain([0, 1])
			: d3.scaleSequential(d3.interpolateInferno).domain([0, Math.max(1, a.max)]);

	root
		.append('rect')
		.attr('width', cellSize * ids.length)
		.attr('height', cellSize * ids.length)
		.attr('fill', 'var(--color-background-light)');

	const grid = root.append('g');
	for (const cell of cells) {
		const i = indexById.get(cell.a);
		const j = indexById.get(cell.b);
		if (i === undefined || j === undefined) continue;
		const value = metric.value === 'jaccard' ? cell.jaccard : cell.shared;
		const colour = scale(value);
		for (const [x, y] of [
			[i, j],
			[j, i],
		]) {
			grid
				.append('rect')
				.attr('x', x * cellSize)
				.attr('y', y * cellSize)
				.attr('width', cellSize)
				.attr('height', cellSize)
				.attr('fill', colour)
				.append('title')
				.text(
					`${nameById.get(cell.a)?.name ?? cell.a} ↔ ${
						nameById.get(cell.b)?.name ?? cell.b
					}\nshared resources: ${cell.shared}\njaccard: ${cell.jaccard.toFixed(2)}`,
				);
		}
	}

	// Diagonal: self cells get a muted shade so the matrix reads as a true matrix.
	for (let i = 0; i < ids.length; i++) {
		grid
			.append('rect')
			.attr('x', i * cellSize)
			.attr('y', i * cellSize)
			.attr('width', cellSize)
			.attr('height', cellSize)
			.attr('fill', 'var(--color-foreground-base)')
			.attr('opacity', 0.35);
	}

	const yLabels = root
		.append('g')
		.selectAll('text')
		.data(ids)
		.join('text')
		.attr('x', -6)
		.attr('y', (_, i) => i * cellSize + cellSize / 2)
		.attr('text-anchor', 'end')
		.attr('dominant-baseline', 'middle')
		.attr('font-size', Math.min(11, cellSize - 2))
		.attr('fill', 'currentColor')
		.text((id) => nameById.get(id)?.name ?? id);
	yLabels.append('title').text((id) => nameById.get(id)?.name ?? id);

	const xLabels = root
		.append('g')
		.selectAll('text')
		.data(ids)
		.join('text')
		.attr('transform', (_, i) => `translate(${i * cellSize + cellSize / 2}, -8) rotate(-50)`)
		.attr('text-anchor', 'start')
		.attr('font-size', Math.min(11, cellSize - 2))
		.attr('fill', 'currentColor')
		.text((id) => nameById.get(id)?.name ?? id);
	xLabels.append('title').text((id) => nameById.get(id)?.name ?? id);
}

onMounted(() => {
	render();
	if (container.value) {
		resizeObserver = new ResizeObserver(() => render());
		resizeObserver.observe(container.value);
	}
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
	resizeObserver = null;
});

watch([order, metric, minShared, () => props.graph], () => render(), { deep: true });
</script>

<template>
	<div :class="$style.wrapper">
		<aside :class="$style.sidebar">
			<div :class="$style.section">
				<h4 :class="$style.heading">Ordering</h4>
				<label v-for="opt in ['cluster', 'name', 'project'] as const" :key="opt">
					<input v-model="order" type="radio" :value="opt" />
					{{ opt === 'cluster' ? 'Clustered' : opt === 'name' ? 'Workflow name' : 'Project' }}
				</label>
			</div>
			<div :class="$style.section">
				<h4 :class="$style.heading">Score</h4>
				<label v-for="opt in ['shared', 'jaccard'] as const" :key="opt">
					<input v-model="metric" type="radio" :value="opt" />
					{{ opt === 'shared' ? 'Shared count' : 'Jaccard index' }}
				</label>
			</div>
			<div :class="$style.section">
				<h4 :class="$style.heading">Minimum shared</h4>
				<input v-model.number="minShared" type="range" min="1" :max="Math.max(1, affinity.max)" />
				<div :class="$style.value">≥ {{ minShared }}</div>
			</div>
			<div :class="$style.section">
				<p :class="$style.hint">
					Bright cells are workflow pairs that share credentials or data tables. Clustered order
					pushes tightly-coupled cliques onto the diagonal.
				</p>
				<p :class="$style.hint">
					{{ affinity.workflows.length }} workflows · {{ affinity.cells.length }} coupled pairs ·
					max shared = {{ affinity.max }}
				</p>
			</div>
		</aside>
		<div ref="container" :class="$style.canvas" />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	height: 100%;
	min-height: 0;
	gap: var(--spacing--sm);
}

.sidebar {
	flex: 0 0 220px;
	overflow-y: auto;
	padding: var(--spacing--sm);
	background: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size--2xs);
}

.section {
	margin-bottom: var(--spacing--md);

	label {
		display: flex;
		align-items: center;
		gap: var(--spacing--3xs);
		padding: var(--spacing--4xs) 0;
		cursor: pointer;
		user-select: none;
	}

	input[type='range'] {
		width: 100%;
	}
}

.heading {
	margin: 0 0 var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 0.05em;
}

.value {
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
}

.hint {
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
	margin: 0 0 var(--spacing--3xs);
	line-height: 1.4;
}

.canvas {
	flex: 1;
	min-width: 0;
	min-height: 0;
	overflow: auto;
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	background: var(--color-background-xlight);
}

.heatmapSvg {
	background: var(--color-background-xlight);
	// Use the new double-dash semantic token so the colour resolves in both
	// themes (legacy single-dash tokens are undefined in dark mode).
	// SVG <text> uses fill: currentColor to inherit this.
	color: var(--color--text--shade-1);
}
</style>
