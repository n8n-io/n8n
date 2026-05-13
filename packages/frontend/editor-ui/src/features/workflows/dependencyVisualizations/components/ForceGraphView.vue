<script lang="ts" setup>
import type { DependencyEdge, DependencyGraphResponse, DependencyNode } from '@n8n/api-types';
import * as d3 from 'd3';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { edgeColor, nodeColor, nodeRadius } from '../dependencyVisualizations.utils';

const props = defineProps<{
	graph: DependencyGraphResponse;
}>();

const container = useTemplateRef<HTMLDivElement>('container');
const tooltip = ref<{ x: number; y: number; node: DependencyNode } | null>(null);
const hoveredId = ref<string | null>(null);

const kindFilters = ref({
	workflow: true,
	credential: true,
	dataTable: true,
});

const edgeFilters = ref<Record<DependencyEdge['kind'], boolean>>({
	workflowCall: true,
	errorWorkflow: true,
	credentialId: true,
	dataTableId: true,
});

const projectColors = computed(() => {
	const palette = d3.schemeTableau10.concat(d3.schemeSet3);
	const colors = new Map<string, string>();
	props.graph.projects.forEach((p, i) => colors.set(p.id, palette[i % palette.length]));
	return colors;
});

interface SimNode extends d3.SimulationNodeDatum {
	id: string;
	kind: DependencyNode['kind'];
	name: string;
	projectId?: string;
	restricted: boolean;
	fanout: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	kind: DependencyEdge['kind'];
}

let simulation: d3.Simulation<SimNode, SimLink> | null = null;
let resizeObserver: ResizeObserver | null = null;

function render() {
	if (!container.value) return;
	const host = container.value;
	host.innerHTML = '';

	const width = host.clientWidth || 800;
	const height = host.clientHeight || 600;

	const fanouts = new Map<string, number>();
	for (const edge of props.graph.edges) {
		fanouts.set(edge.source, (fanouts.get(edge.source) ?? 0) + 1);
		fanouts.set(edge.target, (fanouts.get(edge.target) ?? 0) + 1);
	}

	const filteredNodes: SimNode[] = props.graph.nodes
		.filter((n) => kindFilters.value[n.kind])
		.map((n) => ({
			id: n.id,
			kind: n.kind,
			name: n.name,
			projectId: n.projectId,
			restricted: n.restricted,
			fanout: fanouts.get(n.id) ?? 0,
		}));

	const visible = new Set(filteredNodes.map((n) => n.id));

	const filteredLinks: SimLink[] = props.graph.edges
		.filter((e) => edgeFilters.value[e.kind] && visible.has(e.source) && visible.has(e.target))
		.map((e) => ({ source: e.source, target: e.target, kind: e.kind }));

	const svg = d3
		.select(host)
		.append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('viewBox', [0, 0, width, height])
		.style('width', '100%')
		.style('height', '100%')
		.style('background', 'var(--color-background-xlight)');

	const root = svg.append('g');

	const zoom = d3
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.1, 4])
		.on('zoom', (event) => root.attr('transform', event.transform));
	svg.call(zoom);

	const defs = svg.append('defs');
	for (const kind of ['workflowCall', 'errorWorkflow', 'credentialId', 'dataTableId'] as const) {
		defs
			.append('marker')
			.attr('id', `arrow-${kind}`)
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 14)
			.attr('refY', 0)
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,-5L10,0L0,5')
			.attr('fill', edgeColor(kind));
	}

	const link = root
		.append('g')
		.attr('stroke-opacity', 0.4)
		.selectAll('line')
		.data(filteredLinks)
		.join('line')
		.attr('stroke', (d) => edgeColor(d.kind))
		.attr('stroke-width', (d) => (d.kind === 'errorWorkflow' ? 1 : 1.2))
		.attr('stroke-dasharray', (d) => (d.kind === 'errorWorkflow' ? '4 3' : null))
		.attr('marker-end', (d) => `url(#arrow-${d.kind})`);

	const node = root
		.append('g')
		.selectAll<SVGCircleElement, SimNode>('circle')
		.data(filteredNodes, (d) => d.id)
		.join('circle')
		.attr('r', (d) => nodeRadius(d, d.fanout))
		.attr('fill', (d) =>
			d.projectId ? (projectColors.value.get(d.projectId) ?? nodeColor(d)) : nodeColor(d),
		)
		.attr('stroke', (d) => nodeColor(d))
		.attr('stroke-width', 1.5)
		.attr('opacity', (d) => (d.restricted ? 0.5 : 0.95))
		.style('cursor', 'pointer');

	node.append('title').text((d) => d.name);

	node.on('mouseenter', (event: MouseEvent, d: SimNode) => {
		hoveredId.value = d.id;
		const rect = host.getBoundingClientRect();
		tooltip.value = {
			x: event.clientX - rect.left + 12,
			y: event.clientY - rect.top + 12,
			node: {
				id: d.id,
				kind: d.kind,
				name: d.name,
				projectId: d.projectId,
				restricted: d.restricted,
			},
		};
		link
			.attr('stroke-opacity', (l) =>
				(l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 0.95 : 0.05,
			)
			.attr('stroke-width', (l) =>
				(l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 2 : 0.8,
			);
		node.attr('opacity', (n) => {
			if (n.id === d.id) return 1;
			const isNeighbor = filteredLinks.some(
				(l) =>
					((l.source as SimNode).id === d.id && (l.target as SimNode).id === n.id) ||
					((l.target as SimNode).id === d.id && (l.source as SimNode).id === n.id),
			);
			return isNeighbor ? 0.95 : 0.15;
		});
	});

	node.on('mouseleave', () => {
		hoveredId.value = null;
		tooltip.value = null;
		link.attr('stroke-opacity', 0.4).attr('stroke-width', 1.2);
		node.attr('opacity', (d) => (d.restricted ? 0.5 : 0.95));
	});

	const drag = d3
		.drag<SVGCircleElement, SimNode>()
		.on('start', (event, d) => {
			if (!event.active) simulation?.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		})
		.on('drag', (event, d) => {
			d.fx = event.x;
			d.fy = event.y;
		})
		.on('end', (event, d) => {
			if (!event.active) simulation?.alphaTarget(0);
			d.fx = null;
			d.fy = null;
		});

	node.call(drag);

	simulation?.stop();
	simulation = d3
		.forceSimulation<SimNode>(filteredNodes)
		.force(
			'link',
			d3
				.forceLink<SimNode, SimLink>(filteredLinks)
				.id((d) => d.id)
				.distance((l) => (l.kind === 'workflowCall' ? 60 : 50))
				.strength(0.4),
		)
		.force('charge', d3.forceManyBody().strength(-160))
		.force('center', d3.forceCenter(width / 2, height / 2))
		.force(
			'collide',
			d3.forceCollide<SimNode>().radius((d) => nodeRadius(d, d.fanout) + 4),
		)
		.on('tick', () => {
			link
				.attr('x1', (d) => (d.source as SimNode).x ?? 0)
				.attr('y1', (d) => (d.source as SimNode).y ?? 0)
				.attr('x2', (d) => (d.target as SimNode).x ?? 0)
				.attr('y2', (d) => (d.target as SimNode).y ?? 0);
			node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);
		});
}

onMounted(() => {
	render();
	if (container.value) {
		resizeObserver = new ResizeObserver(() => render());
		resizeObserver.observe(container.value);
	}
});

onBeforeUnmount(() => {
	simulation?.stop();
	simulation = null;
	resizeObserver?.disconnect();
	resizeObserver = null;
});

watch(
	() => [props.graph, kindFilters.value, edgeFilters.value],
	() => render(),
	{ deep: true },
);

const projectLegend = computed(() =>
	props.graph.projects.map((p) => ({
		id: p.id,
		name: p.name,
		color: projectColors.value.get(p.id) ?? '#999',
	})),
);
</script>

<template>
	<div :class="$style.wrapper">
		<aside :class="$style.sidebar">
			<div :class="$style.section">
				<h4 :class="$style.heading">Resources</h4>
				<label v-for="kind in ['workflow', 'credential', 'dataTable'] as const" :key="kind">
					<input v-model="kindFilters[kind]" type="checkbox" />
					<span
						:class="$style.swatch"
						:style="{ background: nodeColor({ id: '', name: '', kind, restricted: false }) }"
					/>
					{{
						kind === 'dataTable' ? 'Data tables' : kind === 'workflow' ? 'Workflows' : 'Credentials'
					}}
				</label>
			</div>
			<div :class="$style.section">
				<h4 :class="$style.heading">Edges</h4>
				<label
					v-for="kind in ['workflowCall', 'errorWorkflow', 'credentialId', 'dataTableId'] as const"
					:key="kind"
				>
					<input v-model="edgeFilters[kind]" type="checkbox" />
					<span :class="$style.swatch" :style="{ background: edgeColor(kind) }" />
					{{
						kind === 'workflowCall'
							? 'Calls'
							: kind === 'errorWorkflow'
								? 'Error workflow'
								: kind === 'credentialId'
									? 'Uses credential'
									: 'Uses data table'
					}}
				</label>
			</div>
			<div v-if="projectLegend.length" :class="$style.section">
				<h4 :class="$style.heading">Projects ({{ projectLegend.length }})</h4>
				<div :class="$style.projectList">
					<div v-for="p in projectLegend" :key="p.id" :class="$style.projectRow">
						<span :class="$style.swatch" :style="{ background: p.color }" />
						<span :class="$style.projectName" :title="p.name">{{ p.name }}</span>
					</div>
				</div>
			</div>
			<div :class="$style.section">
				<p :class="$style.hint">Drag nodes to pin them, scroll to zoom, drag canvas to pan.</p>
			</div>
		</aside>
		<div ref="container" :class="$style.canvas">
			<div
				v-if="tooltip"
				:class="$style.tooltip"
				:style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
			>
				<strong>{{ tooltip.node.name }}</strong>
				<div :class="$style.tooltipMeta">{{ tooltip.node.kind }}</div>
				<div v-if="tooltip.node.restricted" :class="$style.tooltipMeta">Restricted</div>
			</div>
		</div>
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
}

.heading {
	margin: 0 0 var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 0.05em;
}

.swatch {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 2px;
}

.projectList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-height: 240px;
	overflow-y: auto;
}

.projectRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.projectName {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hint {
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
	margin: 0;
	line-height: 1.4;
}

.canvas {
	flex: 1;
	min-width: 0;
	min-height: 0;
	position: relative;
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	overflow: hidden;
}

.tooltip {
	position: absolute;
	pointer-events: none;
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	padding: var(--spacing--2xs);
	box-shadow: var(--box-shadow-base);
	font-size: var(--font-size--2xs);
	max-width: 280px;
	z-index: 5;
}

.tooltipMeta {
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
}
</style>
