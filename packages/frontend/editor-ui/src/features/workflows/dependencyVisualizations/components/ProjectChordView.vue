<script lang="ts" setup>
import type { DependencyGraphResponse } from '@n8n/api-types';
import * as d3 from 'd3';
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';

import { buildProjectFlows } from '../dependencyVisualizations.utils';

const props = defineProps<{
	graph: DependencyGraphResponse;
}>();

const container = useTemplateRef<HTMLDivElement>('container');
let resizeObserver: ResizeObserver | null = null;

const data = computed(() => {
	const { flows, projects } = buildProjectFlows(props.graph);
	const projectNames = new Map(props.graph.projects.map((p) => [p.id, p.name]));
	const indexById = new Map(projects.map((id, i) => [id, i]));
	const matrix: number[][] = projects.map(() => projects.map(() => 0));
	for (const flow of flows) {
		const i = indexById.get(flow.source);
		const j = indexById.get(flow.target);
		if (i === undefined || j === undefined) continue;
		matrix[i][j] = flow.value;
	}
	return {
		projects,
		matrix,
		labels: projects.map((id) => projectNames.get(id) ?? id),
		totalFlows: flows.reduce((sum, f) => sum + f.value, 0),
	};
});

function render() {
	if (!container.value) return;
	const host = container.value;
	host.innerHTML = '';
	const { projects, matrix, labels, totalFlows } = data.value;

	if (projects.length < 2 || totalFlows === 0) {
		host.innerHTML =
			'<div style="padding: 1rem; color: var(--color-text-light)">No cross-project dependencies detected. Workflows aren\'t calling, erroring into, or sharing resources across projects.</div>';
		return;
	}

	const width = host.clientWidth || 800;
	const height = host.clientHeight || 600;
	const size = Math.min(width, height);
	const innerRadius = size / 2 - 140;
	const outerRadius = innerRadius + 14;

	const svg = d3
		.select(host)
		.append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('viewBox', [-width / 2, -height / 2, width, height])
		.style('background', 'var(--color-background-xlight)');

	const chord = d3
		.chordDirected()
		.padAngle(0.04)
		.sortSubgroups(d3.descending)
		.sortChords(d3.descending);
	const chords = chord(matrix);

	const palette = d3.schemeTableau10.concat(d3.schemeSet3);
	const color = (i: number) => palette[i % palette.length];

	const arc = d3.arc<d3.ChordGroup>().innerRadius(innerRadius).outerRadius(outerRadius);

	const ribbon = d3
		.ribbonArrow<d3.Chord, d3.ChordSubgroup>()
		.radius(innerRadius - 2)
		.padAngle(0.005);

	svg
		.append('g')
		.attr('fill-opacity', 0.55)
		.selectAll('path')
		.data(chords)
		.join('path')
		.attr('d', ribbon)
		.attr('fill', (d) => color(d.source.index))
		.attr('stroke', (d) => color(d.source.index))
		.attr('stroke-opacity', 0.4)
		.append('title')
		.text(
			(d) =>
				`${labels[d.source.index]} → ${labels[d.target.index]}\n${d.source.value} dependencies`,
		);

	const groups = svg.append('g').selectAll('g').data(chords.groups).join('g');

	groups
		.append('path')
		.attr('fill', (d) => color(d.index))
		.attr('stroke', (d) => color(d.index))
		.attr('d', arc)
		.append('title')
		.text((d) => `${labels[d.index]}\n${d.value} outgoing dependencies`);

	groups
		.append('text')
		.each((d) => {
			(d as d3.ChordGroup & { angle: number }).angle = (d.startAngle + d.endAngle) / 2;
		})
		.attr('dy', '.35em')
		.attr('transform', (d) => {
			const angle = ((d as d3.ChordGroup & { angle: number }).angle * 180) / Math.PI - 90;
			return `rotate(${angle}) translate(${outerRadius + 8}) ${angle > 90 ? 'rotate(180)' : ''}`;
		})
		.attr('text-anchor', (d) =>
			((d as d3.ChordGroup & { angle: number }).angle * 180) / Math.PI - 90 > 90 ? 'end' : 'start',
		)
		.attr('fill', 'var(--color-text-base)')
		.attr('font-size', '11px')
		.text((d) => {
			const label = labels[d.index];
			return label.length > 26 ? `${label.slice(0, 25)}…` : label;
		})
		.append('title')
		.text((d) => labels[d.index]);
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

watch(
	() => props.graph,
	() => render(),
	{ deep: true },
);
</script>

<template>
	<div :class="$style.wrapper">
		<aside :class="$style.sidebar">
			<div :class="$style.section">
				<h4 :class="$style.heading">About</h4>
				<p :class="$style.hint">
					Arrows flow from a project to projects whose resources its workflows depend on
					(sub-workflow calls, error workflows, shared credentials, shared data tables).
				</p>
				<p :class="$style.hint">
					Thicker arcs mean stronger coupling. Self-loops are hidden so the visualisation highlights
					cross-project entanglement.
				</p>
			</div>
			<div :class="$style.section">
				<h4 :class="$style.heading">Stats</h4>
				<p :class="$style.hint">
					{{ data.projects.length }} projects · {{ data.totalFlows }} cross-project dependency links
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
	flex: 0 0 240px;
	overflow-y: auto;
	padding: var(--spacing--sm);
	background: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size--2xs);
}

.section {
	margin-bottom: var(--spacing--md);
}

.heading {
	margin: 0 0 var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 0.05em;
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
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	background: var(--color-background-xlight);
	overflow: auto;
}
</style>
