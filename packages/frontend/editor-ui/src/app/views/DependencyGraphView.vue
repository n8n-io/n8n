<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import * as d3Force from 'd3-force';
import * as d3Selection from 'd3-selection';
import * as d3Zoom from 'd3-zoom';
import * as d3Drag from 'd3-drag';
import { useRoute } from 'vue-router';
import type { GraphNode, DependencyGraph } from '@/app/api/workflow-dependencies';
import { getDependencyGraph } from '@/app/api/workflow-dependencies';
import { useRootStore } from '@n8n/stores/useRootStore';

type ViewMode = 'projects' | 'workflows';

const rootStore = useRootStore();
const route = useRoute();
const svgRef = ref<SVGSVGElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const graphData = ref<DependencyGraph | null>(null);
const selectedNode = ref<SimNode | null>(null);
const searchQuery = ref('');
const showCredentials = ref(true);
const showDataTables = ref(true);
const hideOrphans = ref(false);
const filterProject = ref<string>('all');
const viewMode = ref<ViewMode>('projects');

// Distinct colors per project
const PROJECT_PALETTE = [
	{ fill: '#DBEAFE', stroke: '#1D4ED8' }, // blue
	{ fill: '#DCFCE7', stroke: '#15803D' }, // green
	{ fill: '#FDE68A', stroke: '#B45309' }, // amber
	{ fill: '#E0E7FF', stroke: '#4338CA' }, // indigo
	{ fill: '#FCE7F3', stroke: '#BE185D' }, // pink
	{ fill: '#D1FAE5', stroke: '#047857' }, // emerald
	{ fill: '#FED7AA', stroke: '#C2410C' }, // orange
	{ fill: '#E9D5FF', stroke: '#7C3AED' }, // violet
	{ fill: '#CFFAFE', stroke: '#0E7490' }, // cyan
	{ fill: '#FEE2E2', stroke: '#B91C1C' }, // red
	{ fill: '#F5F3FF', stroke: '#6D28D9' }, // purple
	{ fill: '#ECFCCB', stroke: '#4D7C0F' }, // lime
];

const CREDENTIAL_COLORS = { fill: '#DCFCE7', stroke: '#15803D' };
const DATATABLE_COLORS = { fill: '#FED7AA', stroke: '#C2410C' };
const RESTRICTED_COLORS = { fill: '#F3F4F6', stroke: '#6B7280' };

const NODE_LABELS: Record<string, string> = {
	workflow: 'Workflow',
	credential: 'Credential',
	dataTable: 'Data Table',
	project: 'Project',
};

const availableProjects = computed(() => {
	if (!graphData.value) return [];
	const projectMap = new Map<string, string>();
	for (const node of graphData.value.nodes) {
		if (node.projectId && node.projectName) {
			projectMap.set(node.projectId, node.projectName);
		}
	}
	return [...projectMap.entries()]
		.map(([id, name]) => ({ id, name }))
		.sort((a, b) => a.name.localeCompare(b.name));
});

const projectColorMap = computed(() => {
	const map = new Map<string, { fill: string; stroke: string }>();
	for (let i = 0; i < availableProjects.value.length; i++) {
		map.set(availableProjects.value[i].id, PROJECT_PALETTE[i % PROJECT_PALETTE.length]);
	}
	return map;
});

const hasOrphans = ref(false);

// For the legend in workflows mode
const projectLegend = computed(() =>
	availableProjects.value.map((p) => ({
		...p,
		colors: projectColorMap.value.get(p.id) ?? PROJECT_PALETTE[0],
	})),
);

interface SimNode extends d3Force.SimulationNodeDatum {
	id: string;
	label: string;
	type: string;
	projectId?: string;
	projectName?: string;
	restricted?: boolean;
	// for project mode: count of workflows
	workflowCount?: number;
}
interface SimLink extends d3Force.SimulationLinkDatum<SimNode> {
	label: string;
	weight?: number;
}

let simulation: d3Force.Simulation<SimNode, SimLink> | null = null;

async function loadGraph() {
	loading.value = true;
	error.value = null;
	try {
		graphData.value = await getDependencyGraph(rootStore.restApiContext);
		const qProjectId = route.query.projectId;
		if (typeof qProjectId === 'string' && qProjectId) {
			// Coming from a project page — go straight to workflows mode filtered to that project
			viewMode.value = 'workflows';
			filterProject.value = qProjectId;
		}
	} catch (e) {
		error.value = e instanceof Error ? e.message : 'Failed to load dependency graph';
	} finally {
		loading.value = false;
	}
}

function buildProjectGraph(): { nodes: SimNode[]; links: SimLink[] } {
	if (!graphData.value) return { nodes: [], links: [] };

	const raw = graphData.value;
	const nodeById = new Map<string, GraphNode>();
	for (const n of raw.nodes) nodeById.set(n.id, n);

	// Count workflows per project
	const wfCountByProject = new Map<string, number>();
	for (const n of raw.nodes) {
		if (n.type === 'workflow' && n.projectId) {
			wfCountByProject.set(n.projectId, (wfCountByProject.get(n.projectId) ?? 0) + 1);
		}
	}

	// Build cross-project edges from workflow links
	const edgeMap = new Map<string, { label: string; weight: number }>();
	for (const link of raw.links) {
		const src = nodeById.get(link.source);
		const tgt = nodeById.get(link.target);
		if (!src?.projectId || !tgt?.projectId) continue;
		if (src.projectId === tgt.projectId) continue;
		// Only workflow-to-workflow cross-project deps
		if (src.type !== 'workflow' || tgt.type !== 'workflow') continue;
		const key = `${src.projectId}->${tgt.projectId}`;
		const existing = edgeMap.get(key);
		if (existing) {
			existing.weight++;
		} else {
			edgeMap.set(key, { label: link.label, weight: 1 });
		}
	}

	const projectNodes: SimNode[] = availableProjects.value.map((p) => ({
		id: `proj_${p.id}`,
		label: p.name,
		type: 'project',
		projectId: p.id,
		projectName: p.name,
		workflowCount: wfCountByProject.get(p.id) ?? 0,
	}));

	const projectLinks: SimLink[] = [];
	for (const [key, val] of edgeMap) {
		const [srcProjId, tgtProjId] = key.split('->');
		projectLinks.push({
			source: `proj_${srcProjId}`,
			target: `proj_${tgtProjId}`,
			label: val.weight > 1 ? `${val.weight} deps` : val.label,
			weight: val.weight,
		});
	}

	return { nodes: projectNodes, links: projectLinks };
}

function buildWorkflowGraph(): { nodes: SimNode[]; links: SimLink[] } {
	if (!graphData.value) return { nodes: [], links: [] };

	let nodes: SimNode[] = graphData.value.nodes.map((n) => ({ ...n }));
	let links: SimLink[] = graphData.value.links.map((l) => ({
		source: l.source,
		target: l.target,
		label: l.label,
	}));

	const getLinkIds = (l: SimLink) => ({
		srcId: typeof l.source === 'string' ? l.source : (l.source as SimNode).id,
		tgtId: typeof l.target === 'string' ? l.target : (l.target as SimNode).id,
	});

	const filterNodes = (predicate: (n: SimNode) => boolean) => {
		nodes = nodes.filter(predicate);
		const ids = new Set(nodes.map((n) => n.id));
		links = links.filter((l) => {
			const { srcId, tgtId } = getLinkIds(l);
			return ids.has(srcId) && ids.has(tgtId);
		});
	};

	if (filterProject.value !== 'all') {
		// Start from this project's nodes, then follow outgoing edges recursively
		// to show the full dependency chain — but never pull in external callers.
		const keepIds = new Set(
			nodes.filter((n) => n.projectId === filterProject.value).map((n) => n.id),
		);
		// Build outgoing adjacency: source → [targets]
		const outgoing = new Map<string, string[]>();
		for (const link of links) {
			const { srcId, tgtId } = getLinkIds(link);
			let list = outgoing.get(srcId);
			if (!list) {
				list = [];
				outgoing.set(srcId, list);
			}
			list.push(tgtId);
		}
		// BFS along outgoing edges
		const queue = [...keepIds];
		while (queue.length > 0) {
			const current = queue.pop()!;
			for (const tgtId of outgoing.get(current) ?? []) {
				if (!keepIds.has(tgtId)) {
					keepIds.add(tgtId);
					queue.push(tgtId);
				}
			}
		}
		filterNodes((n) => keepIds.has(n.id));
	}

	if (!showCredentials.value) filterNodes((n) => n.type !== 'credential');
	if (!showDataTables.value) filterNodes((n) => n.type !== 'dataTable');
	if (searchQuery.value) {
		const q = searchQuery.value.toLowerCase();
		const matchIds = new Set(
			nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id),
		);
		for (const link of links) {
			const { srcId, tgtId } = getLinkIds(link);
			if (matchIds.has(srcId)) matchIds.add(tgtId);
			if (matchIds.has(tgtId)) matchIds.add(srcId);
		}
		filterNodes((n) => matchIds.has(n.id));
	}

	// Check for orphans after all other filters, then optionally remove them
	const connected = new Set<string>();
	for (const link of links) {
		const { srcId, tgtId } = getLinkIds(link);
		connected.add(srcId);
		connected.add(tgtId);
	}
	hasOrphans.value = nodes.some((n) => !connected.has(n.id));

	if (hideOrphans.value) {
		filterNodes((n) => connected.has(n.id));
	}

	return { nodes, links };
}

function getNodeColors(d: SimNode): { fill: string; stroke: string } {
	if (d.restricted) return RESTRICTED_COLORS;
	if (viewMode.value === 'projects' || d.type === 'workflow') {
		if (d.projectId) return projectColorMap.value.get(d.projectId) ?? PROJECT_PALETTE[0];
		return PROJECT_PALETTE[0];
	}
	if (d.type === 'credential') return CREDENTIAL_COLORS;
	if (d.type === 'dataTable') return DATATABLE_COLORS;
	return RESTRICTED_COLORS;
}

function renderGraph() {
	if (!svgRef.value || !graphData.value) return;

	const svg = d3Selection.select(svgRef.value);
	svg.selectAll('*').remove();

	const { nodes, links } =
		viewMode.value === 'projects' ? buildProjectGraph() : buildWorkflowGraph();

	if (nodes.length === 0) return;

	const width = svgRef.value.clientWidth;
	const height = svgRef.value.clientHeight;
	const isProjectMode = viewMode.value === 'projects';

	// Arrow markers
	const defs = svg.append('defs');
	['calls', 'error', 'uses', 'dep'].forEach((type) => {
		defs
			.append('marker')
			.attr('id', `arrow-${type}`)
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', isProjectMode ? 30 : 20)
			.attr('refY', 0)
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,-5L10,0L0,5')
			.attr('fill', type === 'error' ? '#DC2626' : type === 'calls' ? '#1D4ED8' : '#888888');
	});

	const g = svg.append('g');

	// Zoom
	const zoomBehavior = d3Zoom
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.1, 4])
		.on('zoom', (event: d3Zoom.D3ZoomEvent<SVGSVGElement, unknown>) => {
			g.attr('transform', event.transform.toString());
		});
	svg.call(zoomBehavior);

	// Links
	const link = g
		.append('g')
		.selectAll('line')
		.data(links)
		.join('line')
		.attr('stroke', (d: SimLink) =>
			d.label === 'error' ? '#DC2626' : d.label === 'calls' ? '#1D4ED8' : '#888888',
		)
		.attr('stroke-width', (d: SimLink) =>
			isProjectMode ? Math.min(1 + (d.weight ?? 1), 5) : d.label === 'calls' ? 2 : 1.5,
		)
		.attr('stroke-dasharray', (d: SimLink) => (d.label === 'error' ? '5,5' : 'none'))
		.attr('marker-end', (d: SimLink) =>
			isProjectMode ? 'url(#arrow-dep)' : `url(#arrow-${d.label})`,
		);

	// Link labels
	const linkLabel = g
		.append('g')
		.selectAll('text')
		.data(links)
		.join('text')
		.attr('font-size', 10)
		.attr('fill', '#666')
		.attr('text-anchor', 'middle')
		.text((d: SimLink) => d.label);

	// Node groups
	const node = g
		.append('g')
		.selectAll<SVGGElement, SimNode>('g')
		.data(nodes)
		.join('g')
		.attr('cursor', 'pointer')
		.on('click', (_event: MouseEvent, d: SimNode) => {
			if (isProjectMode && d.projectId) {
				// Click a project node -> drill into workflows mode for that project
				viewMode.value = 'workflows';
				filterProject.value = d.projectId;
			} else {
				selectedNode.value = d;
			}
		});

	// Drag behavior
	const dragBehavior = d3Drag
		.drag<SVGGElement, SimNode>()
		.on('start', (event: d3Drag.D3DragEvent<SVGGElement, SimNode, SimNode>, d: SimNode) => {
			if (!event.active) simulation?.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		})
		.on('drag', (event: d3Drag.D3DragEvent<SVGGElement, SimNode, SimNode>, d: SimNode) => {
			d.fx = event.x;
			d.fy = event.y;
		})
		.on('end', (event: d3Drag.D3DragEvent<SVGGElement, SimNode, SimNode>, d: SimNode) => {
			if (!event.active) simulation?.alphaTarget(0);
			d.fx = null;
			d.fy = null;
		});

	node.call(dragBehavior);

	// Node shapes
	node.each(function (this: SVGGElement, d: SimNode) {
		const el = d3Selection.select(this);
		const colors = getNodeColors(d);

		if (isProjectMode) {
			// Larger rounded rect for project nodes
			const r = 20 + (d.workflowCount ?? 0) * 2;
			const clampedR = Math.min(r, 40);
			el.append('rect')
				.attr('width', clampedR * 2)
				.attr('height', clampedR * 1.2)
				.attr('x', -clampedR)
				.attr('y', -clampedR * 0.6)
				.attr('rx', 8)
				.attr('fill', colors.fill)
				.attr('stroke', colors.stroke)
				.attr('stroke-width', 2.5);
			// Workflow count badge
			if (d.workflowCount) {
				el.append('text')
					.attr('text-anchor', 'middle')
					.attr('dy', 4)
					.attr('font-size', 12)
					.attr('font-weight', '600')
					.attr('fill', colors.stroke)
					.text(`${d.workflowCount} wf`);
			}
		} else if (d.type === 'workflow') {
			el.append('rect')
				.attr('width', 24)
				.attr('height', 24)
				.attr('x', -12)
				.attr('y', -12)
				.attr('rx', 4)
				.attr('fill', colors.fill)
				.attr('stroke', colors.stroke)
				.attr('stroke-width', 2);
		} else if (d.type === 'dataTable') {
			el.append('rect')
				.attr('width', 24)
				.attr('height', 20)
				.attr('x', -12)
				.attr('y', -10)
				.attr('rx', 3)
				.attr('fill', colors.fill)
				.attr('stroke', colors.stroke)
				.attr('stroke-width', 2);
			el.append('line')
				.attr('x1', -12)
				.attr('y1', -4)
				.attr('x2', 12)
				.attr('y2', -4)
				.attr('stroke', colors.stroke)
				.attr('stroke-width', 1);
		} else {
			// credential
			el.append('circle')
				.attr('r', 12)
				.attr('fill', colors.fill)
				.attr('stroke', colors.stroke)
				.attr('stroke-width', 2);
		}
	});

	// Node labels
	node
		.append('text')
		.attr('dy', isProjectMode ? 36 : 24)
		.attr('text-anchor', 'middle')
		.attr('font-size', isProjectMode ? 12 : 11)
		.attr('font-weight', isProjectMode ? '600' : 'normal')
		.attr('fill', '#374151')
		.text((d: SimNode) => (d.label.length > 30 ? d.label.slice(0, 27) + '...' : d.label));

	// Simulation
	if (simulation) simulation.stop();
	simulation = d3Force
		.forceSimulation<SimNode>(nodes)
		.force(
			'link',
			d3Force
				.forceLink<SimNode, SimLink>(links)
				.id((d) => d.id)
				.distance(isProjectMode ? 250 : 180),
		)
		.force('charge', d3Force.forceManyBody().strength(isProjectMode ? -800 : -600))
		.force('center', d3Force.forceCenter(width / 2, height / 2))
		.force('collision', d3Force.forceCollide(isProjectMode ? 80 : 60))
		.on('tick', () => {
			link
				.attr('x1', (d: SimLink) => (d.source as SimNode).x!)
				.attr('y1', (d: SimLink) => (d.source as SimNode).y!)
				.attr('x2', (d: SimLink) => (d.target as SimNode).x!)
				.attr('y2', (d: SimLink) => (d.target as SimNode).y!);

			linkLabel
				.attr('x', (d: SimLink) => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
				.attr('y', (d: SimLink) => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2 - 5);

			node.attr('transform', (d: SimNode) => `translate(${d.x},${d.y})`);
		});
}

watch([showCredentials, showDataTables, hideOrphans, filterProject, searchQuery, viewMode], () => {
	renderGraph();
});

onMounted(async () => {
	await loadGraph();
	renderGraph();
});

onUnmounted(() => {
	if (simulation) simulation.stop();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.toolbar">
			<h2 :class="$style.title">Dependency Graph</h2>

			<div :class="$style.modeTabs">
				<button
					:class="[$style.modeTab, viewMode === 'projects' && $style.modeTabActive]"
					@click="
						viewMode = 'projects';
						filterProject = 'all';
					"
				>
					Projects
				</button>
				<button
					:class="[$style.modeTab, viewMode === 'workflows' && $style.modeTabActive]"
					@click="viewMode = 'workflows'"
				>
					Workflows
				</button>
			</div>

			<div v-if="viewMode === 'workflows'" :class="$style.controls">
				<input
					v-model="searchQuery"
					:class="$style.search"
					type="text"
					placeholder="Search by name..."
				/>
				<select v-model="filterProject" :class="$style.filter">
					<option value="all">All projects</option>
					<option v-for="p in availableProjects" :key="p.id" :value="p.id">
						{{ p.name }}
					</option>
				</select>
			</div>

			<div v-if="viewMode === 'workflows'" :class="$style.toggles">
				<label :class="$style.toggle">
					<input v-model="showCredentials" type="checkbox" />
					<span :class="[$style.legendSwatch, $style.legendCredential]"></span>
					Credentials
				</label>
				<label :class="$style.toggle">
					<input v-model="showDataTables" type="checkbox" />
					<span :class="[$style.legendSwatch, $style.legendDataTable]"></span>
					Data Tables
				</label>
				<label v-if="hasOrphans" :class="[$style.toggle, $style.toggleDivider]">
					<input v-model="hideOrphans" type="checkbox" />
					Hide unconnected
				</label>
			</div>

			<!-- Project color legend in workflows mode -->
			<div
				v-if="viewMode === 'workflows' && projectLegend.length > 0"
				:class="$style.projectLegend"
			>
				<span
					v-for="p in projectLegend"
					:key="p.id"
					:class="$style.projectLegendItem"
					@click="filterProject = filterProject === p.id ? 'all' : p.id"
				>
					<span
						:class="$style.legendSwatch"
						:style="{ background: p.colors.fill, borderColor: p.colors.stroke }"
					></span>
					{{ p.name }}
				</span>
			</div>
		</div>

		<div v-if="loading" :class="$style.loading">Loading dependency graph...</div>
		<div v-else-if="error" :class="$style.error">{{ error }}</div>
		<div v-else-if="!graphData || graphData.nodes.length === 0" :class="$style.empty">
			No dependencies found. Workflows need to use credentials, call sub-workflows, or reference
			data tables to appear here.
		</div>
		<template v-else>
			<svg ref="svgRef" :class="$style.svg"></svg>

			<div v-if="viewMode === 'projects'" :class="$style.hint">
				Click a project to drill into its workflows
			</div>

			<div v-if="selectedNode" :class="$style.details">
				<div :class="$style.detailsHeader">
					<strong>{{ selectedNode.label }}</strong>
					<button :class="$style.closeBtn" @click="selectedNode = null">&times;</button>
				</div>
				<div :class="$style.detailsBody">
					<div>Type: {{ NODE_LABELS[selectedNode.type] || selectedNode.type }}</div>
					<div v-if="selectedNode.projectName">Project: {{ selectedNode.projectName }}</div>
					<div v-if="selectedNode.restricted" :class="$style.restricted">
						You don't have access to this resource
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	flex: 1;
	background: var(--color-background-light, #f9fafb);
	position: relative;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing-m, 16px);
	padding: var(--spacing-s, 12px) var(--spacing-l, 24px);
	border-bottom: 1px solid var(--color-foreground-base, #e5e7eb);
	background: var(--color-background-xlight, #fff);
	flex-wrap: wrap;
}

.title {
	font-size: var(--font-size-l, 18px);
	font-weight: 600;
	margin: 0;
}

.modeTabs {
	display: flex;
	border: 1px solid var(--color-foreground-base, #d1d5db);
	border-radius: var(--border-radius-base, 6px);
	overflow: hidden;
}

.modeTab {
	padding: var(--spacing-4xs, 4px) var(--spacing-s, 12px);
	font-size: var(--font-size-s, 13px);
	border: none;
	background: var(--color-background-xlight, #fff);
	color: var(--color-text-light, #6b7280);
	cursor: pointer;

	&:not(:last-child) {
		border-right: 1px solid var(--color-foreground-base, #d1d5db);
	}
}

.modeTabActive {
	background: var(--color-primary-tint-3, #e0e7ff);
	color: var(--color-primary, #4338ca);
	font-weight: 600;
}

.controls {
	display: flex;
	gap: var(--spacing-xs, 8px);
}

.search,
.filter {
	padding: var(--spacing-4xs, 4px) var(--spacing-xs, 8px);
	border: 1px solid var(--color-foreground-base, #d1d5db);
	border-radius: var(--border-radius-base, 6px);
	font-size: var(--font-size-s, 13px);
	background: var(--color-background-xlight, #fff);
	color: var(--color-text-base, #374151);
}

.search {
	width: 200px;
}

.toggles {
	display: flex;
	gap: var(--spacing-s, 12px);
	font-size: var(--font-size-2xs, 12px);
	color: var(--color-text-base, #374151);
}

.toggle {
	display: flex;
	align-items: center;
	gap: 4px;
	cursor: pointer;
	user-select: none;

	input[type='checkbox'] {
		margin: 0;
		cursor: pointer;
		accent-color: var(--color-primary, #4338ca);
		color-scheme: light;
		appearance: auto;
	}
}

.toggleDivider {
	margin-left: var(--spacing-xs, 8px);
	padding-left: var(--spacing-xs, 8px);
	border-left: 1px solid var(--color-foreground-base, #d1d5db);
}

.projectLegend {
	display: flex;
	gap: var(--spacing-xs, 8px);
	flex-wrap: wrap;
	width: 100%;
	padding-top: var(--spacing-3xs, 4px);
	font-size: var(--font-size-2xs, 11px);
}

.projectLegendItem {
	display: flex;
	align-items: center;
	gap: 3px;
	cursor: pointer;
	padding: 2px 6px;
	border-radius: 4px;
	color: var(--color-text-base, #374151);

	&:hover {
		background: var(--color-background-light, #f3f4f6);
	}
}

.legendSwatch {
	width: 12px;
	height: 12px;
	border-radius: 2px;
	border: 2px solid;
	flex-shrink: 0;
}

.legendCredential {
	background: #dcfce7;
	border-color: #15803d;
	border-radius: 50%;
}

.legendDataTable {
	background: #fed7aa;
	border-color: #c2410c;
}

.svg {
	flex: 1;
	width: 100%;
}

.hint {
	position: absolute;
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);
	font-size: var(--font-size-s, 13px);
	color: var(--color-text-light, #6b7280);
	background: var(--color-background-xlight, #fff);
	padding: var(--spacing-4xs, 4px) var(--spacing-s, 12px);
	border-radius: var(--border-radius-base, 6px);
	border: 1px solid var(--color-foreground-base, #e5e7eb);
	box-shadow: 0 2px 4px rgb(0 0 0 / 5%);
}

.loading,
.error,
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	font-size: var(--font-size-m, 14px);
	color: var(--color-text-light, #6b7280);
}

.error {
	color: var(--color-danger, #dc2626);
}

.details {
	position: absolute;
	right: 16px;
	top: 80px;
	background: var(--color-background-xlight, #fff);
	border: 1px solid var(--color-foreground-base, #e5e7eb);
	border-radius: var(--border-radius-base, 8px);
	padding: var(--spacing-s, 12px);
	min-width: 200px;
	box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
	z-index: 10;
}

.detailsHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing-xs, 8px);
}

.closeBtn {
	background: none;
	border: none;
	font-size: 18px;
	cursor: pointer;
	color: var(--color-text-light, #6b7280);
}

.detailsBody {
	font-size: var(--font-size-s, 13px);
	color: var(--color-text-base, #374151);
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.restricted {
	color: var(--color-danger, #dc2626);
	font-style: italic;
}
</style>
