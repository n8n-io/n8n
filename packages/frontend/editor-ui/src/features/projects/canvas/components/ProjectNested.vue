<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { GraphModel } from '../graph-model';
import {
	CREDENTIAL_TINT,
	folderColor,
	TRIGGER_TINTS,
	useFullProjectModel,
	usePanZoom,
} from '../atlas-shared';

const props = defineProps<{ projectId: string }>();

const i18n = useI18n();
const { isLoading, load } = useFullProjectModel(props.projectId);

/* ============================== compound structure ==============================
 * Folders are containers sized by their content; every unit lives in its PARENT's
 * local coordinate frame, so moving a container carries its whole subtree for free.
 * A simplified take on the compound spring embedder (fCoSE) idea.
 */

interface NestedUnit {
	id: string;
	kind: 'workflow' | 'credential' | 'folder';
	name: string;
	tint: string;
	parentId: string | null;
	/** local center within the parent frame */
	x: number;
	y: number;
	vx: number;
	vy: number;
	/** half extents — fixed for leaves, derived from content for folders */
	hw: number;
	hh: number;
}

interface NestedEdge {
	id: string;
	sourceId: string;
	targetId: string;
	type: 'calls-workflow' | 'uses-as-tool' | 'handles-errors-for' | 'uses-credential';
}

const LEAF_RADIUS = 11;
const CONTAINER_PADDING = 34;
const MIN_HALF = 40;

const units = shallowRef<NestedUnit[]>([]);
const edges = shallowRef<NestedEdge[]>([]);
let unitById = new Map<string, NestedUnit>();
let childrenByParent = new Map<string | null, NestedUnit[]>();
/** per parent level: springs between the level's representatives of each edge */
let levelSprings: Array<{ a: NestedUnit; b: NestedUnit; type: NestedEdge['type'] }> = [];

function buildStructure(model: GraphModel): void {
	const list: NestedUnit[] = [];
	for (const folder of model.folders.values()) {
		list.push({
			id: folder.id,
			kind: 'folder',
			name: folder.name,
			tint: folderColor(folder.id),
			parentId: folder.parentFolderId,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			hw: MIN_HALF,
			hh: MIN_HALF,
		});
	}
	for (const wf of model.workflows.values()) {
		list.push({
			id: wf.id,
			kind: 'workflow',
			name: wf.name,
			tint: model.toolTargets.has(wf.id)
				? 'var(--color--secondary)'
				: TRIGGER_TINTS[wf.triggerType],
			parentId: wf.external ? null : wf.parentFolderId,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			hw: LEAF_RADIUS,
			hh: LEAF_RADIUS,
		});
	}
	for (const credential of model.credentials.values()) {
		list.push({
			id: credential.id,
			kind: 'credential',
			name: credential.name,
			tint: CREDENTIAL_TINT,
			parentId: null,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			hw: LEAF_RADIUS - 2,
			hh: LEAF_RADIUS - 2,
		});
	}

	unitById = new Map(list.map((unit) => [unit.id, unit]));
	// guard against orphaned parents (e.g. folder of an external workflow)
	for (const unit of list) {
		if (unit.parentId && !unitById.has(unit.parentId)) unit.parentId = null;
	}
	childrenByParent = new Map();
	for (const unit of list) {
		const siblings = childrenByParent.get(unit.parentId) ?? [];
		siblings.push(unit);
		childrenByParent.set(unit.parentId, siblings);
	}

	// deterministic local seeding per sibling group
	for (const siblings of childrenByParent.values()) {
		siblings.forEach((unit, i) => {
			const angle = i * 2.399963229728653;
			const spread = 46 * Math.sqrt(i + 1);
			unit.x = Math.cos(angle) * spread;
			unit.y = Math.sin(angle) * spread;
		});
	}

	const allEdges: NestedEdge[] = [];
	for (const relation of model.relations) {
		if (!unitById.has(relation.source) || !unitById.has(relation.target)) continue;
		allEdges.push({
			id: `${relation.source}→${relation.target}:${relation.type}`,
			sourceId: relation.source,
			targetId: relation.target,
			type: relation.type,
		});
	}
	for (const link of model.credentialLinks) {
		if (!unitById.has(link.workflowId) || !unitById.has(link.credentialId)) continue;
		allEdges.push({
			id: `${link.workflowId}→${link.credentialId}:uses-credential`,
			sourceId: link.workflowId,
			targetId: link.credentialId,
			type: 'uses-credential',
		});
	}
	edges.value = allEdges;
	units.value = list;

	// project each edge onto every ancestor level it crosses: at each level the spring
	// acts between the two subtree representatives, keeping related containers close
	const chainOf = (id: string): string[] => {
		const chain: string[] = [id];
		let current = unitById.get(id)?.parentId ?? null;
		let guard = 0;
		while (current && guard++ < 50) {
			chain.push(current);
			current = unitById.get(current)?.parentId ?? null;
		}
		return chain; // self → ... → top-level
	};
	levelSprings = [];
	for (const edge of allEdges) {
		const chainA = chainOf(edge.sourceId);
		const chainB = chainOf(edge.targetId);
		// pair the representatives that share a parent at each level the edge crosses
		for (const idA of chainA) {
			const repA = unitById.get(idA)!;
			for (const idB of chainB) {
				const repB = unitById.get(idB)!;
				if (repA.id !== repB.id && repA.parentId === repB.parentId) {
					levelSprings.push({ a: repA, b: repB, type: edge.type });
				}
			}
		}
	}
}

/* ============================== simulation ============================== */

const config = reactive({
	repulsion: 2600,
	linkDistance: 110,
	spacing: 26,
});

let alpha = 1;
let rafId: number | null = null;

function reheat(): void {
	alpha = 1;
}

function tick(): void {
	alpha += (0.005 - alpha) * 0.01;

	// per sibling group: repulsion + rect collision + weak centering
	for (const siblings of childrenByParent.values()) {
		for (let i = 0; i < siblings.length; i++) {
			for (let j = i + 1; j < siblings.length; j++) {
				const a = siblings[i];
				const b = siblings[j];
				let dx = a.x - b.x;
				let dy = a.y - b.y;
				if (dx === 0 && dy === 0) {
					dx = (i - j) * 0.1;
					dy = 0.1;
				}
				const dist2 = dx * dx + dy * dy;
				const dist = Math.sqrt(dist2);
				const f = (config.repulsion / Math.max(dist2, 400)) * alpha;
				a.vx += (f * dx) / dist;
				a.vy += (f * dy) / dist;
				b.vx -= (f * dx) / dist;
				b.vy -= (f * dy) / dist;

				// rectangle collision along the axis of least overlap
				const overlapX = a.hw + b.hw + config.spacing - Math.abs(dx);
				const overlapY = a.hh + b.hh + config.spacing - Math.abs(dy);
				if (overlapX > 0 && overlapY > 0) {
					if (overlapX < overlapY) {
						const push = overlapX * 0.25 * Math.sign(dx || 1);
						a.x += push;
						b.x -= push;
					} else {
						const push = overlapY * 0.25 * Math.sign(dy || 1);
						a.y += push;
						b.y -= push;
					}
				}
			}
		}
		for (const unit of siblings) {
			unit.vx -= unit.x * 0.02 * alpha;
			unit.vy -= unit.y * 0.02 * alpha;
		}
	}

	// projected edge springs at every level
	for (const spring of levelSprings) {
		const { a, b } = spring;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const dist = Math.hypot(dx, dy) || 1;
		const rest = config.linkDistance + a.hw + b.hw;
		const f = 0.03 * (dist - rest) * alpha;
		a.vx += (f * dx) / dist;
		a.vy += (f * dy) / dist;
		b.vx -= (f * dx) / dist;
		b.vy -= (f * dy) / dist;
	}

	for (const unit of units.value) {
		unit.vx *= 0.82;
		unit.vy *= 0.82;
		unit.x += Math.max(-25, Math.min(25, unit.vx));
		unit.y += Math.max(-25, Math.min(25, unit.vy));
	}

	// containers resize to hug their content (bottom-up: children first)
	const resize = (folder: NestedUnit): void => {
		const children = childrenByParent.get(folder.id) ?? [];
		for (const child of children) if (child.kind === 'folder') resize(child);
		if (children.length === 0) {
			folder.hw = MIN_HALF;
			folder.hh = MIN_HALF;
			return;
		}
		let maxX = 0;
		let maxY = 0;
		let cx = 0;
		let cy = 0;
		for (const child of children) {
			cx += child.x;
			cy += child.y;
		}
		cx /= children.length;
		cy /= children.length;
		// recenter content within the container so the frame stays balanced
		for (const child of children) {
			child.x -= cx;
			child.y -= cy;
			maxX = Math.max(maxX, Math.abs(child.x) + child.hw);
			maxY = Math.max(maxY, Math.abs(child.y) + child.hh);
		}
		folder.x += cx;
		folder.y += cy;
		folder.hw = Math.max(MIN_HALF, maxX + CONTAINER_PADDING);
		folder.hh = Math.max(MIN_HALF, maxY + CONTAINER_PADDING);
	};
	for (const unit of childrenByParent.get(null) ?? []) {
		if (unit.kind === 'folder') resize(unit);
	}
}

/* ============================== rendering ============================== */

const svgEl = ref<SVGSVGElement>();
const worldEl = ref<SVGGElement>();
const unitEls = new Map<string, SVGGElement>();
const edgeEls = new Map<string, SVGLineElement>();

function setUnitEl(id: string, el: unknown): void {
	if (el) unitEls.set(id, el as SVGGElement);
	else unitEls.delete(id);
}

function setEdgeEl(id: string, el: unknown): void {
	if (el) edgeEls.set(id, el as SVGLineElement);
	else edgeEls.delete(id);
}

const { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, centerOn } =
	usePanZoom(svgEl);

function worldCenter(unit: NestedUnit): { x: number; y: number } {
	let x = unit.x;
	let y = unit.y;
	let current = unit.parentId ? unitById.get(unit.parentId) : undefined;
	let guard = 0;
	while (current && guard++ < 50) {
		x += current.x;
		y += current.y;
		current = current.parentId ? unitById.get(current.parentId) : undefined;
	}
	return { x, y };
}

function renderFrame(): void {
	for (const unit of units.value) {
		const el = unitEls.get(unit.id);
		if (!el) continue;
		const world = worldCenter(unit);
		el.setAttribute('transform', `translate(${world.x}, ${world.y})`);
		if (unit.kind === 'folder') {
			const rect = el.querySelector('rect');
			rect?.setAttribute('x', String(-unit.hw));
			rect?.setAttribute('y', String(-unit.hh));
			rect?.setAttribute('width', String(unit.hw * 2));
			rect?.setAttribute('height', String(unit.hh * 2));
			const label = el.querySelector('text');
			label?.setAttribute('y', String(-unit.hh + 16));
		}
	}
	for (const edge of edges.value) {
		const el = edgeEls.get(edge.id);
		const source = unitById.get(edge.sourceId);
		const target = unitById.get(edge.targetId);
		if (!el || !source || !target) continue;
		const s = worldCenter(source);
		const t = worldCenter(target);
		el.setAttribute('x1', String(s.x));
		el.setAttribute('y1', String(s.y));
		el.setAttribute('x2', String(t.x));
		el.setAttribute('y2', String(t.y));
	}
	worldEl.value?.setAttribute('transform', transform.value);
}

function loop(): void {
	tick();
	renderFrame();
	rafId = requestAnimationFrame(loop);
}

const hoveredId = ref<string | null>(null);

function isEdgeConnected(edge: NestedEdge): boolean {
	return (
		hoveredId.value !== null &&
		(edge.sourceId === hoveredId.value || edge.targetId === hoveredId.value)
	);
}

onMounted(async () => {
	const model = await load();
	buildStructure(model);
	await nextTick();
	centerOn(svgEl.value);
	rafId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
	if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<template>
	<div class="project-nested" data-testid="project-nested">
		<div v-if="isLoading" class="project-nested__state">
			{{ i18n.baseText('projectCanvas.atlas.loading') }}
		</div>
		<div v-else-if="units.length === 0" class="project-nested__state">
			{{ i18n.baseText('projectCanvas.atlas.empty') }}
		</div>
		<template v-else>
			<svg
				ref="svgEl"
				class="project-nested__svg"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerUp"
				@pointerleave="onPointerUp"
				@wheel="onWheel"
			>
				<g ref="worldEl">
					<!-- containers first so leaves and edges paint on top -->
					<g
						v-for="unit in units.filter((u) => u.kind === 'folder')"
						:key="unit.id"
						:ref="(el) => setUnitEl(unit.id, el)"
					>
						<rect
							class="project-nested__container"
							rx="14"
							:style="{ stroke: unit.tint, fill: unit.tint }"
						/>
						<text class="project-nested__container-label">{{ unit.name }}</text>
					</g>
					<line
						v-for="edge in edges"
						:key="edge.id"
						:ref="(el) => setEdgeEl(edge.id, el)"
						class="project-nested__edge"
						:class="{
							'project-nested__edge--tool': edge.type === 'uses-as-tool',
							'project-nested__edge--credential': edge.type === 'uses-credential',
							'project-nested__edge--highlighted': isEdgeConnected(edge),
							'project-nested__edge--dimmed': hoveredId !== null && !isEdgeConnected(edge),
						}"
					/>
					<g
						v-for="unit in units.filter((u) => u.kind !== 'folder')"
						:key="unit.id"
						:ref="(el) => setUnitEl(unit.id, el)"
						class="project-nested__leaf"
						@pointerenter="hoveredId = unit.id"
						@pointerleave="hoveredId = null"
					>
						<circle
							v-if="unit.kind === 'workflow'"
							:r="unit.hw"
							:style="{ fill: unit.tint }"
							class="project-nested__dot"
						/>
						<rect
							v-else
							:x="-unit.hw"
							:y="-unit.hw"
							:width="unit.hw * 2"
							:height="unit.hw * 2"
							rx="3"
							transform="rotate(45)"
							:style="{ fill: unit.tint }"
							class="project-nested__dot"
						/>
						<text class="project-nested__label" :y="unit.hw + 13">{{ unit.name }}</text>
					</g>
				</g>
			</svg>

			<div class="project-nested__config">
				<div class="project-nested__config-title">
					{{ i18n.baseText('projectCanvas.atlas.config.title') }}
				</div>
				<label class="project-nested__config-row">
					<span>{{ i18n.baseText('projectCanvas.atlas.config.repulsion') }}</span>
					<input
						v-model.number="config.repulsion"
						type="range"
						min="400"
						max="10000"
						step="100"
						@input="reheat"
					/>
				</label>
				<label class="project-nested__config-row">
					<span>{{ i18n.baseText('projectCanvas.atlas.config.linkDistance') }}</span>
					<input
						v-model.number="config.linkDistance"
						type="range"
						min="30"
						max="300"
						step="5"
						@input="reheat"
					/>
				</label>
				<label class="project-nested__config-row">
					<span>{{ i18n.baseText('projectCanvas.atlas.config.spacing') }}</span>
					<input
						v-model.number="config.spacing"
						type="range"
						min="6"
						max="80"
						step="2"
						@input="reheat"
					/>
				</label>
				<N8nButton type="secondary" size="mini" block @click="reheat">
					{{ i18n.baseText('projectCanvas.atlas.config.reheat') }}
				</N8nButton>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
.project-nested {
	position: relative;
	height: 100%;
	width: 100%;
	background: var(--color--background--light-2);
	overflow: hidden;
}

.project-nested__state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.project-nested__svg {
	width: 100%;
	height: 100%;
	cursor: grab;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}
}

.project-nested__container {
	fill-opacity: 0.07;
	stroke-opacity: 0.5;
	stroke-width: 1.5;
	stroke-dasharray: 6 4;
	pointer-events: none;
}

.project-nested__container-label {
	fill: var(--color--text);
	font-size: 10px;
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.07em;
	text-transform: uppercase;
	text-anchor: middle;
	pointer-events: none;
}

.project-nested__edge {
	stroke: var(--color--foreground--shade-1);
	stroke-width: 1.1;
	opacity: 0.55;

	&--tool {
		stroke: var(--color--secondary);
		stroke-dasharray: 5 4;
	}

	&--credential {
		stroke: var(--color--warning);
		stroke-width: 1;
		stroke-dasharray: 2 4;
		opacity: 0.4;
	}

	&--highlighted {
		stroke-width: 2.2;
		opacity: 1;
	}

	&--dimmed {
		opacity: 0.1;
	}
}

.project-nested__dot {
	stroke: var(--color--background--light-3);
	stroke-width: 2;
	opacity: 0.92;
}

.project-nested__label {
	fill: var(--color--text);
	font-size: 9px;
	text-anchor: middle;
	user-select: none;
	pointer-events: none;
}

.project-nested__config {
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

.project-nested__config-title {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.07em;
	text-transform: uppercase;
	color: var(--color--text);
}

.project-nested__config-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text);

	span {
		width: 80px;
		flex: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	input[type='range'] {
		flex: 1;
		min-width: 0;
	}
}
</style>
