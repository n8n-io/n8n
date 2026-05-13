<script lang="ts" setup>
import type { DependencyEdge, DependencyGraphResponse, DependencyNode } from '@n8n/api-types';
import * as d3 from 'd3';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { N8nIcon } from '@n8n/design-system';

import { detectCommunities } from '../dependencyVisualizations.utils';

const props = defineProps<{
	graph: DependencyGraphResponse;
}>();

const container = useTemplateRef<HTMLDivElement>('container');
const search = ref('');
const selectedId = ref<string | null>(null);
type ResourceKind = DependencyNode['kind'];
type ColorMode = 'community' | 'project' | 'kind';

const isolatedCommunity = ref<number | null>(null);
const isolatedProject = ref<string | null>(null);
const isolatedKind = ref<ResourceKind | null>(null);
const colorMode = ref<ColorMode>('community');
/** Communities (by id) currently rendered in colour. Anything not in here renders grey. */
const coloredCommunities = ref<Set<number>>(new Set());
/** Projects (by id) currently rendered in colour. */
const coloredProjects = ref<Set<string>>(new Set());
/** Resource kinds (workflow / credential / dataTable) currently rendered in colour. */
const coloredKinds = ref<Set<ResourceKind>>(new Set(['workflow', 'credential', 'dataTable']));
const DEFAULT_COLORED_COUNT = 5;

/** Per-kind palette — matches the stat icons in the header so the cue carries across the page. */
const KIND_COLOR: Record<ResourceKind, string> = {
	workflow: '#3b82f6',
	credential: '#10b981',
	dataTable: '#f59e0b',
};

/** Tunable layout parameters so the user can play with the shape of the graph. */
interface LayoutSettings {
	/** Magnitude of the per-node many-body repulsion (negative charge). Higher = more spread out. */
	repulsion: number;
	/** Target distance for an edge at strength 1.0. Shorter = tighter clusters. */
	linkDistance: number;
	/** Base force-link strength multiplier. Higher = more rigid edges. */
	linkStrength: number;
	/** How strongly nodes in the same community gravitate toward their centroid. 0 disables clustering. */
	communityPull: number;
	/** Per-edge-type weight, multiplies the link strength. 0 makes that edge type invisible to the layout. */
	edgeWeights: Record<DependencyEdge['kind'], number>;
}

const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
	repulsion: 80,
	linkDistance: 45,
	linkStrength: 0.7,
	communityPull: 0.05,
	edgeWeights: {
		workflowCall: 1,
		errorWorkflow: 1,
		credentialId: 1,
		dataTableId: 1,
	},
};

function cloneSettings(s: LayoutSettings): LayoutSettings {
	return { ...s, edgeWeights: { ...s.edgeWeights } };
}

const layoutSettings = ref<LayoutSettings>(cloneSettings(DEFAULT_LAYOUT_SETTINGS));

function resetLayoutSettings() {
	layoutSettings.value = cloneSettings(DEFAULT_LAYOUT_SETTINGS);
}

function resetEdgeWeights() {
	layoutSettings.value = {
		...layoutSettings.value,
		edgeWeights: { ...DEFAULT_LAYOUT_SETTINGS.edgeWeights },
	};
}

const EDGE_KIND_LABELS: Record<DependencyEdge['kind'], string> = {
	workflowCall: 'Sub-workflow calls',
	errorWorkflow: 'Error workflows',
	credentialId: 'Shared credentials',
	dataTableId: 'Shared data tables',
};
const EDGE_KIND_ORDER: Array<DependencyEdge['kind']> = [
	'workflowCall',
	'errorWorkflow',
	'credentialId',
	'dataTableId',
];

/** Captured zoom transform so it survives re-renders triggered by layout-setting changes. */
let savedTransform: d3.ZoomTransform | null = null;
const currentZoom = ref(1);
let resizeObserver: ResizeObserver | null = null;
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
let svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

interface SimNode extends d3.SimulationNodeDatum {
	id: string;
	kind: DependencyNode['kind'];
	name: string;
	restricted: boolean;
	community: number;
	projectId?: string;
	degree: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	kind: DependencyEdge['kind'];
}

const communities = computed(() => detectCommunities(props.graph));

const communityStats = computed(() => {
	const counts = new Map<number, number>();
	for (const community of communities.value.values()) {
		counts.set(community, (counts.get(community) ?? 0) + 1);
	}
	return [...counts.entries()]
		.filter(([, n]) => n > 1)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 14);
});

/** Stable index per project — drives the palette in project-color mode. */
const projectIndex = computed(() => {
	const map = new Map<string, number>();
	for (const node of props.graph.nodes) {
		if (node.projectId && !map.has(node.projectId)) {
			map.set(node.projectId, map.size);
		}
	}
	return map;
});

const kindStats = computed(() => {
	const counts: Record<ResourceKind, number> = { workflow: 0, credential: 0, dataTable: 0 };
	for (const node of props.graph.nodes) counts[node.kind]++;
	const order: ResourceKind[] = ['workflow', 'credential', 'dataTable'];
	return order.filter((kind) => counts[kind] > 0).map((kind) => ({ kind, size: counts[kind] }));
});

const projectStats = computed(() => {
	const counts = new Map<string, number>();
	for (const node of props.graph.nodes) {
		if (!node.projectId) continue;
		counts.set(node.projectId, (counts.get(node.projectId) ?? 0) + 1);
	}
	const projectName = new Map(props.graph.projects.map((p) => [p.id, p.name]));
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 14)
		.map(([id, size]) => ({ id, name: projectName.get(id) ?? id, size }));
});

function isCommunityColored(id: number): boolean {
	return coloredCommunities.value.has(id);
}

function isProjectColored(id: string): boolean {
	return coloredProjects.value.has(id);
}

function isKindColored(kind: ResourceKind): boolean {
	return coloredKinds.value.has(kind);
}

function nodeColor(node: {
	kind: ResourceKind;
	community: number;
	projectId?: string;
	restricted: boolean;
}): string {
	if (node.restricted) return '#4b5563';
	if (colorMode.value === 'kind') {
		if (!isKindColored(node.kind)) return MUTED_COLOR;
		return KIND_COLOR[node.kind];
	}
	if (colorMode.value === 'project') {
		if (!node.projectId || !isProjectColored(node.projectId)) return MUTED_COLOR;
		return palette(projectIndex.value.get(node.projectId) ?? 0);
	}
	if (!isCommunityColored(node.community)) return MUTED_COLOR;
	return palette(node.community);
}

function edgeColor(sourceNodeId: string): string {
	const node = props.graph.nodes.find((n) => n.id === sourceNodeId);
	if (!node) return MUTED_COLOR;
	if (colorMode.value === 'kind') {
		if (!isKindColored(node.kind)) return MUTED_COLOR;
		return KIND_COLOR[node.kind];
	}
	if (colorMode.value === 'project') {
		if (!node.projectId || !isProjectColored(node.projectId)) return MUTED_COLOR;
		return palette(projectIndex.value.get(node.projectId) ?? 0);
	}
	const c = communities.value.get(sourceNodeId) ?? -1;
	if (c < 0 || !isCommunityColored(c)) return MUTED_COLOR;
	return palette(c);
}

function toggleColorMode(mode: ColorMode) {
	if (colorMode.value === mode) return;
	colorMode.value = mode;
	isolatedCommunity.value = null;
	isolatedProject.value = null;
	isolatedKind.value = null;
}

function toggleCommunityColor(id: number) {
	const next = new Set(coloredCommunities.value);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	coloredCommunities.value = next;
}

function toggleProjectColor(id: string) {
	const next = new Set(coloredProjects.value);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	coloredProjects.value = next;
}

function toggleKindColor(kind: ResourceKind) {
	const next = new Set(coloredKinds.value);
	if (next.has(kind)) next.delete(kind);
	else next.add(kind);
	coloredKinds.value = next;
}

function toggleKindIsolation(kind: ResourceKind) {
	isolatedKind.value = isolatedKind.value === kind ? null : kind;
}

const selectedNode = computed(() => {
	if (!selectedId.value) return null;
	const n = props.graph.nodes.find((x) => x.id === selectedId.value);
	if (!n) return null;
	const projectName = n.projectId
		? props.graph.projects.find((p) => p.id === n.projectId)?.name
		: undefined;
	const degree = props.graph.edges.reduce(
		(acc, e) => acc + (e.source === n.id || e.target === n.id ? 1 : 0),
		0,
	);
	return {
		id: n.id,
		name: n.name,
		kind: n.kind,
		restricted: n.restricted,
		projectName,
		community: communities.value.get(n.id) ?? -1,
		degree,
	};
});

const kindLabel = (kind: DependencyNode['kind']): string =>
	kind === 'workflow' ? 'Workflow' : kind === 'credential' ? 'Credential' : 'Data table';

const kindIcon = (kind: DependencyNode['kind']): 'workflow' | 'key-round' | 'table' =>
	kind === 'workflow' ? 'workflow' : kind === 'credential' ? 'key-round' : 'table';

/**
 * Categorical palette tuned for the dark canvas. Ordered by perceptual distance —
 * the first few entries are maximally distinct from each other so the top groups
 * (which are the ones we paint by default) never look similar to each other.
 */
const PALETTE = [
	'#3b82f6', // blue
	'#ef4444', // red
	'#22c55e', // green
	'#f59e0b', // amber
	'#a855f7', // purple
	'#06b6d4', // cyan
	'#ec4899', // pink
	'#84cc16', // lime
	'#f97316', // orange
	'#8b5cf6', // violet
	'#14b8a6', // teal
	'#eab308', // yellow
];
/** Grey for uncoloured groups so the canvas reads as "structure without identity". */
const MUTED_COLOR = '#475569';

const palette = (i: number): string => {
	if (i < PALETTE.length) return PALETTE[i];
	// Past the curated list, golden-angle stride keeps any extras distinct from
	// their neighbours — but practically the user controls how many are coloured.
	const hue = (i * 137.508) % 360;
	return `hsl(${hue}, 70%, 60%)`;
};

/** Counter-scale a node-size-derived radius so the visual stays consistent across zooms. */
function radiusFor(degree: number): number {
	return 2 + Math.sqrt(degree) * 1.8;
}

/** d3.symbol generator — area-normalised, so triangle/square/circle of the same `size` look visually comparable. */
const symbolGen = d3.symbol();

function symbolType(kind: ResourceKind): d3.SymbolType {
	switch (kind) {
		case 'credential':
			return d3.symbolTriangle;
		case 'dataTable':
			return d3.symbolSquare;
		case 'workflow':
		default:
			return d3.symbolCircle;
	}
}

function symbolPath(node: { kind: ResourceKind; degree: number }): string {
	const r = radiusFor(node.degree);
	return symbolGen.type(symbolType(node.kind)).size(Math.PI * r * r)() ?? '';
}

/** Same as symbolPath but with a fixed radius, used for static UI (legend swatches). */
function legendShapePath(kind: ResourceKind, radius = 5): string {
	return symbolGen.type(symbolType(kind)).size(Math.PI * radius * radius)() ?? '';
}

/**
 * Decide how many nodes deserve labels at this zoom level. Lower scale = fewer
 * labels (only the hubs); higher scale = more, until every node is labelled
 * once we're zoomed in past ~3.5x.
 */
function labelBudget(scale: number, total: number): number {
	if (scale <= 1) return 0;
	if (scale >= 3.5) return total;
	// Ease in: at 1x → 0, at 1.5x → ~10%, at 2x → ~25%, at 3x → ~75%, at 3.5x → 100%.
	const t = (scale - 1) / 2.5;
	const eased = Math.pow(t, 1.4);
	return Math.min(total, Math.ceil(total * eased));
}

/**
 * Pre-compute final node positions by running the force simulation
 * synchronously to convergence — the viewport never sees the layout settle.
 *
 * Math: with the default `alphaMin = 0.001` and our `alphaDecay = 0.0228`
 * (d3's default), the simulation needs `ceil(log(alphaMin) / log(1 - decay))`
 * ≈ 300 ticks to drop below the minimum alpha. We use that bound so the
 * result matches what an animated simulation would have converged to.
 */
function computeLayout(
	nodes: SimNode[],
	links: SimLink[],
	width: number,
	height: number,
	settings: LayoutSettings,
): void {
	// Deterministic seed: place nodes around a circle so the result is stable
	// across reloads instead of depending on Math.random().
	const cx = width / 2;
	const cy = height / 2;
	const radius = Math.min(width, height) * 0.35;
	nodes.forEach((n, i) => {
		const angle = (i / nodes.length) * Math.PI * 2;
		n.x = cx + Math.cos(angle) * radius;
		n.y = cy + Math.sin(angle) * radius;
	});

	const baseLinkStrength = settings.linkStrength;
	const sim = d3
		.forceSimulation<SimNode>(nodes)
		.force(
			'link',
			d3
				.forceLink<SimNode, SimLink>(links)
				.id((d) => d.id)
				.distance(settings.linkDistance)
				.strength((l) => baseLinkStrength * (settings.edgeWeights[l.kind] ?? 1)),
		)
		.force(
			'charge',
			d3.forceManyBody<SimNode>().strength((d) => -(settings.repulsion + d.degree * 3)),
		)
		.force('center', d3.forceCenter(cx, cy))
		.force(
			'collide',
			d3.forceCollide<SimNode>().radius((d) => radiusFor(d.degree) + 2),
		)
		.force('community', (alpha: number) => {
			if (settings.communityPull <= 0) return;
			const centroids = new Map<number, { x: number; y: number; n: number }>();
			for (const n of nodes) {
				const entry = centroids.get(n.community) ?? { x: 0, y: 0, n: 0 };
				entry.x += n.x ?? 0;
				entry.y += n.y ?? 0;
				entry.n += 1;
				centroids.set(n.community, entry);
			}
			for (const entry of centroids.values()) {
				entry.x /= entry.n;
				entry.y /= entry.n;
			}
			const strength = settings.communityPull * alpha;
			for (const n of nodes) {
				const c = centroids.get(n.community);
				if (!c) continue;
				n.vx = (n.vx ?? 0) + (c.x - (n.x ?? 0)) * strength;
				n.vy = (n.vy ?? 0) + (c.y - (n.y ?? 0)) * strength;
			}
		})
		.stop();

	const ticks = Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay()));
	for (let i = 0; i < ticks; i++) sim.tick();
}

function render() {
	if (!container.value) return;
	const host = container.value;
	host.innerHTML = '';

	const width = host.clientWidth || 800;
	const height = host.clientHeight || 600;

	const degrees = new Map<string, number>();
	for (const edge of props.graph.edges) {
		degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
		degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
	}

	const communityMap = communities.value;
	const nodes: SimNode[] = props.graph.nodes.map((n) => ({
		id: n.id,
		kind: n.kind,
		name: n.name,
		restricted: n.restricted,
		community: communityMap.get(n.id) ?? -1,
		projectId: n.projectId,
		degree: degrees.get(n.id) ?? 0,
	}));
	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const links: SimLink[] = props.graph.edges.map((e) => ({
		source: e.source,
		target: e.target,
		kind: e.kind,
	}));

	computeLayout(nodes, links, width, height, layoutSettings.value);

	// After simulation, link source/target are now SimNode refs (forceLink
	// resolves them in-place). Walk the resolved nodes so we don't rely on
	// the string ids anymore.

	const svg = d3
		.select(host)
		.append<SVGSVGElement>('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('viewBox', [0, 0, width, height])
		.style('width', '100%')
		.style('height', '100%')
		.style('background', '#0b1020');
	svgSelection = svg;

	const root = svg.append('g');

	zoomBehavior = d3
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.15, 6])
		.on('zoom', (event) => {
			root.attr('transform', event.transform);
			currentZoom.value = event.transform.k;
			savedTransform = event.transform;
			updateLabelHandlers?.updateZoomLabels();
			updateLabelHandlers?.positionSelectedLabel();
		});
	svg.call(zoomBehavior);

	const defs = svg.append('defs');
	const grad = defs
		.append('radialGradient')
		.attr('id', 'atlas-glow')
		.attr('cx', '50%')
		.attr('cy', '50%')
		.attr('r', '60%');
	grad.append('stop').attr('offset', '0%').attr('stop-color', '#13182d').attr('stop-opacity', 1);
	grad.append('stop').attr('offset', '100%').attr('stop-color', '#0b1020').attr('stop-opacity', 1);

	svg
		.insert('rect', ':first-child')
		.attr('width', width)
		.attr('height', height)
		.attr('fill', 'url(#atlas-glow)');

	svg.on('click', (event: MouseEvent) => {
		if (event.target === svg.node()) {
			selectedId.value = null;
		}
	});

	root
		.append('g')
		.attr('class', 'atlas-edges')
		.attr('fill', 'none')
		.attr('stroke-linecap', 'round')
		.selectAll<SVGPathElement, SimLink>('path')
		.data(links)
		.join('path')
		.attr('stroke', (l) => {
			const id = typeof l.source === 'string' ? l.source : (l.source as SimNode).id;
			return edgeColor(id);
		})
		.attr('stroke-width', 0.7)
		.attr('d', (l) => {
			const s = l.source as SimNode;
			const t = l.target as SimNode;
			const sx = s.x ?? 0;
			const sy = s.y ?? 0;
			const tx = t.x ?? 0;
			const ty = t.y ?? 0;
			const mx = (sx + tx) / 2;
			const my = (sy + ty) / 2;
			const dx = tx - sx;
			const dy = ty - sy;
			const norm = Math.hypot(dx, dy) || 1;
			const offset = Math.min(20, norm * 0.15);
			const cx = mx - (dy / norm) * offset;
			const cy = my + (dx / norm) * offset;
			return `M${sx},${sy}Q${cx},${cy} ${tx},${ty}`;
		});

	const node = root
		.append('g')
		.attr('class', 'atlas-nodes')
		.selectAll<SVGPathElement, SimNode>('path')
		.data(nodes, (d) => d.id)
		.join('path')
		.attr('d', (d) => symbolPath(d))
		.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
		.attr('fill', (d) => nodeColor(d))
		.attr('stroke', '#0b1020')
		.attr('stroke-width', 0.5)
		.style('cursor', 'pointer');

	node.append('title').text((d) => `${d.name}\n${d.kind}${d.restricted ? ' (restricted)' : ''}`);

	node.on('click', (event: MouseEvent, d: SimNode) => {
		event.stopPropagation();
		selectedId.value = selectedId.value === d.id ? null : d.id;
	});

	const selectedLabel = root
		.append('g')
		.attr('font-family', 'Helvetica, Arial, sans-serif')
		.attr('fill', '#f8fafc')
		.attr('pointer-events', 'none')
		.attr('text-anchor', 'middle')
		.attr('font-size', 14)
		.attr('font-weight', 600)
		.attr('paint-order', 'stroke')
		.attr('stroke', '#0b1020')
		.attr('stroke-width', 4)
		.attr('stroke-linejoin', 'round')
		.append('text')
		.style('opacity', 0);

	const zoomLabels = root
		.append('g')
		.attr('class', 'zoom-labels')
		.attr('font-family', 'Helvetica, Arial, sans-serif')
		.attr('fill', '#cbd5e1')
		.attr('pointer-events', 'none')
		.attr('text-anchor', 'middle')
		.attr('paint-order', 'stroke')
		.attr('stroke', '#0b1020')
		.attr('stroke-width', 3)
		.attr('stroke-linejoin', 'round');

	function updateZoomLabels() {
		const scale = currentZoom.value;
		const budget = labelBudget(scale, nodes.length);
		const shown = [...nodes]
			.filter((n) => !n.restricted)
			.sort((a, b) => b.degree - a.degree)
			.slice(0, budget);

		const sel = zoomLabels.selectAll<SVGTextElement, SimNode>('text').data(shown, (d) => d.id);
		sel.exit().remove();
		sel
			.enter()
			.append('text')
			.merge(sel)
			.attr('font-size', () => Math.max(6, 11 / Math.max(scale, 0.9)))
			.attr('x', (d) => d.x ?? 0)
			.attr('y', (d) => (d.y ?? 0) - radiusFor(d.degree) - 4 / Math.max(scale, 0.9))
			.text((d) => (d.name.length > 30 ? `${d.name.slice(0, 29)}…` : d.name));
	}

	function positionSelectedLabel() {
		const id = selectedId.value;
		if (!id) {
			selectedLabel.style('opacity', 0);
			return;
		}
		const target = nodeById.get(id);
		if (!target) {
			selectedLabel.style('opacity', 0);
			return;
		}
		const r = radiusFor(target.degree);
		const scale = Math.max(currentZoom.value, 0.9);
		selectedLabel
			.text(target.name)
			.attr('x', target.x ?? 0)
			.attr('y', (target.y ?? 0) - r - 8 / scale)
			.attr('font-size', Math.max(11, 14 / scale))
			.style('opacity', 1);
	}

	updateLabelHandlers = { updateZoomLabels, positionSelectedLabel };

	updateZoomLabels();
	positionSelectedLabel();
	applyHighlight();

	// Restore the prior pan/zoom so layout-knob tweaks don't yank the view back
	// to identity. Done last so the zoom-event handler finds every selection it
	// touches (zoomLabels / selectedLabel) already constructed.
	if (savedTransform && zoomBehavior && svgSelection) {
		svgSelection.call(zoomBehavior.transform, savedTransform);
	}
}

let updateLabelHandlers: {
	updateZoomLabels: () => void;
	positionSelectedLabel: () => void;
} | null = null;

/** Update node fills / edge strokes in place, without re-running the layout. */
function repaintColors() {
	if (!svgSelection) return;
	svgSelection
		.selectAll<SVGPathElement, SimNode>('g.atlas-nodes > path')
		.attr('fill', (d) => nodeColor(d));
	svgSelection.selectAll<SVGPathElement, SimLink>('g.atlas-edges > path').attr('stroke', (l) => {
		const id = typeof l.source === 'string' ? l.source : (l.source as SimNode).id;
		return edgeColor(id);
	});
}

function applyHighlight() {
	if (!svgSelection) return;
	const term = search.value.trim().toLowerCase();
	const selected = selectedId.value;
	const isoCommunity = isolatedCommunity.value;
	const isoProject = isolatedProject.value;
	const linkSel = svgSelection.selectAll<SVGPathElement, SimLink>('g.atlas-edges > path');
	const nodeSel = svgSelection.selectAll<SVGPathElement, SimNode>('g.atlas-nodes > path');

	const neighbours = new Set<string>();
	if (selected) {
		for (const edge of props.graph.edges) {
			if (edge.source === selected) neighbours.add(edge.target);
			if (edge.target === selected) neighbours.add(edge.source);
		}
		neighbours.add(selected);
	}

	const matchesSearch = (name: string) => !term || name.toLowerCase().includes(term);
	const passesSelection = (id: string) => !selected || neighbours.has(id);
	const isoKindValue = isolatedKind.value;
	const passesIsolation = (node: SimNode) => {
		if (isoCommunity !== null && node.community !== isoCommunity) return false;
		if (isoProject !== null && node.projectId !== isoProject) return false;
		if (isoKindValue !== null && node.kind !== isoKindValue) return false;
		return true;
	};

	nodeSel.attr('fill-opacity', (d) => {
		const base = d.restricted ? 0.5 : 0.92;
		if (!matchesSearch(d.name) || !passesSelection(d.id) || !passesIsolation(d)) {
			return 0.06;
		}
		return d.id === selected ? 1 : base;
	});

	nodeSel
		.attr('stroke', (d) => (d.id === selected ? '#f8fafc' : '#0b1020'))
		.attr('stroke-width', (d) => (d.id === selected ? 2 : 0.5));

	const nodeById = new Map(props.graph.nodes.map((n) => [n.id, n]));
	const inIsolation = (nodeId: string): boolean => {
		const n = nodeById.get(nodeId);
		if (!n) return false;
		if (isoCommunity !== null && (communities.value.get(nodeId) ?? -1) !== isoCommunity)
			return false;
		if (isoProject !== null && n.projectId !== isoProject) return false;
		if (isoKindValue !== null && n.kind !== isoKindValue) return false;
		return true;
	};

	linkSel.attr('stroke-opacity', (l) => {
		const s = typeof l.source === 'string' ? l.source : (l.source as SimNode).id;
		const t = typeof l.target === 'string' ? l.target : (l.target as SimNode).id;

		if (isoCommunity !== null || isoProject !== null || isoKindValue !== null) {
			if (!inIsolation(s) && !inIsolation(t)) return 0.02;
		}
		if (selected) {
			if (s !== selected && t !== selected) return 0.04;
			return 0.7;
		}
		if (term) {
			const sNode = nodeById.get(s);
			const tNode = nodeById.get(t);
			if ((sNode && matchesSearch(sNode.name)) || (tNode && matchesSearch(tNode.name))) {
				return 0.45;
			}
			return 0.03;
		}
		return 0.18;
	});
}

function resetZoom() {
	if (!svgSelection || !zoomBehavior) return;
	savedTransform = null;
	svgSelection.transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity);
}

function zoomBy(factor: number) {
	if (!svgSelection || !zoomBehavior) return;
	svgSelection.transition().duration(200).call(zoomBehavior.scaleBy, factor);
}

function toggleCommunityIsolation(community: number) {
	isolatedCommunity.value = isolatedCommunity.value === community ? null : community;
}

function toggleProjectIsolation(projectId: string) {
	isolatedProject.value = isolatedProject.value === projectId ? null : projectId;
}

const selectedProjectId = computed(() => {
	if (!selectedId.value) return undefined;
	return props.graph.nodes.find((n) => n.id === selectedId.value)?.projectId;
});

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
	updateLabelHandlers = null;
	if (layoutDebounce) {
		clearTimeout(layoutDebounce);
		layoutDebounce = null;
	}
});

function seedDefaultColored() {
	if (colorMode.value === 'community') {
		coloredCommunities.value = new Set(
			communityStats.value.slice(0, DEFAULT_COLORED_COUNT).map(([id]) => id),
		);
	} else if (colorMode.value === 'project') {
		coloredProjects.value = new Set(
			projectStats.value.slice(0, DEFAULT_COLORED_COUNT).map((p) => p.id),
		);
	} else {
		// Only 3 resource types — light them all up by default.
		coloredKinds.value = new Set(['workflow', 'credential', 'dataTable']);
	}
}

watch(
	() => props.graph,
	() => {
		seedDefaultColored();
		render();
	},
	{ deep: true, immediate: true },
);
watch(colorMode, () => {
	seedDefaultColored();
	repaintColors();
});
watch([coloredCommunities, coloredProjects, coloredKinds], () => repaintColors(), { deep: true });
watch([search, isolatedCommunity, isolatedProject, isolatedKind], () => applyHighlight());
watch(selectedId, () => {
	applyHighlight();
	updateLabelHandlers?.positionSelectedLabel();
});

// Layout knobs trigger a re-run of the force simulation. Debounced so the user
// can drag a slider without the simulation thrashing on every input frame.
let layoutDebounce: ReturnType<typeof setTimeout> | null = null;
watch(
	layoutSettings,
	() => {
		if (layoutDebounce) clearTimeout(layoutDebounce);
		layoutDebounce = setTimeout(() => {
			layoutDebounce = null;
			render();
		}, 180);
	},
	{ deep: true },
);
</script>

<template>
	<div :class="$style.wrapper">
		<aside :class="$style.sidebar">
			<section :class="$style.section">
				<label :class="$style.searchBox">
					<N8nIcon icon="search" size="small" :class="$style.searchIcon" />
					<input
						v-model="search"
						type="search"
						:class="$style.searchInput"
						placeholder="Find a node…"
					/>
				</label>
			</section>

			<section :class="$style.section">
				<span :class="$style.sectionTitle">Color by</span>
				<div :class="$style.segmented" role="tablist">
					<button
						type="button"
						role="tab"
						:aria-selected="colorMode === 'community'"
						:class="[$style.segment, colorMode === 'community' && $style.segmentActive]"
						@click="toggleColorMode('community')"
					>
						Community
					</button>
					<button
						type="button"
						role="tab"
						:aria-selected="colorMode === 'project'"
						:class="[$style.segment, colorMode === 'project' && $style.segmentActive]"
						@click="toggleColorMode('project')"
					>
						Project
					</button>
					<button
						type="button"
						role="tab"
						:aria-selected="colorMode === 'kind'"
						:class="[$style.segment, colorMode === 'kind' && $style.segmentActive]"
						@click="toggleColorMode('kind')"
					>
						Type
					</button>
				</div>
			</section>

			<section v-if="selectedNode" :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Selected</span>
					<button type="button" :class="$style.linkButton" @click="selectedId = null">Clear</button>
				</header>
				<div :class="$style.selectedCard">
					<div :class="$style.selectedHeading">
						<svg
							:class="$style.selectedShape"
							width="14"
							height="14"
							viewBox="-7 -7 14 14"
							aria-hidden="true"
						>
							<path
								:d="legendShapePath(selectedNode.kind)"
								:fill="
									nodeColor({
										kind: selectedNode.kind,
										community: selectedNode.community,
										projectId: selectedProjectId,
										restricted: selectedNode.restricted,
									})
								"
							/>
						</svg>
						<span :class="$style.selectedName">{{ selectedNode.name }}</span>
					</div>
					<div :class="$style.selectedKindRow">
						<N8nIcon :icon="kindIcon(selectedNode.kind)" size="small" />
						<span>{{ kindLabel(selectedNode.kind) }}</span>
						<span v-if="selectedNode.restricted" :class="$style.restrictedTag">Restricted</span>
					</div>
					<dl :class="$style.metaList">
						<template v-if="selectedNode.projectName && selectedProjectId">
							<dt>Project</dt>
							<dd>
								<button
									type="button"
									:class="$style.linkButton"
									@click="toggleProjectIsolation(selectedProjectId)"
								>
									{{ selectedNode.projectName }}
									<span v-if="isolatedProject === selectedProjectId">· isolated</span>
								</button>
							</dd>
						</template>
						<dt>Community</dt>
						<dd>
							<button
								type="button"
								:class="$style.linkButton"
								@click="toggleCommunityIsolation(selectedNode.community)"
							>
								Community {{ selectedNode.community + 1 }}
								<span v-if="isolatedCommunity === selectedNode.community">· isolated</span>
							</button>
						</dd>
						<dt>Connections</dt>
						<dd>{{ selectedNode.degree }}</dd>
					</dl>
				</div>
			</section>

			<section v-if="colorMode === 'community'" :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Communities</span>
					<div :class="$style.sectionActions">
						<button type="button" :class="$style.linkButton" @click="seedDefaultColored">
							Top {{ DEFAULT_COLORED_COUNT }}
						</button>
						<button
							v-if="isolatedCommunity !== null"
							type="button"
							:class="$style.linkButton"
							@click="isolatedCommunity = null"
						>
							Clear isolate
						</button>
					</div>
				</header>
				<div :class="$style.communityList">
					<div
						v-for="[cid, size] in communityStats"
						:key="cid"
						:class="[$style.communityRow, isolatedCommunity === cid && $style.communityRowActive]"
					>
						<button
							type="button"
							:class="[$style.colorToggle, !isCommunityColored(cid) && $style.colorToggleOff]"
							:style="
								isCommunityColored(cid)
									? { background: palette(cid) }
									: { background: 'transparent' }
							"
							:aria-label="
								isCommunityColored(cid)
									? `Hide colour for community ${cid + 1}`
									: `Show colour for community ${cid + 1}`
							"
							:aria-pressed="isCommunityColored(cid)"
							@click.stop="toggleCommunityColor(cid)"
						/>
						<button type="button" :class="$style.rowBody" @click="toggleCommunityIsolation(cid)">
							<span :class="$style.communityName">Community {{ cid + 1 }}</span>
							<span :class="$style.communitySize">{{ size }}</span>
						</button>
					</div>
				</div>
			</section>

			<section v-else-if="colorMode === 'project'" :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Projects</span>
					<div :class="$style.sectionActions">
						<button type="button" :class="$style.linkButton" @click="seedDefaultColored">
							Top {{ DEFAULT_COLORED_COUNT }}
						</button>
						<button
							v-if="isolatedProject !== null"
							type="button"
							:class="$style.linkButton"
							@click="isolatedProject = null"
						>
							Clear isolate
						</button>
					</div>
				</header>
				<div :class="$style.communityList">
					<div
						v-for="p in projectStats"
						:key="p.id"
						:class="[$style.communityRow, isolatedProject === p.id && $style.communityRowActive]"
					>
						<button
							type="button"
							:class="[$style.colorToggle, !isProjectColored(p.id) && $style.colorToggleOff]"
							:style="
								isProjectColored(p.id)
									? { background: palette(projectIndex.get(p.id) ?? 0) }
									: { background: 'transparent' }
							"
							:aria-label="
								isProjectColored(p.id) ? `Hide colour for ${p.name}` : `Show colour for ${p.name}`
							"
							:aria-pressed="isProjectColored(p.id)"
							@click.stop="toggleProjectColor(p.id)"
						/>
						<button type="button" :class="$style.rowBody" @click="toggleProjectIsolation(p.id)">
							<span :class="$style.communityName" :title="p.name">{{ p.name }}</span>
							<span :class="$style.communitySize">{{ p.size }}</span>
						</button>
					</div>
				</div>
			</section>

			<section v-else :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Resource types</span>
					<div :class="$style.sectionActions">
						<button
							v-if="isolatedKind !== null"
							type="button"
							:class="$style.linkButton"
							@click="isolatedKind = null"
						>
							Clear isolate
						</button>
					</div>
				</header>
				<div :class="$style.communityList">
					<div
						v-for="row in kindStats"
						:key="row.kind"
						:class="[$style.communityRow, isolatedKind === row.kind && $style.communityRowActive]"
					>
						<button
							type="button"
							:class="[$style.shapeToggle, !isKindColored(row.kind) && $style.shapeToggleOff]"
							:aria-label="
								isKindColored(row.kind)
									? `Hide colour for ${row.kind}`
									: `Show colour for ${row.kind}`
							"
							:aria-pressed="isKindColored(row.kind)"
							@click.stop="toggleKindColor(row.kind)"
						>
							<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
								<path
									:d="legendShapePath(row.kind)"
									:fill="isKindColored(row.kind) ? KIND_COLOR[row.kind] : 'transparent'"
									:stroke="isKindColored(row.kind) ? 'none' : 'currentColor'"
									stroke-width="1.5"
								/>
							</svg>
						</button>
						<button type="button" :class="$style.rowBody" @click="toggleKindIsolation(row.kind)">
							<span :class="$style.communityName">{{
								row.kind === 'workflow'
									? 'Workflows'
									: row.kind === 'credential'
										? 'Credentials'
										: 'Data tables'
							}}</span>
							<span :class="$style.communitySize">{{ row.size }}</span>
						</button>
					</div>
				</div>
			</section>

			<section :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Layout</span>
					<button type="button" :class="$style.linkButton" @click="resetLayoutSettings">
						Reset
					</button>
				</header>
				<div :class="$style.sliderGroup">
					<label :class="$style.slider">
						<div :class="$style.sliderHead">
							<span>Repulsion</span>
							<span :class="$style.sliderValue">{{ layoutSettings.repulsion }}</span>
						</div>
						<input
							v-model.number="layoutSettings.repulsion"
							type="range"
							min="20"
							max="300"
							step="5"
						/>
					</label>
					<label :class="$style.slider">
						<div :class="$style.sliderHead">
							<span>Link distance</span>
							<span :class="$style.sliderValue">{{ layoutSettings.linkDistance }}</span>
						</div>
						<input
							v-model.number="layoutSettings.linkDistance"
							type="range"
							min="15"
							max="150"
							step="5"
						/>
					</label>
					<label :class="$style.slider">
						<div :class="$style.sliderHead">
							<span>Link strength</span>
							<span :class="$style.sliderValue">{{ layoutSettings.linkStrength.toFixed(2) }}</span>
						</div>
						<input
							v-model.number="layoutSettings.linkStrength"
							type="range"
							min="0"
							max="1.5"
							step="0.05"
						/>
					</label>
					<label :class="$style.slider">
						<div :class="$style.sliderHead">
							<span>Community pull</span>
							<span :class="$style.sliderValue">{{ layoutSettings.communityPull.toFixed(2) }}</span>
						</div>
						<input
							v-model.number="layoutSettings.communityPull"
							type="range"
							min="0"
							max="0.25"
							step="0.01"
						/>
					</label>
				</div>
			</section>

			<section :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Edge weights</span>
					<button type="button" :class="$style.linkButton" @click="resetEdgeWeights">Reset</button>
				</header>
				<div :class="$style.sliderGroup">
					<label v-for="kind in EDGE_KIND_ORDER" :key="kind" :class="$style.slider">
						<div :class="$style.sliderHead">
							<span>{{ EDGE_KIND_LABELS[kind] }}</span>
							<span :class="$style.sliderValue">
								{{ layoutSettings.edgeWeights[kind].toFixed(1) }}×
							</span>
						</div>
						<input
							v-model.number="layoutSettings.edgeWeights[kind]"
							type="range"
							min="0"
							max="3"
							step="0.1"
						/>
					</label>
				</div>
				<p :class="$style.hint">
					Drop a weight to 0 and that relationship type stops pulling nodes together — useful for
					seeing the graph as if those edges didn't exist.
				</p>
			</section>

			<section :class="$style.section">
				<p :class="$style.hint">
					<template v-if="colorMode === 'community'">
						Colours mark communities discovered by label propagation — nodes that ended up in the
						same group share many neighbours.
					</template>
					<template v-else-if="colorMode === 'project'">
						Colours mark the project a resource belongs to. Cross-coloured neighbourhoods are
						resources from different projects that depend on each other.
					</template>
					<template v-else>
						Colours mark the resource type — workflows, credentials and data tables. Useful for
						spotting credential hubs and data tables shared by many workflows.
					</template>
					Click a node to inspect, click a legend row to isolate it. Zoom in for more labels — every
					node is named past 3.5×.
				</p>
			</section>
		</aside>
		<div :class="$style.canvasWrapper">
			<div ref="container" :class="$style.canvas" />
			<div :class="$style.zoomBadge">{{ currentZoom.toFixed(1) }}×</div>
			<div :class="$style.controls">
				<button
					type="button"
					:class="$style.controlButton"
					aria-label="Zoom in"
					@click="zoomBy(1.4)"
				>
					<N8nIcon icon="plus" size="small" />
				</button>
				<button
					type="button"
					:class="$style.controlButton"
					aria-label="Zoom out"
					@click="zoomBy(0.7)"
				>
					<N8nIcon icon="minus" size="small" />
				</button>
				<button
					type="button"
					:class="$style.controlButton"
					aria-label="Reset view"
					@click="resetZoom"
				>
					<N8nIcon icon="refresh-cw" size="small" />
				</button>
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
	flex: 0 0 272px;
	overflow-y: auto;
	padding: var(--spacing--md);
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size--2xs);
	color: var(--color-text-base);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);

	& + & {
		padding-top: var(--spacing--md);
		border-top: 1px solid var(--color-foreground-base);
	}

	input[type='range'] {
		width: 100%;
	}
}

.sectionHeader {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.sectionActions {
	display: flex;
	gap: var(--spacing--xs);
}

.sectionTitle {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 0.08em;
	line-height: 1.4;
}

.linkButton {
	background: transparent;
	border: 0;
	color: var(--color-primary);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
	padding: 0;
	line-height: 1.4;

	&:hover {
		text-decoration: underline;
	}
}

.segmented {
	display: flex;
	padding: 2px;
	background: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	gap: 2px;
}

.segment {
	flex: 1;
	background: transparent;
	border: 0;
	border-radius: 4px;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color-text-light);
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;

	&:hover {
		color: var(--color-text-base);
		background: var(--color-background-base);
	}
}

.segmentActive {
	background: var(--color-background-xlight);
	color: var(--color-text-dark);
	box-shadow:
		0 1px 2px rgba(0, 0, 0, 0.18),
		inset 0 0 0 1px var(--color-foreground-base);

	&:hover {
		color: var(--color-text-dark);
		background: var(--color-background-xlight);
	}
}

.searchBox {
	position: relative;
	display: flex;
	align-items: center;
}

.searchIcon {
	position: absolute;
	left: var(--spacing--2xs);
	color: var(--color-text-light);
	pointer-events: none;
	display: flex;
}

.searchInput {
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--xl);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	background: var(--color-background-light);
	color: var(--color-text-dark);
	font-size: var(--font-size--2xs);
	line-height: 1.4;

	&::placeholder {
		color: var(--color-text-light);
	}

	&:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary-tint-3, rgba(255, 113, 64, 0.2));
	}
}

.selectedCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
}

.selectedHeading {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.selectedShape {
	flex-shrink: 0;
	margin-top: 3px;
}

.selectedName {
	font-weight: var(--font-weight--bold);
	color: var(--color-text-dark);
	word-break: break-word;
	font-size: var(--font-size--sm);
	line-height: 1.35;
	flex: 1;
}

.selectedKindRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color-text-light);
	font-size: var(--font-size--2xs);
}

.restrictedTag {
	margin-left: auto;
	padding: 1px var(--spacing--3xs);
	border-radius: var(--border-radius-base);
	background: var(--color-foreground-base);
	color: var(--color-text-base);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.metaList {
	display: grid;
	grid-template-columns: max-content 1fr;
	row-gap: var(--spacing--3xs);
	column-gap: var(--spacing--sm);
	margin: var(--spacing--3xs) 0 0;
	padding-top: var(--spacing--2xs);
	border-top: 1px solid var(--color-foreground-base);

	dt {
		color: var(--color-text-light);
		font-size: var(--font-size--3xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		line-height: 1.5;
	}

	dd {
		margin: 0;
		color: var(--color-text-base);
		font-size: var(--font-size--2xs);
		word-break: break-word;
		line-height: 1.4;
	}
}

.communityList {
	display: flex;
	flex-direction: column;
}

.communityRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding-left: var(--spacing--3xs);
	border-radius: var(--border-radius-base);
	transition: background-color 0.15s ease;

	&:hover {
		background: var(--color-background-base);
	}
}

.communityRowActive {
	background: var(--color-background-base);
	box-shadow: inset 2px 0 0 var(--color-primary);
}

.colorToggle {
	flex-shrink: 0;
	width: 14px;
	height: 14px;
	margin: 0;
	border: 1.5px solid transparent;
	border-radius: 999px;
	padding: 0;
	cursor: pointer;
	transition:
		transform 0.1s ease,
		border-color 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		transform: scale(1.15);
		box-shadow: 0 0 0 2px var(--color-background-base);
	}

	&:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--color-primary);
	}
}

.colorToggleOff {
	border-color: var(--color-text-light);
	opacity: 0.7;

	&:hover {
		opacity: 1;
		border-color: var(--color-text-base);
	}
}

.shapeToggle {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	margin: 0;
	padding: 0;
	background: transparent;
	border: 0;
	border-radius: var(--border-radius-base);
	cursor: pointer;
	color: var(--color-text-light);
	transition:
		transform 0.1s ease,
		color 0.15s ease;

	&:hover {
		transform: scale(1.15);
	}

	&:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--color-primary);
	}
}

.shapeToggleOff {
	opacity: 0.75;

	&:hover {
		opacity: 1;
		color: var(--color-text-base);
	}
}

.rowBody {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	background: transparent;
	border: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	cursor: pointer;
	color: var(--color-text-base);
	font: inherit;
	font-size: var(--font-size--2xs);
	line-height: 1.4;
	text-align: left;
}

.communityName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.communitySize {
	flex-shrink: 0;
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
}

.communityDot {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 999px;
	flex-shrink: 0;
}

.hint {
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
	margin: 0;
	line-height: 1.55;
}

.sliderGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.slider {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);

	input[type='range'] {
		width: 100%;
		accent-color: var(--color-primary);
	}
}

.sliderHead {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	color: var(--color-text-light);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.sliderValue {
	color: var(--color-text-base);
	font-variant-numeric: tabular-nums;
	font-size: var(--font-size--3xs);
	text-transform: none;
	letter-spacing: 0;
}

.canvasWrapper {
	flex: 1;
	min-width: 0;
	min-height: 0;
	position: relative;
	border-radius: var(--border-radius-base);
	overflow: hidden;
	border: 1px solid var(--color-foreground-base);
}

.canvas {
	width: 100%;
	height: 100%;
}

.zoomBadge {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	background: rgba(11, 16, 32, 0.7);
	color: #cbd5e1;
	border-radius: var(--border-radius-base);
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
}

.controls {
	position: absolute;
	bottom: var(--spacing--sm);
	right: var(--spacing--sm);
	display: flex;
	gap: var(--spacing--3xs);
	background: rgba(11, 16, 32, 0.7);
	padding: var(--spacing--3xs);
	border-radius: var(--border-radius-base);
}

.controlButton {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.15);
	color: #e5e7eb;
	border-radius: var(--border-radius-base);
	cursor: pointer;

	&:hover {
		background: rgba(255, 255, 255, 0.18);
	}
}
</style>
