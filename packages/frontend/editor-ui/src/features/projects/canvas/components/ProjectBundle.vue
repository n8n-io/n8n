<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref, shallowRef } from 'vue';
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

/* ============================== radial hierarchy ==============================
 * Holten-style hierarchical edge bundling: the folder tree is laid out radially with
 * workflows (and a credentials arc) as leaves; relationship edges are splines routed
 * through the hierarchy path between their endpoints, straightened by `beta`.
 */

interface BundleLeaf {
	id: string;
	kind: 'workflow' | 'credential';
	name: string;
	tint: string;
	angle: number;
	x: number;
	y: number;
}

interface BundleArc {
	id: string;
	name: string;
	color: string;
	path: string;
	labelX: number;
	labelY: number;
}

interface BundleEdge {
	id: string;
	sourceId: string;
	targetId: string;
	type: 'calls-workflow' | 'uses-as-tool' | 'handles-errors-for' | 'uses-credential';
	/** hierarchy control points, un-straightened */
	points: Array<{ x: number; y: number }>;
}

const RADIUS = 420;
const CREDENTIALS_GROUP = '__credentials__';

const leaves = shallowRef<BundleLeaf[]>([]);
const arcs = shallowRef<BundleArc[]>([]);
const bundleEdges = shallowRef<BundleEdge[]>([]);

const config = reactive({
	/** 1 = fully bundled along the hierarchy, 0 = straight lines */
	beta: 0.85,
});

interface TreeNode {
	id: string;
	children: TreeNode[];
	leafStart: number;
	leafEnd: number;
	depth: number;
}

function buildBundle(model: GraphModel): void {
	// hierarchy: root → top-level folders / root workflows / credentials group
	const folderChildren = new Map<string | null, string[]>();
	for (const folder of model.folders.values()) {
		const list = folderChildren.get(folder.parentFolderId) ?? [];
		list.push(folder.id);
		folderChildren.set(folder.parentFolderId, list);
	}
	const workflowsByFolder = new Map<string | null, string[]>();
	for (const wf of model.workflows.values()) {
		const parent = wf.external ? null : wf.parentFolderId;
		const list = workflowsByFolder.get(parent) ?? [];
		list.push(wf.id);
		workflowsByFolder.set(parent, list);
	}

	const leafList: BundleLeaf[] = [];
	const leafIndexById = new Map<string, number>();
	const nodePosition = new Map<string, { x: number; y: number }>();
	const parentOfNode = new Map<string, string | null>();
	let maxDepth = 1;

	const buildTree = (folderId: string | null, depth: number, viaId: string): TreeNode => {
		maxDepth = Math.max(maxDepth, depth + 1);
		const node: TreeNode = {
			id: viaId,
			children: [],
			leafStart: leafList.length,
			leafEnd: 0,
			depth,
		};
		for (const wfId of workflowsByFolder.get(folderId) ?? []) {
			const wf = model.workflows.get(wfId)!;
			leafIndexById.set(wfId, leafList.length);
			parentOfNode.set(wfId, viaId);
			leafList.push({
				id: wfId,
				kind: 'workflow',
				name: wf.name,
				tint: model.toolTargets.has(wfId)
					? 'var(--color--secondary)'
					: TRIGGER_TINTS[wf.triggerType],
				angle: 0,
				x: 0,
				y: 0,
			});
		}
		for (const childFolderId of folderChildren.get(folderId) ?? []) {
			parentOfNode.set(childFolderId, viaId);
			node.children.push(buildTree(childFolderId, depth + 1, childFolderId));
		}
		node.leafEnd = leafList.length;
		return node;
	};

	const root = buildTree(null, 0, '__root__');
	parentOfNode.set('__root__', null);
	// credentials as their own top-level arc
	if (model.credentials.size > 0) {
		const credNode: TreeNode = {
			id: CREDENTIALS_GROUP,
			children: [],
			leafStart: leafList.length,
			leafEnd: 0,
			depth: 1,
		};
		parentOfNode.set(CREDENTIALS_GROUP, '__root__');
		for (const credential of model.credentials.values()) {
			leafIndexById.set(credential.id, leafList.length);
			parentOfNode.set(credential.id, CREDENTIALS_GROUP);
			leafList.push({
				id: credential.id,
				kind: 'credential',
				name: credential.name,
				tint: CREDENTIAL_TINT,
				angle: 0,
				x: 0,
				y: 0,
			});
		}
		credNode.leafEnd = leafList.length;
		root.children.push(credNode);
		root.leafEnd = leafList.length;
	}

	// leaf angles: evenly spaced around the circle
	const leafCount = Math.max(1, leafList.length);
	leafList.forEach((leaf, i) => {
		leaf.angle = (i / leafCount) * Math.PI * 2 - Math.PI / 2;
		leaf.x = Math.cos(leaf.angle) * RADIUS;
		leaf.y = Math.sin(leaf.angle) * RADIUS;
		nodePosition.set(leaf.id, { x: leaf.x, y: leaf.y });
	});

	// internal nodes sit at radius proportional to depth, at their leaf-range mid-angle
	const arcList: BundleArc[] = [];
	const placeInternal = (node: TreeNode): void => {
		const startAngle = ((node.leafStart + 0.15) / leafCount) * Math.PI * 2 - Math.PI / 2;
		const endAngle = ((node.leafEnd - 0.15) / leafCount) * Math.PI * 2 - Math.PI / 2;
		const midAngle = (startAngle + endAngle) / 2;
		const radius = (node.depth / maxDepth) * RADIUS * 0.86;
		nodePosition.set(node.id, {
			x: node.id === '__root__' ? 0 : Math.cos(midAngle) * radius,
			y: node.id === '__root__' ? 0 : Math.sin(midAngle) * radius,
		});
		if (node.id !== '__root__' && node.leafEnd > node.leafStart) {
			const arcRadius = RADIUS + 26;
			const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
			const x0 = Math.cos(startAngle) * arcRadius;
			const y0 = Math.sin(startAngle) * arcRadius;
			const x1 = Math.cos(endAngle) * arcRadius;
			const y1 = Math.sin(endAngle) * arcRadius;
			arcList.push({
				id: node.id,
				name:
					node.id === CREDENTIALS_GROUP
						? i18n.baseText('projectCanvas.atlas.config.credentials')
						: (model.folders.get(node.id)?.name ?? node.id),
				color: node.id === CREDENTIALS_GROUP ? 'var(--color--warning)' : folderColor(node.id),
				path: `M ${x0} ${y0} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x1} ${y1}`,
				labelX: Math.cos(midAngle) * (arcRadius + 18),
				labelY: Math.sin(midAngle) * (arcRadius + 18),
			});
		}
		for (const child of node.children) placeInternal(child);
	};
	placeInternal(root);
	arcs.value = arcList;

	// edge control points: hierarchy path from source up to the LCA and down to target
	const chainOf = (id: string): string[] => {
		const chain: string[] = [id];
		let current = parentOfNode.get(id) ?? null;
		let guard = 0;
		while (current && guard++ < 50) {
			chain.push(current);
			current = parentOfNode.get(current) ?? null;
		}
		return chain;
	};
	const pathBetween = (sourceId: string, targetId: string): Array<{ x: number; y: number }> => {
		const chainA = chainOf(sourceId);
		const chainB = chainOf(targetId);
		const inB = new Set(chainB);
		const up: string[] = [];
		let lca = '__root__';
		for (const id of chainA) {
			if (inB.has(id)) {
				lca = id;
				break;
			}
			up.push(id);
		}
		const down: string[] = [];
		for (const id of chainB) {
			if (id === lca) break;
			down.push(id);
		}
		const ids = [...up, lca, ...down.reverse()];
		return ids.map((id) => nodePosition.get(id)).filter((p): p is { x: number; y: number } => !!p);
	};

	const edgeList: BundleEdge[] = [];
	const pushEdge = (sourceId: string, targetId: string, type: BundleEdge['type']): void => {
		if (!leafIndexById.has(sourceId) || !leafIndexById.has(targetId)) return;
		if (sourceId === targetId) return;
		edgeList.push({
			id: `${sourceId}→${targetId}:${type}`,
			sourceId,
			targetId,
			type,
			points: pathBetween(sourceId, targetId),
		});
	};
	for (const relation of model.relations) pushEdge(relation.source, relation.target, relation.type);
	for (const link of model.credentialLinks) {
		pushEdge(link.workflowId, link.credentialId, 'uses-credential');
	}
	bundleEdges.value = edgeList;
	leaves.value = leafList;
}

/* ============================== edge paths (beta straightening) ============================== */

function bundledPath(edge: BundleEdge, beta: number): string {
	const raw = edge.points;
	if (raw.length < 2) return '';
	const first = raw[0];
	const last = raw[raw.length - 1];
	// Holten's straightening: interpolate control points towards the straight line
	const points = raw.map((p, i) => {
		const t = i / (raw.length - 1);
		return {
			x: beta * p.x + (1 - beta) * (first.x + t * (last.x - first.x)),
			y: beta * p.y + (1 - beta) * (first.y + t * (last.y - first.y)),
		};
	});
	if (points.length === 2) {
		return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
	}
	// Catmull-Rom through the control points, converted to cubic beziers
	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];
		const c1x = p1.x + (p2.x - p0.x) / 6;
		const c1y = p1.y + (p2.y - p0.y) / 6;
		const c2x = p2.x - (p3.x - p1.x) / 6;
		const c2y = p2.y - (p3.y - p1.y) / 6;
		d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
	}
	return d;
}

const renderedEdges = computed(() =>
	bundleEdges.value.map((edge) => ({
		...edge,
		path: bundledPath(edge, config.beta),
	})),
);

/* ============================== interaction ============================== */

const svgEl = ref<SVGSVGElement>();
const { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, centerOn } =
	usePanZoom(svgEl);

const hoveredId = ref<string | null>(null);

function isEdgeConnected(edge: BundleEdge): boolean {
	return (
		hoveredId.value !== null &&
		(edge.sourceId === hoveredId.value || edge.targetId === hoveredId.value)
	);
}

function labelTransform(leaf: BundleLeaf): string {
	const degrees = (leaf.angle * 180) / Math.PI;
	const flip = leaf.angle > Math.PI / 2 || leaf.angle < -Math.PI / 2;
	return `translate(${leaf.x}, ${leaf.y}) rotate(${flip ? degrees + 180 : degrees})`;
}

function labelAnchor(leaf: BundleLeaf): string {
	const flip = leaf.angle > Math.PI / 2 || leaf.angle < -Math.PI / 2;
	return flip ? 'end' : 'start';
}

onMounted(async () => {
	const model = await load();
	buildBundle(model);
	await nextTick();
	centerOn(svgEl.value);
});
</script>

<template>
	<div class="project-bundle" data-testid="project-bundle">
		<div v-if="isLoading" class="project-bundle__state">
			{{ i18n.baseText('projectCanvas.atlas.loading') }}
		</div>
		<div v-else-if="leaves.length === 0" class="project-bundle__state">
			{{ i18n.baseText('projectCanvas.atlas.empty') }}
		</div>
		<template v-else>
			<svg
				ref="svgEl"
				class="project-bundle__svg"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerUp"
				@pointerleave="onPointerUp"
				@wheel="onWheel"
			>
				<g :transform="transform">
					<g v-for="arc in arcs" :key="arc.id">
						<path class="project-bundle__arc" :d="arc.path" :style="{ stroke: arc.color }" />
						<text
							class="project-bundle__arc-label"
							:x="arc.labelX"
							:y="arc.labelY"
							:style="{ fill: arc.color }"
						>
							{{ arc.name }}
						</text>
					</g>
					<path
						v-for="edge in renderedEdges"
						:key="edge.id"
						:d="edge.path"
						class="project-bundle__edge"
						:class="{
							'project-bundle__edge--tool': edge.type === 'uses-as-tool',
							'project-bundle__edge--credential': edge.type === 'uses-credential',
							'project-bundle__edge--highlighted': isEdgeConnected(edge),
							'project-bundle__edge--dimmed': hoveredId !== null && !isEdgeConnected(edge),
						}"
					/>
					<g
						v-for="leaf in leaves"
						:key="leaf.id"
						class="project-bundle__leaf"
						@pointerenter="hoveredId = leaf.id"
						@pointerleave="hoveredId = null"
					>
						<circle
							:cx="leaf.x"
							:cy="leaf.y"
							r="5"
							:style="{ fill: leaf.tint }"
							class="project-bundle__dot"
						/>
						<text
							class="project-bundle__label"
							:class="{ 'project-bundle__label--hovered': hoveredId === leaf.id }"
							:transform="labelTransform(leaf)"
							:text-anchor="labelAnchor(leaf)"
							:x="labelAnchor(leaf) === 'start' ? 10 : -10"
							y="3"
						>
							{{ leaf.name }}
						</text>
					</g>
				</g>
			</svg>

			<div class="project-bundle__config">
				<div class="project-bundle__config-title">
					{{ i18n.baseText('projectCanvas.atlas.config.title') }}
				</div>
				<label class="project-bundle__config-row">
					<span>{{ i18n.baseText('projectCanvas.atlas.config.bundling') }}</span>
					<input v-model.number="config.beta" type="range" min="0" max="1" step="0.05" />
				</label>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
.project-bundle {
	position: relative;
	height: 100%;
	width: 100%;
	background: var(--color--background--light-2);
	overflow: hidden;
}

.project-bundle__state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.project-bundle__svg {
	width: 100%;
	height: 100%;
	cursor: grab;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}
}

.project-bundle__arc {
	fill: none;
	stroke-width: 5;
	stroke-opacity: 0.35;
	stroke-linecap: round;
}

.project-bundle__arc-label {
	font-size: 10px;
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	text-anchor: middle;
	pointer-events: none;
}

.project-bundle__edge {
	fill: none;
	stroke: var(--color--foreground--shade-1);
	stroke-width: 1;
	opacity: 0.35;

	&--tool {
		stroke: var(--color--secondary);
	}

	&--credential {
		stroke: var(--color--warning);
		opacity: 0.25;
	}

	&--highlighted {
		stroke-width: 2;
		opacity: 1;
	}

	&--dimmed {
		opacity: 0.05;
	}
}

.project-bundle__dot {
	stroke: var(--color--background--light-3);
	stroke-width: 1.5;
}

.project-bundle__label {
	fill: var(--color--text);
	font-size: 9px;
	user-select: none;

	&--hovered {
		fill: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
	}
}

.project-bundle__config {
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

.project-bundle__config-title {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.07em;
	text-transform: uppercase;
	color: var(--color--text);
}

.project-bundle__config-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text);

	span {
		width: 80px;
		flex: none;
	}

	input[type='range'] {
		flex: 1;
		min-width: 0;
	}
}
</style>
