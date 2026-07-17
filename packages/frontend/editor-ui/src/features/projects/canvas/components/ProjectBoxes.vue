<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { GraphModel, WorkflowRelationType } from '../graph-model';
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

/* ============================== group-in-a-box structure ==============================
 * One box per top-level folder (nested contents flattened in), plus a box for root-level
 * workflows. The canvas is partitioned as a binary treemap sized by member count; a small
 * force simulation runs inside each box; cross-box edges are drawn dimmed.
 */

interface BoxNode {
	id: string;
	kind: 'workflow' | 'credential';
	name: string;
	tint: string;
	boxIndex: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
}

interface Box {
	id: string;
	name: string;
	color: string;
	x: number;
	y: number;
	w: number;
	h: number;
	memberCount: number;
}

interface BoxEdge {
	id: string;
	source: number;
	target: number;
	type: WorkflowRelationType;
	crossBox: boolean;
}

const WORLD_W = 1500;
const WORLD_H = 950;

const boxes = shallowRef<Box[]>([]);
const nodes = shallowRef<BoxNode[]>([]);
const edges = shallowRef<BoxEdge[]>([]);

/** Binary treemap: recursively split the weight list across the rect's longer side. */
function treemap(
	items: Array<{ index: number; weight: number }>,
	rect: { x: number; y: number; w: number; h: number },
	out: Map<number, { x: number; y: number; w: number; h: number }>,
): void {
	if (items.length === 0) return;
	if (items.length === 1) {
		out.set(items[0].index, rect);
		return;
	}
	const total = items.reduce((sum, item) => sum + item.weight, 0);
	// split items into two halves of roughly equal weight
	let acc = 0;
	let splitAt = 1;
	for (let i = 0; i < items.length - 1; i++) {
		acc += items[i].weight;
		if (acc >= total / 2) {
			splitAt = i + 1;
			break;
		}
		splitAt = i + 1;
	}
	const first = items.slice(0, splitAt);
	const second = items.slice(splitAt);
	const firstWeight = first.reduce((sum, item) => sum + item.weight, 0);
	const ratio = total > 0 ? firstWeight / total : 0.5;
	if (rect.w >= rect.h) {
		const w = rect.w * ratio;
		treemap(first, { ...rect, w }, out);
		treemap(second, { ...rect, x: rect.x + w, w: rect.w - w }, out);
	} else {
		const h = rect.h * ratio;
		treemap(first, { ...rect, h }, out);
		treemap(second, { ...rect, y: rect.y + h, h: rect.h - h }, out);
	}
}

function topLevelAncestor(model: GraphModel, folderId: string | null): string | null {
	let current = folderId;
	let guard = 0;
	while (current && guard++ < 50) {
		const parent = model.folders.get(current)?.parentFolderId ?? null;
		if (parent === null) return current;
		current = parent;
	}
	return null;
}

function buildBoxes(model: GraphModel): void {
	// group id: top-level folder id, or 'root'
	const groupOf = new Map<string, string>();
	for (const wf of model.workflows.values()) {
		const top = wf.external ? null : topLevelAncestor(model, wf.parentFolderId);
		groupOf.set(wf.id, top ?? 'root');
	}
	// credentials live in the box where most of their users are
	for (const credential of model.credentials.values()) {
		const counts = new Map<string, number>();
		for (const link of model.credentialLinks) {
			if (link.credentialId !== credential.id) continue;
			const group = groupOf.get(link.workflowId);
			if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
		}
		let best = 'root';
		let bestCount = -1;
		for (const [group, count] of counts) {
			if (count > bestCount) {
				best = group;
				bestCount = count;
			}
		}
		groupOf.set(credential.id, best);
	}

	const groupIds = [...new Set(groupOf.values())];
	// stable order: biggest groups first for better treemap aspect ratios
	const memberCounts = new Map<string, number>();
	for (const group of groupOf.values()) {
		memberCounts.set(group, (memberCounts.get(group) ?? 0) + 1);
	}
	groupIds.sort((a, b) => (memberCounts.get(b) ?? 0) - (memberCounts.get(a) ?? 0));

	const rects = new Map<number, { x: number; y: number; w: number; h: number }>();
	treemap(
		groupIds.map((id, index) => ({ index, weight: Math.max(1, memberCounts.get(id) ?? 1) })),
		{ x: -WORLD_W / 2, y: -WORLD_H / 2, w: WORLD_W, h: WORLD_H },
		rects,
	);

	const GAP = 14;
	boxes.value = groupIds.map((id, index) => {
		const rect = rects.get(index)!;
		return {
			id,
			name:
				id === 'root'
					? i18n.baseText('projectCanvas.boxes.rootGroup')
					: (model.folders.get(id)?.name ?? id),
			color: id === 'root' ? 'var(--color--text--tint-1)' : folderColor(id),
			x: rect.x + GAP / 2,
			y: rect.y + GAP / 2,
			w: rect.w - GAP,
			h: rect.h - GAP,
			memberCount: memberCounts.get(id) ?? 0,
		};
	});
	const boxIndexOf = new Map(groupIds.map((id, i) => [id, i]));

	const list: BoxNode[] = [];
	const seed = new Map<number, number>();
	const pushNode = (id: string, kind: BoxNode['kind'], name: string, tint: string): void => {
		const boxIndex = boxIndexOf.get(groupOf.get(id) ?? 'root') ?? 0;
		const box = boxes.value[boxIndex];
		const i = seed.get(boxIndex) ?? 0;
		seed.set(boxIndex, i + 1);
		const angle = i * 2.399963229728653;
		const spread = 14 * Math.sqrt(i + 1);
		list.push({
			id,
			kind,
			name,
			tint,
			boxIndex,
			x: box.x + box.w / 2 + Math.cos(angle) * spread,
			y: box.y + box.h / 2 + Math.sin(angle) * spread,
			vx: 0,
			vy: 0,
			radius: kind === 'credential' ? 7 : 9,
		});
	};
	for (const wf of model.workflows.values()) {
		pushNode(
			wf.id,
			'workflow',
			wf.name,
			model.toolTargets.has(wf.id) ? 'var(--color--secondary)' : TRIGGER_TINTS[wf.triggerType],
		);
	}
	for (const credential of model.credentials.values()) {
		pushNode(credential.id, 'credential', credential.name, CREDENTIAL_TINT);
	}
	nodes.value = list;
	const indexOf = new Map(list.map((node, i) => [node.id, i]));

	const boxEdges: BoxEdge[] = [];
	const addEdge = (sourceId: string, targetId: string, type: BoxEdge['type']): void => {
		const source = indexOf.get(sourceId);
		const target = indexOf.get(targetId);
		if (source === undefined || target === undefined || source === target) return;
		boxEdges.push({
			id: `${sourceId}→${targetId}:${type}`,
			source,
			target,
			type,
			crossBox: list[source].boxIndex !== list[target].boxIndex,
		});
	};
	for (const relation of model.relations) addEdge(relation.source, relation.target, relation.type);
	for (const link of model.credentialLinks) {
		addEdge(link.workflowId, link.credentialId, 'uses-credential');
	}
	edges.value = boxEdges;
}

/* ============================== per-box simulation ============================== */

const config = reactive({ repulsion: 1500, linkDistance: 70 });

let alpha = 1;
let rafId: number | null = null;

function reheat(): void {
	alpha = 1;
}

function tick(): void {
	const ns = nodes.value;
	alpha += (0.004 - alpha) * 0.012;

	for (let i = 0; i < ns.length; i++) {
		for (let j = i + 1; j < ns.length; j++) {
			const a = ns[i];
			const b = ns[j];
			if (a.boxIndex !== b.boxIndex) continue;
			let dx = a.x - b.x;
			let dy = a.y - b.y;
			if (dx === 0 && dy === 0) {
				dx = (i - j) * 0.1;
				dy = 0.1;
			}
			const dist2 = dx * dx + dy * dy;
			const dist = Math.sqrt(dist2);
			const f = (config.repulsion / Math.max(dist2, 200)) * alpha;
			a.vx += (f * dx) / dist;
			a.vy += (f * dy) / dist;
			b.vx -= (f * dx) / dist;
			b.vy -= (f * dy) / dist;

			const minDist = a.radius + b.radius + 22;
			if (dist < minDist) {
				const push = ((minDist - dist) / dist) * 0.4;
				a.x += dx * push * 0.5;
				a.y += dy * push * 0.5;
				b.x -= dx * push * 0.5;
				b.y -= dy * push * 0.5;
			}
		}
	}

	// intra-box springs only — the treemap already encodes cross-box structure
	for (const edge of edges.value) {
		if (edge.crossBox) continue;
		const s = ns[edge.source];
		const t = ns[edge.target];
		const dx = t.x - s.x;
		const dy = t.y - s.y;
		const dist = Math.hypot(dx, dy) || 1;
		const f = 0.05 * (dist - config.linkDistance) * alpha;
		s.vx += (f * dx) / dist;
		s.vy += (f * dy) / dist;
		t.vx -= (f * dx) / dist;
		t.vy -= (f * dy) / dist;
	}

	for (const node of ns) {
		const box = boxes.value[node.boxIndex];
		// weak pull to box center
		node.vx += (box.x + box.w / 2 - node.x) * 0.01 * alpha;
		node.vy += (box.y + box.h / 2 - node.y) * 0.012 * alpha;
		node.vx *= 0.8;
		node.vy *= 0.8;
		node.x += Math.max(-20, Math.min(20, node.vx));
		node.y += Math.max(-20, Math.min(20, node.vy));
		// hard clamp to the box interior
		const margin = node.radius + 8;
		node.x = Math.max(box.x + margin, Math.min(box.x + box.w - margin, node.x));
		node.y = Math.max(box.y + margin + 16, Math.min(box.y + box.h - margin, node.y));
	}
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

const { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, centerOn } =
	usePanZoom(svgEl);

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
	worldEl.value?.setAttribute('transform', transform.value);
}

function loop(): void {
	tick();
	renderFrame();
	rafId = requestAnimationFrame(loop);
}

const hoveredId = ref<string | null>(null);

function isEdgeConnected(edge: BoxEdge): boolean {
	if (!hoveredId.value) return false;
	const ns = nodes.value;
	return ns[edge.source]?.id === hoveredId.value || ns[edge.target]?.id === hoveredId.value;
}

onMounted(async () => {
	const model = await load();
	buildBoxes(model);
	await nextTick();
	centerOn(svgEl.value);
	rafId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
	if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<template>
	<div class="project-boxes" data-testid="project-boxes">
		<div v-if="isLoading" class="project-boxes__state">
			{{ i18n.baseText('projectCanvas.atlas.loading') }}
		</div>
		<div v-else-if="nodes.length === 0" class="project-boxes__state">
			{{ i18n.baseText('projectCanvas.atlas.empty') }}
		</div>
		<template v-else>
			<svg
				ref="svgEl"
				class="project-boxes__svg"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerUp"
				@pointerleave="onPointerUp"
				@wheel="onWheel"
			>
				<g ref="worldEl">
					<g v-for="box in boxes" :key="box.id">
						<rect
							class="project-boxes__box"
							:x="box.x"
							:y="box.y"
							:width="box.w"
							:height="box.h"
							rx="12"
							:style="{ stroke: box.color, fill: box.color }"
						/>
						<text class="project-boxes__box-label" :x="box.x + 12" :y="box.y + 18">
							{{ box.name }} · {{ box.memberCount }}
						</text>
					</g>
					<line
						v-for="edge in edges"
						:key="edge.id"
						:ref="(el) => setEdgeEl(edge.id, el)"
						class="project-boxes__edge"
						:class="{
							'project-boxes__edge--tool': edge.type === 'uses-as-tool',
							'project-boxes__edge--credential': edge.type === 'uses-credential',
							'project-boxes__edge--cross': edge.crossBox,
							'project-boxes__edge--highlighted': isEdgeConnected(edge),
							'project-boxes__edge--dimmed': hoveredId !== null && !isEdgeConnected(edge),
						}"
					/>
					<g
						v-for="node in nodes"
						:key="node.id"
						:ref="(el) => setNodeEl(node.id, el)"
						class="project-boxes__node"
						@pointerenter="hoveredId = node.id"
						@pointerleave="hoveredId = null"
					>
						<circle
							v-if="node.kind === 'workflow'"
							:r="node.radius"
							:style="{ fill: node.tint }"
							class="project-boxes__dot"
						/>
						<rect
							v-else
							:x="-node.radius"
							:y="-node.radius"
							:width="node.radius * 2"
							:height="node.radius * 2"
							rx="2"
							transform="rotate(45)"
							:style="{ fill: node.tint }"
							class="project-boxes__dot"
						/>
						<text class="project-boxes__label" :y="node.radius + 11">{{ node.name }}</text>
					</g>
				</g>
			</svg>

			<div class="project-boxes__config">
				<div class="project-boxes__config-title">
					{{ i18n.baseText('projectCanvas.atlas.config.title') }}
				</div>
				<label class="project-boxes__config-row">
					<span>{{ i18n.baseText('projectCanvas.atlas.config.repulsion') }}</span>
					<input
						v-model.number="config.repulsion"
						type="range"
						min="200"
						max="6000"
						step="100"
						@input="reheat"
					/>
				</label>
				<label class="project-boxes__config-row">
					<span>{{ i18n.baseText('projectCanvas.atlas.config.linkDistance') }}</span>
					<input
						v-model.number="config.linkDistance"
						type="range"
						min="20"
						max="200"
						step="5"
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
.project-boxes {
	position: relative;
	height: 100%;
	width: 100%;
	background: var(--color--background--light-2);
	overflow: hidden;
}

.project-boxes__state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.project-boxes__svg {
	width: 100%;
	height: 100%;
	cursor: grab;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}
}

.project-boxes__box {
	fill-opacity: 0.06;
	stroke-opacity: 0.55;
	stroke-width: 1.5;
	pointer-events: none;
}

.project-boxes__box-label {
	fill: var(--color--text);
	font-size: 11px;
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	pointer-events: none;
}

.project-boxes__edge {
	stroke: var(--color--foreground--shade-1);
	stroke-width: 1.1;
	opacity: 0.6;

	&--tool {
		stroke: var(--color--secondary);
		stroke-dasharray: 5 4;
	}

	&--credential {
		stroke: var(--color--warning);
		stroke-dasharray: 2 4;
	}

	&--cross {
		opacity: 0.18;
	}

	&--highlighted {
		stroke-width: 2.2;
		opacity: 1;
	}

	&--dimmed {
		opacity: 0.08;
	}
}

.project-boxes__dot {
	stroke: var(--color--background--light-3);
	stroke-width: 2;
}

.project-boxes__label {
	fill: var(--color--text);
	font-size: 8px;
	text-anchor: middle;
	user-select: none;
	pointer-events: none;
}

.project-boxes__config {
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

.project-boxes__config-title {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.07em;
	text-transform: uppercase;
	color: var(--color--text);
}

.project-boxes__config-row {
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
