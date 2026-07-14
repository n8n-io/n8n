<script lang="ts" setup>
import { onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import { N8nButton } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import type { WorkflowTriggerType } from '@n8n/api-types';

import type { GraphModel, WorkflowRelationType } from '../graph-model';
import { buildGraphModel } from '../graph-model';
import { useProjectDependencyGraph } from '../composables/useProjectDependencyGraph';

const props = defineProps<{ projectId: string }>();

const i18n = useI18n();
const { fetchRootGraph, fetchFolderGraph, getAllGraphs } = useProjectDependencyGraph(
	props.projectId,
);

/* ============================== data ============================== */

interface AtlasNode {
	id: string;
	name: string;
	tint: string;
	radius: number;
	/** Direct parent folder — same-folder nodes attract each other into clusters. */
	folderId: string | null;
	x: number;
	y: number;
	vx: number;
	vy: number;
}

interface AtlasEdge {
	id: string;
	source: number;
	target: number;
	type: WorkflowRelationType;
}

const isLoading = ref(true);
const nodes = shallowRef<AtlasNode[]>([]);
const edges = shallowRef<AtlasEdge[]>([]);

const TINTS: Record<WorkflowTriggerType, string> = {
	chat: 'var(--color--primary)',
	webhook: 'var(--color--primary)',
	slack: 'var(--color--primary)',
	schedule: 'var(--color--success)',
	form: 'var(--color--success)',
	error: 'var(--color--warning)',
	mcp: 'var(--color--secondary)',
	subworkflow: 'var(--color--text--tint-1)',
	manual: 'var(--color--text--tint-1)',
	none: 'var(--color--text--tint-1)',
};

/** Fetch the root graph plus every folder discovered along the way — the full project. */
async function fetchWholeProject(): Promise<GraphModel> {
	await fetchRootGraph();
	const fetched = new Set<string>();
	let model = buildGraphModel(getAllGraphs());
	let guard = 0;
	while (guard++ < 50) {
		const pending = [...model.folders.keys()].filter((id) => !fetched.has(id));
		if (pending.length === 0) break;
		for (const folderId of pending) {
			fetched.add(folderId);
			await fetchFolderGraph(folderId);
		}
		model = buildGraphModel(getAllGraphs());
	}
	return model;
}

function buildAtlas(model: GraphModel): void {
	const workflows = [...model.workflows.values()];
	const index = new Map(workflows.map((wf, i) => [wf.id, i]));

	const atlasEdges: AtlasEdge[] = [];
	const degree = new Array<number>(workflows.length).fill(0);
	for (const relation of model.relations) {
		const source = index.get(relation.source);
		const target = index.get(relation.target);
		if (source === undefined || target === undefined || source === target) continue;
		atlasEdges.push({
			id: `${relation.source}→${relation.target}:${relation.type}`,
			source,
			target,
			type: relation.type,
		});
		degree[source]++;
		degree[target]++;
	}

	nodes.value = workflows.map((wf, i) => {
		const angle = i * 2.399963229728653;
		const spread = 40 * Math.sqrt(i + 1);
		return {
			id: wf.id,
			name: wf.name,
			tint: model.toolTargets.has(wf.id) ? 'var(--color--secondary)' : TINTS[wf.triggerType],
			radius: Math.min(22, 8 + Math.sqrt(degree[i]) * 2.5),
			folderId: wf.external ? null : wf.parentFolderId,
			x: Math.cos(angle) * spread,
			y: Math.sin(angle) * spread,
			vx: 0,
			vy: 0,
		};
	});
	edges.value = atlasEdges;
}

/* ============================== simulation ============================== */

const config = reactive({
	repulsion: 4000,
	linkDistance: 140,
	linkStrength: 0.04,
	gravity: 0.04,
	/** Pull towards the centroid of same-folder workflows — clusters folders together. */
	cohesion: 0.06,
	friction: 0.85,
	/** Residual energy — keeps the atlas gently drifting instead of freezing. */
	activity: 0.02,
	showLabels: true,
});

/** Hard collision: nodes never overlap, whatever the other forces say. */
const COLLISION_PADDING = 10;
const COLLISION_STRENGTH = 0.5;

let alpha = 1;
let rafId: number | null = null;

function tick(): void {
	const ns = nodes.value;
	const n = ns.length;
	alpha += (config.activity - alpha) * 0.01;

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const a = ns[i];
			const b = ns[j];
			let dx = a.x - b.x;
			let dy = a.y - b.y;
			let dist2 = dx * dx + dy * dy;
			if (dist2 < 1) {
				// deterministic nudge for coincident nodes
				dx = (i - j) * 0.1;
				dy = 0.1;
				dist2 = dx * dx + dy * dy;
			}
			const dist = Math.sqrt(dist2);
			const f = (config.repulsion / dist2) * alpha;
			const fx = (f * dx) / dist;
			const fy = (f * dy) / dist;
			a.vx += fx;
			a.vy += fy;
			b.vx -= fx;
			b.vy -= fy;

			// collision: direct position correction, not alpha-scaled — overlaps get
			// resolved even when the simulation has cooled down
			const minDist = a.radius + b.radius + COLLISION_PADDING;
			if (dist < minDist) {
				const push = ((minDist - dist) / dist) * COLLISION_STRENGTH;
				const px = dx * push * 0.5;
				const py = dy * push * 0.5;
				a.x += px;
				a.y += py;
				b.x -= px;
				b.y -= py;
			}
		}
	}

	for (const edge of edges.value) {
		const s = ns[edge.source];
		const t = ns[edge.target];
		const dx = t.x - s.x;
		const dy = t.y - s.y;
		const dist = Math.hypot(dx, dy) || 1;
		const rest = edge.type === 'uses-as-tool' ? config.linkDistance * 0.7 : config.linkDistance;
		const f = config.linkStrength * (dist - rest) * alpha;
		s.vx += (f * dx) / dist;
		s.vy += (f * dy) / dist;
		t.vx -= (f * dx) / dist;
		t.vy -= (f * dy) / dist;
	}

	// folder cohesion: pull each workflow towards its folder's centroid, so same-folder
	// workflows settle near each other regardless of their edges
	if (config.cohesion > 0) {
		const centroids = new Map<string, { x: number; y: number; count: number }>();
		for (const node of ns) {
			if (!node.folderId) continue;
			const c = centroids.get(node.folderId) ?? { x: 0, y: 0, count: 0 };
			c.x += node.x;
			c.y += node.y;
			c.count++;
			centroids.set(node.folderId, c);
		}
		for (const node of ns) {
			if (!node.folderId) continue;
			const c = centroids.get(node.folderId);
			if (!c || c.count < 2) continue;
			node.vx += (c.x / c.count - node.x) * config.cohesion * alpha;
			node.vy += (c.y / c.count - node.y) * config.cohesion * alpha;
		}
	}

	for (const node of ns) {
		node.vx -= node.x * config.gravity * alpha;
		node.vy -= node.y * config.gravity * alpha;
		node.vx *= config.friction;
		node.vy *= config.friction;
		node.x += Math.max(-30, Math.min(30, node.vx));
		node.y += Math.max(-30, Math.min(30, node.vy));
	}
}

function reheat(): void {
	alpha = 1;
}

/* ============================== rendering ============================== */

const svgEl = ref<SVGSVGElement>();
const worldEl = ref<SVGGElement>();
const nodeEls = new Map<string, SVGGElement>();
const edgeEls = new Map<string, SVGLineElement>();

function setNodeEl(id: string, el: unknown): void {
	if (el) nodeEls.set(id, el as SVGGElement);
	else nodeEls.delete(id);
}

function setEdgeEl(id: string, el: unknown): void {
	if (el) edgeEls.set(id, el as SVGLineElement);
	else edgeEls.delete(id);
}

const view = { x: 0, y: 0, zoom: 1 };

function renderFrame(): void {
	const ns = nodes.value;
	for (const node of ns) {
		const el = nodeEls.get(node.id);
		if (el) el.setAttribute('transform', `translate(${node.x}, ${node.y})`);
	}
	for (const edge of edges.value) {
		const el = edgeEls.get(edge.id);
		if (!el) continue;
		const s = ns[edge.source];
		const t = ns[edge.target];
		el.setAttribute('x1', String(s.x));
		el.setAttribute('y1', String(s.y));
		el.setAttribute('x2', String(t.x));
		el.setAttribute('y2', String(t.y));
	}
	worldEl.value?.setAttribute('transform', `translate(${view.x}, ${view.y}) scale(${view.zoom})`);
}

function loop(): void {
	tick();
	renderFrame();
	rafId = requestAnimationFrame(loop);
}

/* ============================== view navigation (no node dragging) ============================== */

let panning: { startX: number; startY: number; viewX: number; viewY: number } | null = null;

function onPointerDown(event: PointerEvent): void {
	if (event.button !== 0) return;
	panning = { startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y };
}

function onPointerMove(event: PointerEvent): void {
	if (!panning) return;
	view.x = panning.viewX + (event.clientX - panning.startX);
	view.y = panning.viewY + (event.clientY - panning.startY);
}

function onPointerUp(): void {
	panning = null;
}

function onWheel(event: WheelEvent): void {
	event.preventDefault();
	const bounds = svgEl.value?.getBoundingClientRect();
	if (!bounds) return;
	if (event.ctrlKey || event.metaKey) {
		const factor = Math.exp(-event.deltaY * 0.01);
		const zoom = Math.min(3, Math.max(0.1, view.zoom * factor));
		const cx = event.clientX - bounds.left;
		const cy = event.clientY - bounds.top;
		view.x = cx - ((cx - view.x) / view.zoom) * zoom;
		view.y = cy - ((cy - view.y) / view.zoom) * zoom;
		view.zoom = zoom;
	} else {
		view.x -= event.deltaX;
		view.y -= event.deltaY;
	}
}

/* ============================== hover ============================== */

const hoveredId = ref<string | null>(null);

function isEdgeConnected(edge: AtlasEdge): boolean {
	if (!hoveredId.value) return false;
	const ns = nodes.value;
	return ns[edge.source]?.id === hoveredId.value || ns[edge.target]?.id === hoveredId.value;
}

/* ============================== lifecycle ============================== */

onMounted(async () => {
	try {
		const model = await fetchWholeProject();
		buildAtlas(model);
	} finally {
		isLoading.value = false;
	}
	const bounds = svgEl.value?.getBoundingClientRect();
	if (bounds) {
		view.x = bounds.width / 2;
		view.y = bounds.height / 2;
	}
	rafId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
	if (rafId !== null) cancelAnimationFrame(rafId);
});

const sliders: Array<{
	key:
		| 'repulsion'
		| 'linkDistance'
		| 'linkStrength'
		| 'gravity'
		| 'cohesion'
		| 'friction'
		| 'activity';
	labelKey: BaseTextKey;
	min: number;
	max: number;
	step: number;
}> = [
	{
		key: 'repulsion',
		labelKey: 'projectCanvas.atlas.config.repulsion',
		min: 200,
		max: 20000,
		step: 100,
	},
	{
		key: 'linkDistance',
		labelKey: 'projectCanvas.atlas.config.linkDistance',
		min: 40,
		max: 400,
		step: 5,
	},
	{
		key: 'linkStrength',
		labelKey: 'projectCanvas.atlas.config.linkStrength',
		min: 0.005,
		max: 0.2,
		step: 0.005,
	},
	{ key: 'gravity', labelKey: 'projectCanvas.atlas.config.gravity', min: 0, max: 0.2, step: 0.005 },
	{
		key: 'cohesion',
		labelKey: 'projectCanvas.atlas.config.cohesion',
		min: 0,
		max: 0.25,
		step: 0.005,
	},
	{
		key: 'friction',
		labelKey: 'projectCanvas.atlas.config.friction',
		min: 0.5,
		max: 0.98,
		step: 0.01,
	},
	{
		key: 'activity',
		labelKey: 'projectCanvas.atlas.config.activity',
		min: 0,
		max: 0.1,
		step: 0.005,
	},
];
</script>

<template>
	<div class="project-atlas" data-testid="project-atlas">
		<div v-if="isLoading" class="project-atlas__state">
			{{ i18n.baseText('projectCanvas.atlas.loading') }}
		</div>
		<div v-else-if="nodes.length === 0" class="project-atlas__state">
			{{ i18n.baseText('projectCanvas.atlas.empty') }}
		</div>
		<template v-else>
			<svg
				ref="svgEl"
				class="project-atlas__svg"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerUp"
				@pointerleave="onPointerUp"
				@wheel="onWheel"
			>
				<g ref="worldEl">
					<line
						v-for="edge in edges"
						:key="edge.id"
						:ref="(el) => setEdgeEl(edge.id, el)"
						class="project-atlas__edge"
						:class="{
							'project-atlas__edge--tool': edge.type === 'uses-as-tool',
							'project-atlas__edge--highlighted': isEdgeConnected(edge),
							'project-atlas__edge--dimmed': hoveredId !== null && !isEdgeConnected(edge),
						}"
					/>
					<g
						v-for="node in nodes"
						:key="node.id"
						:ref="(el) => setNodeEl(node.id, el)"
						class="project-atlas__node"
						@pointerenter="hoveredId = node.id"
						@pointerleave="hoveredId = null"
					>
						<circle :r="node.radius" :style="{ fill: node.tint }" class="project-atlas__dot" />
						<text
							v-if="config.showLabels || hoveredId === node.id"
							class="project-atlas__label"
							:class="{ 'project-atlas__label--hovered': hoveredId === node.id }"
							:y="node.radius + 14"
						>
							{{ node.name }}
						</text>
					</g>
				</g>
			</svg>

			<div class="project-atlas__config">
				<div class="project-atlas__config-title">
					{{ i18n.baseText('projectCanvas.atlas.config.title') }}
				</div>
				<label v-for="slider in sliders" :key="slider.key" class="project-atlas__config-row">
					<span class="project-atlas__config-label">
						{{ i18n.baseText(slider.labelKey) }}
					</span>
					<input
						v-model.number="config[slider.key]"
						type="range"
						:min="slider.min"
						:max="slider.max"
						:step="slider.step"
						:data-testid="`project-atlas-config-${slider.key}`"
						@input="reheat"
					/>
				</label>
				<label class="project-atlas__config-row">
					<span class="project-atlas__config-label">
						{{ i18n.baseText('projectCanvas.atlas.config.labels') }}
					</span>
					<input v-model="config.showLabels" type="checkbox" />
				</label>
				<N8nButton
					type="secondary"
					size="mini"
					block
					data-testid="project-atlas-reheat"
					@click="reheat"
				>
					{{ i18n.baseText('projectCanvas.atlas.config.reheat') }}
				</N8nButton>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
.project-atlas {
	position: relative;
	height: 100%;
	width: 100%;
	background: var(--color--background--light-2);
	overflow: hidden;
}

.project-atlas__state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.project-atlas__svg {
	width: 100%;
	height: 100%;
	cursor: grab;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}
}

.project-atlas__edge {
	stroke: var(--color--foreground--shade-1);
	stroke-width: 1.2;
	opacity: 0.6;
	transition: opacity 0.15s ease;

	&--tool {
		stroke: var(--color--secondary);
		stroke-dasharray: 5 4;
	}

	&--highlighted {
		stroke-width: 2.2;
		opacity: 1;
	}

	&--dimmed {
		opacity: 0.12;
	}
}

.project-atlas__dot {
	stroke: var(--color--background--light-3);
	stroke-width: 2;
	opacity: 0.9;
}

.project-atlas__node {
	cursor: default;

	&:hover .project-atlas__dot {
		opacity: 1;
	}
}

.project-atlas__label {
	fill: var(--color--text);
	font-size: 10px;
	text-anchor: middle;
	user-select: none;
	pointer-events: none;

	&--hovered {
		fill: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
	}
}

.project-atlas__config {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	width: 220px;
	padding: var(--spacing--2xs);
	background: var(--color--background--light-3);
	border: var(--border-width) solid var(--color--foreground);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.project-atlas__config-title {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.07em;
	text-transform: uppercase;
	color: var(--color--text);
}

.project-atlas__config-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text);

	input[type='range'] {
		flex: 1;
		min-width: 0;
	}
}

.project-atlas__config-label {
	width: 80px;
	flex: none;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
