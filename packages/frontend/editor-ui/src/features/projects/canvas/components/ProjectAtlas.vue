<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import { N8nButton } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';

import type { GraphModel, WorkflowRelationType } from '../graph-model';
import {
	CREDENTIAL_TINT,
	convexHull,
	folderColor,
	smoothClosedPath,
	TRIGGER_TINTS,
	useFullProjectModel,
	usePanZoom,
} from '../atlas-shared';

const props = defineProps<{ projectId: string; hulls?: boolean }>();

const i18n = useI18n();
const { isLoading, model: atlasModel, load } = useFullProjectModel(props.projectId);

/* ============================== data ============================== */

interface AtlasNode {
	id: string;
	kind: 'workflow' | 'credential';
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
	type: WorkflowRelationType | 'uses-credential';
}

const nodes = shallowRef<AtlasNode[]>([]);
const edges = shallowRef<AtlasEdge[]>([]);
const hullFolderIds = shallowRef<string[]>([]);

const TINTS = TRIGGER_TINTS;

function buildAtlas(model: GraphModel): void {
	// preserve current positions across rebuilds (e.g. credentials toggled on/off)
	const previous = new Map(nodes.value.map((node) => [node.id, node]));

	interface AtlasEntity {
		id: string;
		kind: AtlasNode['kind'];
		name: string;
		tint: string;
		folderId: string | null;
	}
	const entities: AtlasEntity[] = [...model.workflows.values()].map((wf) => ({
		id: wf.id,
		kind: 'workflow',
		name: wf.name,
		tint: model.toolTargets.has(wf.id) ? 'var(--color--secondary)' : TINTS[wf.triggerType],
		folderId: wf.external ? null : wf.parentFolderId,
	}));
	if (config.showCredentials) {
		for (const credential of model.credentials.values()) {
			entities.push({
				id: credential.id,
				kind: 'credential',
				name: credential.name,
				tint: CREDENTIAL_TINT,
				folderId: null,
			});
		}
	}
	const index = new Map(entities.map((entity, i) => [entity.id, i]));

	const atlasEdges: AtlasEdge[] = [];
	const degree = new Array<number>(entities.length).fill(0);
	const addEdge = (sourceId: string, targetId: string, type: AtlasEdge['type']): void => {
		const source = index.get(sourceId);
		const target = index.get(targetId);
		if (source === undefined || target === undefined || source === target) return;
		atlasEdges.push({ id: `${sourceId}→${targetId}:${type}`, source, target, type });
		degree[source]++;
		degree[target]++;
	};
	const relationVisible: Record<WorkflowRelationType, boolean> = {
		'calls-workflow': config.showCalls,
		'uses-as-tool': config.showTools,
		'handles-errors-for': config.showErrors,
	};
	for (const relation of model.relations) {
		if (!relationVisible[relation.type]) continue;
		addEdge(relation.source, relation.target, relation.type);
	}
	if (config.showCredentials) {
		for (const link of model.credentialLinks) {
			addEdge(link.workflowId, link.credentialId, 'uses-credential');
		}
	}

	nodes.value = entities.map((entity, i) => {
		const angle = i * 2.399963229728653;
		const spread = 40 * Math.sqrt(i + 1);
		const existing = previous.get(entity.id);
		return {
			...entity,
			radius:
				entity.kind === 'credential'
					? Math.min(16, 6 + Math.sqrt(degree[i]) * 2)
					: Math.min(22, 8 + Math.sqrt(degree[i]) * 2.5),
			x: existing?.x ?? Math.cos(angle) * spread,
			y: existing?.y ?? Math.sin(angle) * spread,
			vx: existing?.vx ?? 0,
			vy: existing?.vy ?? 0,
		};
	});
	edges.value = atlasEdges;
	hullFolderIds.value = props.hulls
		? [...new Set(nodes.value.map((node) => node.folderId).filter((id): id is string => !!id))]
		: [];
}

/** Rebuild the atlas after a content toggle, keeping node positions, and re-energize. */
function rebuildAtlas(): void {
	if (atlasModel.value) buildAtlas(atlasModel.value);
	reheat();
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
	showCalls: true,
	showTools: true,
	showErrors: true,
	showCredentials: true,
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
const hullEls = new Map<string, SVGPathElement>();

function setNodeEl(id: string, el: unknown): void {
	if (el) nodeEls.set(id, el as SVGGElement);
	else nodeEls.delete(id);
}

function setEdgeEl(id: string, el: unknown): void {
	if (el) edgeEls.set(id, el as SVGLineElement);
	else edgeEls.delete(id);
}

function setHullEl(id: string, el: unknown): void {
	if (el) hullEls.set(id, el as SVGPathElement);
	else hullEls.delete(id);
}

const { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, centerOn } =
	usePanZoom(svgEl);

const HULL_PADDING = 26;

function renderHulls(): void {
	if (!props.hulls) return;
	const members = new Map<string, AtlasNode[]>();
	for (const node of nodes.value) {
		if (!node.folderId) continue;
		const list = members.get(node.folderId) ?? [];
		list.push(node);
		members.set(node.folderId, list);
	}
	for (const folderId of hullFolderIds.value) {
		const el = hullEls.get(folderId);
		const list = members.get(folderId);
		if (!el || !list?.length) continue;
		// inflate each node into four offset points so the hull hugs the circles
		const points = list.flatMap((node) => {
			const r = node.radius + HULL_PADDING;
			return [
				{ x: node.x - r, y: node.y },
				{ x: node.x + r, y: node.y },
				{ x: node.x, y: node.y - r },
				{ x: node.x, y: node.y + r },
			];
		});
		el.setAttribute('d', smoothClosedPath(convexHull(points)));
	}
}

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
	renderHulls();
	worldEl.value?.setAttribute('transform', transform.value);
}

function loop(): void {
	tick();
	renderFrame();
	rafId = requestAnimationFrame(loop);
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
	const loaded = await load();
	buildAtlas(loaded);
	await nextTick();
	centerOn(svgEl.value);
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
					<path
						v-for="folderId in hullFolderIds"
						:key="folderId"
						:ref="(el) => setHullEl(folderId, el)"
						class="project-atlas__hull"
						:style="{ fill: folderColor(folderId), stroke: folderColor(folderId) }"
					/>
					<line
						v-for="edge in edges"
						:key="edge.id"
						:ref="(el) => setEdgeEl(edge.id, el)"
						class="project-atlas__edge"
						:class="{
							'project-atlas__edge--tool': edge.type === 'uses-as-tool',
							'project-atlas__edge--credential': edge.type === 'uses-credential',
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
						<circle
							v-if="node.kind === 'workflow'"
							:r="node.radius"
							:style="{ fill: node.tint }"
							class="project-atlas__dot"
						/>
						<rect
							v-else
							:x="-node.radius"
							:y="-node.radius"
							:width="node.radius * 2"
							:height="node.radius * 2"
							rx="3"
							transform="rotate(45)"
							:style="{ fill: node.tint }"
							class="project-atlas__dot project-atlas__dot--credential"
						/>
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
				<label class="project-atlas__config-row">
					<span class="project-atlas__config-label">
						{{ i18n.baseText('projectCanvas.filter.callsWorkflow') }}
					</span>
					<input
						v-model="config.showCalls"
						type="checkbox"
						data-testid="project-atlas-config-calls"
						@change="rebuildAtlas"
					/>
				</label>
				<label class="project-atlas__config-row">
					<span class="project-atlas__config-label">
						{{ i18n.baseText('projectCanvas.filter.usesAsTool') }}
					</span>
					<input
						v-model="config.showTools"
						type="checkbox"
						data-testid="project-atlas-config-tools"
						@change="rebuildAtlas"
					/>
				</label>
				<label class="project-atlas__config-row">
					<span class="project-atlas__config-label">
						{{ i18n.baseText('projectCanvas.filter.handlesErrors') }}
					</span>
					<input
						v-model="config.showErrors"
						type="checkbox"
						data-testid="project-atlas-config-errors"
						@change="rebuildAtlas"
					/>
				</label>
				<label class="project-atlas__config-row">
					<span class="project-atlas__config-label">
						{{ i18n.baseText('projectCanvas.atlas.config.credentials') }}
					</span>
					<input
						v-model="config.showCredentials"
						type="checkbox"
						data-testid="project-atlas-config-credentials"
						@change="rebuildAtlas"
					/>
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

.project-atlas__hull {
	fill-opacity: 0.1;
	stroke-opacity: 0.35;
	stroke-width: 1.5;
	pointer-events: none;
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

	&--credential {
		stroke: var(--color--warning);
		stroke-width: 1;
		stroke-dasharray: 2 4;
		opacity: 0.45;
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
