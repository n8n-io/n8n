<script lang="ts" setup>
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import type { Edge, Node } from '@vue-flow/core';
import { MarkerType, useVueFlow, VueFlow } from '@vue-flow/core';
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';

import { DEBOUNCE_TIME, getDebounceTime, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { N8nButton, N8nIcon, N8nRadioButtons } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useFolders } from '@/features/core/folders/composables/useFolders';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import type { WorkflowListEventMap } from '@/features/core/folders/folders.types';
import { useUIStore } from '@/app/stores/ui.store';
import { createEventBus } from '@n8n/utils/event-bus';

import ProjectAtlas from './components/ProjectAtlas.vue';
import ProjectCanvasContainer from './components/ProjectCanvasContainer.vue';
import type { ProjectCanvasMenuItem } from './components/ProjectCanvasContextMenu.vue';
import ProjectCanvasContextMenu from './components/ProjectCanvasContextMenu.vue';
import ProjectCanvasEdge from './components/ProjectCanvasEdge.vue';
import ProjectCanvasNode from './components/ProjectCanvasNode.vue';
import type {
	CanvasPressKind,
	ProjectCanvasContext,
	ProjectContainerData,
	ProjectEdgeData,
	ProjectNodeData,
} from './canvas-types';
import { ProjectCanvasContextKey } from './canvas-types';
import type { DropCandidate, Rect, XY } from './canvas-geometry';
import {
	C_GAPY,
	C_HEAD,
	C_PAD,
	childSlots,
	containerRectForSlots,
	forceLayout,
	NODE,
	rectsOverlap,
	resolveDropOutcome,
	resolveDropTarget,
	resolveLevel,
	separationVector,
} from './canvas-geometry';
import type { GraphModel, WorkflowRelationType } from './graph-model';
import {
	buildGraphModel,
	childEntities,
	endpointOf,
	folderDepth,
	isEntityVisible,
	parentOf,
	resolveVisibleEdges,
	WORKFLOW_RELATION_TYPES,
} from './graph-model';
import type { FolderChildOffsets } from './position-storage';
import { loadCanvasState, saveCanvasState } from './position-storage';
import { useCanvasTweens } from './composables/useCanvasTweens';
import { useProjectDependencyGraph } from './composables/useProjectDependencyGraph';

type FlowNode = Node<ProjectNodeData | ProjectContainerData>;
type FlowEdge = Edge<ProjectEdgeData>;

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const message = useMessage();
const toast = useToast();
const projectsStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();
const workflowsListStore = useWorkflowsListStore();
const foldersStore = useFoldersStore();
const folderHelpers = useFolders();
const uiStore = useUIStore();
const { project, viewportRef } = useVueFlow();

const projectId = route.params.projectId as string;

const {
	isLoading,
	expandedFolders,
	fetchRootGraph,
	fetchFolderGraph,
	markFolderExpanded,
	markFolderCollapsed,
	getAllGraphs,
	clearProjectCache,
	appendFolderNode,
	renameNodeInCache,
	removeNodeFromCache,
} = useProjectDependencyGraph(projectId);

/* ============================== state ============================== */

const model = shallowRef<GraphModel>({
	workflows: new Map(),
	folders: new Map(),
	relations: [],
	toolTargets: new Set(),
});

/** World positions (top-left) of every unit; folder position = collapsed node anchor. */
const pos = new Map<string, XY>();

const flowNodes = ref<FlowNode[]>([]);
const flowEdges = ref<FlowEdge[]>([]);

const visibleTypes = ref<Set<WorkflowRelationType>>(new Set(['calls-workflow', 'uses-as-tool']));

const hoveredNodeId = ref<string | null>(null);
const dropHotId = ref<string | null>(null);
const liftedId = ref<string | null>(null);
const contentLeftX = ref(0);
const contentBottomY = ref(0);

/**
 * Local placement overrides for workflows moved via drag-to-file, re-applied after every
 * model rebuild so stale cached graphs don't reassert the old folder membership.
 */
const moveOverrides = new Map<string, { parentFolderId: string | null; folderPath: string[] }>();
const countAdjustments = new Map<string, number>();

const tweens = useCanvasTweens({
	getPos: (id) => pos.get(id),
	setPos: (id, p) => pos.set(id, p),
	onFrame: applyPositions,
});

/* ---- canvas state persistence (per project, local storage) ---- */

/**
 * Remembered child arrangements per folder, relative to the folder's position. Captured
 * on collapse, applied on the next expand so manual layouts inside a folder survive
 * expand/collapse round trips — and persisted along with positions.
 */
const folderChildOffsets = new Map<string, FolderChildOffsets>();

/** Remember where a folder's children sit relative to a reference point (its card). */
function captureChildOffsets(folderId: string, reference: XY): void {
	const offsets: FolderChildOffsets = {};
	for (const child of childEntities(model.value, folderId)) {
		const p = targetPos(child.id);
		if (p) offsets[child.id] = { x: p.x - reference.x, y: p.y - reference.y };
	}
	folderChildOffsets.set(folderId, offsets);
}

/**
 * Give a child filed into a collapsed folder a spot beneath that folder's remembered
 * arrangement, so the next expand doesn't overlap it with existing children.
 */
function rememberChildOffset(folderId: string, childId: string): void {
	const offsets = folderChildOffsets.get(folderId);
	// no remembered arrangement — the next expand grids all children anyway
	if (!offsets) return;
	let bottom = -Infinity;
	let left = Infinity;
	for (const offset of Object.values(offsets)) {
		bottom = Math.max(bottom, offset.y);
		left = Math.min(left, offset.x);
	}
	offsets[childId] = {
		x: isFinite(left) ? left : C_PAD,
		y: isFinite(bottom) ? bottom + NODE.h + C_GAPY : NODE.h + C_GAPY,
	};
}

function persistPositions(): void {
	const knownIds = new Set([...model.value.workflows.keys(), ...model.value.folders.keys()]);
	// nothing loaded (yet) — don't wipe a previously stored arrangement
	if (knownIds.size === 0) return;
	saveCanvasState(
		projectId,
		{ positions: pos, expanded: [...expandedSet()], childOffsets: folderChildOffsets },
		knownIds,
	);
}

const schedulePositionsSave = useDebounceFn(
	persistPositions,
	getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE),
);

const relationshipTypeOptions: Array<{ label: string; value: WorkflowRelationType }> = [
	{ label: i18n.baseText('projectCanvas.filter.callsWorkflow'), value: 'calls-workflow' },
	{ label: i18n.baseText('projectCanvas.filter.usesAsTool'), value: 'uses-as-tool' },
	{ label: i18n.baseText('projectCanvas.filter.handlesErrors'), value: 'handles-errors-for' },
];

type CanvasTab = 'canvas' | 'atlas';
const activeTab = ref<CanvasTab>('canvas');
const tabOptions = [
	{ label: i18n.baseText('projectCanvas.tabs.canvas'), value: 'canvas' },
	{ label: i18n.baseText('projectCanvas.tabs.atlas'), value: 'atlas' },
];

const initialising = ref(true);
const projectName = computed(() => projectsStore.currentProject?.name ?? '');
const hasNodes = computed(() => flowNodes.value.length > 0);
const showLoading = computed(() => initialising.value || isLoading.value);

/* ============================== model ============================== */

function rebuildModel(): void {
	const rebuilt = buildGraphModel(getAllGraphs());
	for (const [workflowId, override] of moveOverrides) {
		const workflow = rebuilt.workflows.get(workflowId);
		if (!workflow) continue;
		workflow.parentFolderId = override.parentFolderId;
		workflow.folderPath = override.folderPath;
		workflow.external = false;
	}
	for (const [folderId, delta] of countAdjustments) {
		const folder = rebuilt.folders.get(folderId);
		if (folder) folder.workflowCount += delta;
	}
	model.value = rebuilt;
}

function expandedSet(): ReadonlySet<string> {
	return expandedFolders.value;
}

/* ============================== rects ============================== */

type GetPos = (id: string) => XY | undefined;

const livePos: GetPos = (id) => pos.get(id);
const targetPos: GetPos = (id) => tweens.targetPos(id);

function rectWith(id: string, getPos: GetPos, excludeId: string | null = null): Rect {
	if (model.value.folders.has(id) && expandedSet().has(id)) {
		return containerRectWith(id, getPos, excludeId);
	}
	const p = getPos(id) ?? { x: 0, y: 0 };
	return { x: p.x, y: p.y, w: NODE.w, h: NODE.h };
}

function containerRectWith(
	folderId: string,
	getPos: GetPos,
	excludeId: string | null = null,
): Rect {
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (const child of childEntities(model.value, folderId)) {
		if (child.id === excludeId) continue;
		const r = rectWith(child.id, getPos, excludeId);
		x0 = Math.min(x0, r.x);
		y0 = Math.min(y0, r.y);
		x1 = Math.max(x1, r.x + r.w);
		y1 = Math.max(y1, r.y + r.h);
	}
	if (x0 === Infinity) {
		const p = getPos(folderId) ?? { x: 0, y: 0 };
		return { x: p.x, y: p.y, w: NODE.w, h: NODE.h };
	}
	return {
		x: x0 - C_PAD,
		y: y0 - C_HEAD,
		w: x1 - x0 + C_PAD * 2,
		h: y1 - y0 + C_HEAD + C_PAD,
	};
}

// Rendered rects include a lifted (dragged) workflow, so its container resizes with it
// live. Drop-target rects exclude it — otherwise the stretched container would follow
// the cursor and always win the deepest-container check, breaking filing and move-to-root.
const rectOf = (id: string) => rectWith(id, livePos);
const rectOfT = (id: string) => rectWith(id, targetPos);
const containerRect = (folderId: string) => containerRectWith(folderId, livePos);
const dropRectOf = (id: string) => rectWith(id, livePos, liftedId.value);

/* ============================== structure render ============================== */

function edgeMarker(type: WorkflowRelationType) {
	return {
		type: MarkerType.Arrow,
		color:
			type === 'uses-as-tool' ? 'var(--color--secondary)' : 'var(--color--foreground--shade-1)',
		width: 16,
		height: 16,
		strokeWidth: 1.5,
	};
}

/** Rebuild the flow node/edge lists from the model + expansion state. Positions reused. */
function renderStructure(): void {
	const m = model.value;
	const expanded = expandedSet();
	const edges = resolveVisibleEdges(m, expanded, visibleTypes.value);
	const edgeEndpoints = new Set<string>();
	for (const edge of edges) {
		edgeEndpoints.add(edge.source);
		edgeEndpoints.add(edge.target);
	}

	const nodes: FlowNode[] = [];

	// expanded folder containers (parents first so children sit on top)
	const expandedVisible = [...m.folders.values()]
		.filter((f) => expanded.has(f.id) && isEntityVisible(m, expanded, f.id))
		.sort((a, b) => folderDepth(m, a.id) - folderDepth(m, b.id));
	for (const folder of expandedVisible) {
		const rect = containerRect(folder.id);
		nodes.push({
			id: `container:${folder.id}`,
			type: 'projectContainer',
			position: { x: rect.x, y: rect.y },
			draggable: false,
			selectable: false,
			focusable: false,
			zIndex: folderDepth(m, folder.id),
			data: {
				folderId: folder.id,
				name: folder.name,
				workflowCount: folder.workflowCount,
				width: rect.w,
				height: rect.h,
			},
		});
	}

	// collapsed folder nodes
	for (const folder of m.folders.values()) {
		if (expanded.has(folder.id) || !isEntityVisible(m, expanded, folder.id)) continue;
		nodes.push({
			id: folder.id,
			type: 'projectNode',
			position: pos.get(folder.id) ?? { x: 0, y: 0 },
			draggable: false,
			selectable: false,
			focusable: false,
			zIndex: 100,
			data: {
				kind: 'folder',
				name: folder.name,
				workflowCount: folder.workflowCount,
			},
		});
	}

	// workflow nodes
	for (const workflow of m.workflows.values()) {
		if (workflow.external && !edgeEndpoints.has(workflow.id)) continue;
		if (!isEntityVisible(m, expanded, workflow.id)) continue;
		nodes.push({
			id: workflow.id,
			type: 'projectNode',
			position: pos.get(workflow.id) ?? { x: 0, y: 0 },
			draggable: false,
			selectable: false,
			focusable: false,
			zIndex: 100,
			data: {
				kind: 'workflow',
				name: workflow.name,
				active: workflow.active,
				triggerType: workflow.triggerType,
				isToolTarget: m.toolTargets.has(workflow.id),
				external: workflow.external,
			},
		});
	}

	flowEdges.value = edges.map((edge) => {
		const isTool = edge.type === 'uses-as-tool';
		return {
			id: edge.id,
			source: edge.source,
			target: edge.target,
			sourceHandle: isTool ? 'source-bottom' : 'source-right',
			targetHandle: isTool ? 'target-top' : 'target-left',
			type: 'projectEdge',
			markerEnd: edgeMarker(edge.type),
			data: { relationshipType: edge.type },
		};
	});
	flowNodes.value = nodes;
	applyPositions();
}

/** Sync the position map into the flow nodes; container rects derive from child rects. */
function applyPositions(): void {
	let minX = Infinity;
	let maxBottom = -Infinity;
	for (const node of flowNodes.value) {
		let height = NODE.h;
		if (node.type === 'projectContainer') {
			const data = node.data as ProjectContainerData;
			const rect = containerRect(data.folderId);
			node.position = { x: rect.x, y: rect.y };
			data.width = rect.w;
			data.height = rect.h;
			height = rect.h;
		} else {
			const p = pos.get(node.id);
			if (p) node.position = { x: p.x, y: p.y };
			node.zIndex = node.id === liftedId.value ? 1000 : 100;
		}
		minX = Math.min(minX, node.position.x);
		maxBottom = Math.max(maxBottom, node.position.y + height);
	}
	if (isFinite(minX)) contentLeftX.value = minX;
	if (isFinite(maxBottom)) contentBottomY.value = maxBottom;
	void schedulePositionsSave();
}

/* ============================== initial layout ============================== */

function ensureRootUnitPositions(): void {
	const m = model.value;
	const rootUnits = childEntities(m, null).map((c) => c.id);
	const missing = rootUnits.filter((id) => !pos.has(id));
	if (missing.length === 0) return;

	// place newly discovered root-level units (e.g. external workflows referenced by a
	// just-expanded folder) in a grid below everything currently placed
	let bottom = 60;
	let left = 60;
	for (const id of rootUnits) {
		if (!pos.has(id)) continue;
		const r = rectOfT(id);
		bottom = Math.max(bottom, r.y + r.h);
		left = Math.min(left, r.x);
	}
	missing.forEach((id, i) => {
		pos.set(id, {
			x: left + (i % 5) * (NODE.w + 60),
			y: bottom + 120 + Math.floor(i / 5) * (NODE.h + 48),
		});
	});
}

async function initialise(): Promise<void> {
	// in-memory expansion state may linger from a previous visit — reset, then restore
	// from the persisted canvas state
	for (const folderId of [...expandedFolders.value]) markFolderCollapsed(folderId);
	// refetch on every visit so workflows created since the last render show up
	clearProjectCache();
	await fetchRootGraph();
	rebuildModel();

	const stored = loadCanvasState(projectId);
	if (stored && stored.positions.size > 0) {
		for (const [id, p] of stored.positions) pos.set(id, p);
		for (const [folderId, offsets] of stored.childOffsets) {
			folderChildOffsets.set(folderId, offsets);
		}

		// restore expanded folders: fetch their graphs so their children are known
		for (const folderId of stored.expanded) {
			await fetchFolderGraph(folderId);
		}
		rebuildModel();
		const restorable = stored.expanded.filter((id) => model.value.folders.has(id));
		restorable.sort((a, b) => folderDepth(model.value, a) - folderDepth(model.value, b));
		for (const folderId of restorable) {
			markFolderExpanded(folderId);
		}
		// children usually restore from their stored absolute positions; give anything
		// new (or missing) a spot from the remembered offsets or a grid slot
		for (const folderId of restorable) {
			const anchor = pos.get(folderId);
			if (!anchor) continue;
			const children = childEntities(model.value, folderId).map((c) => c.id);
			const remembered = folderChildOffsets.get(folderId);
			const slots = childSlots(anchor, children);
			children.forEach((id, i) => {
				if (pos.has(id)) return;
				const offset = remembered?.[id];
				pos.set(id, offset ? { x: anchor.x + offset.x, y: anchor.y + offset.y } : slots[i]);
			});
		}
		// units created since the last visit get placed below the stored arrangement
		ensureRootUnitPositions();
	} else {
		const m = model.value;
		const rootUnits = childEntities(m, null).map((c) => c.id);
		// lay out with the full folder-aggregated edge set so filter toggles never re-layout
		const layoutEdges = resolveVisibleEdges(m, expandedSet(), new Set(WORKFLOW_RELATION_TYPES));
		const positions = forceLayout(rootUnits, layoutEdges);
		for (const [id, p] of positions) pos.set(id, p);
	}

	// the one and only automatic viewport fit happens via fit-view-on-init
	renderStructure();
}

/* ============================== expand / collapse ============================== */

function isDescendantOfFolder(folderId: string, ancestorId: string): boolean {
	let current = model.value.folders.get(folderId)?.parentFolderId ?? null;
	let guard = 0;
	while (current && guard++ <= 100) {
		if (current === ancestorId) return true;
		current = model.value.folders.get(current)?.parentFolderId ?? null;
	}
	return false;
}

async function expandFolder(folderId: string): Promise<void> {
	await fetchFolderGraph(folderId);
	rebuildModel();
	ensureRootUnitPositions();

	const anchor = pos.get(folderId);
	if (!anchor) return;
	const children = childEntities(model.value, folderId).map((c) => c.id);
	// restore the remembered arrangement where one exists; new children get grid slots
	const remembered = folderChildOffsets.get(folderId);
	const slots = childSlots(anchor, children);
	const targets = children.map((id, i) => {
		const offset = remembered?.[id];
		return offset ? { id, x: anchor.x + offset.x, y: anchor.y + offset.y } : slots[i];
	});
	// children animate outward from the folder's position
	for (const target of targets) pos.set(target.id, { ...anchor });
	markFolderExpanded(folderId);
	renderStructure();
	for (const target of targets) tweens.tweenPos(target.id, { x: target.x, y: target.y });

	const finalRect = containerRectForSlots(anchor, targets);
	resolveAround(folderId, finalRect);
}

function collapseFolder(folderId: string): void {
	// auto-collapse expanded descendants first, remembering their child arrangements
	// (relative to their anchor, which auto-collapse leaves untouched)
	for (const folder of model.value.folders.values()) {
		if (
			folder.id !== folderId &&
			expandedSet().has(folder.id) &&
			isDescendantOfFolder(folder.id, folderId)
		) {
			const anchor = pos.get(folder.id);
			if (anchor) captureChildOffsets(folder.id, anchor);
			markFolderCollapsed(folder.id);
		}
	}
	renderStructure();

	const kids = childEntities(model.value, folderId);
	const rect = containerRect(folderId);
	// the collapsed folder node lands at the container's origin, vertically centered
	const cardPos = { x: rect.x, y: rect.y + (rect.h - NODE.h) / 2 };
	// remember the arrangement relative to the card, so the next expand restores it
	captureChildOffsets(folderId, cardPos);
	pos.set(folderId, cardPos);

	if (kids.length === 0) {
		markFolderCollapsed(folderId);
		renderStructure();
		return;
	}
	let pending = kids.length;
	const finish = () => {
		if (--pending > 0) return;
		markFolderCollapsed(folderId);
		renderStructure();
	};
	const target = pos.get(folderId)!;
	for (const kid of kids) tweens.tweenPos(kid.id, { ...target }, finish);
}

async function toggleFolder(folderId: string): Promise<void> {
	if (expandedSet().has(folderId)) {
		collapseFolder(folderId);
	} else {
		await expandFolder(folderId);
	}
}

/* ---- overlap resolution: push siblings clear at every ancestor level ---- */

/** Move an entity and (for expanded folders) everything inside it as one unit. */
function moveUnit(id: string, dx: number, dy: number): void {
	if (model.value.folders.has(id) && expandedSet().has(id)) {
		const p = pos.get(id);
		if (p) pos.set(id, { x: p.x + dx, y: p.y + dy });
		for (const child of childEntities(model.value, id)) moveUnit(child.id, dx, dy);
	} else {
		const p = targetPos(id) ?? pos.get(id);
		if (p) tweens.tweenPos(id, { x: p.x + dx, y: p.y + dy });
	}
}

function resolveAround(folderId: string, finalRect: Rect): void {
	let current = folderId;
	let rect = finalRect;
	let guard = 0;
	// resolve at each ancestor level: siblings inside the parent container first,
	// then the grown parent container against root-level units
	while (guard++ <= 100) {
		const parent = model.value.folders.get(current)?.parentFolderId ?? null;
		const movable = childEntities(model.value, parent)
			.filter((c) => c.id !== current)
			.map((c) => ({ id: c.id, rect: rectOfT(c.id) }));
		for (const displacement of resolveLevel(rect, movable)) {
			moveUnit(displacement.id, displacement.dx, displacement.dy);
		}
		if (parent === null) break;
		current = parent;
		rect = rectOfT(current);
	}
}

/* ============================== drag = filing only ============================== */

interface Press {
	id: string;
	kind: CanvasPressKind;
	startClient: XY;
	grabOffset: XY;
	origPos: XY;
	moved: boolean;
	lifted: boolean;
	raw: string | null;
	target: string | null;
}

let press: Press | null = null;

/** Move an entity (and an expanded folder's contents) without tweening — used for live drags. */
function shiftUnitInstant(id: string, dx: number, dy: number): void {
	const p = pos.get(id);
	if (p) pos.set(id, { x: p.x + dx, y: p.y + dy });
	if (model.value.folders.has(id) && expandedSet().has(id)) {
		for (const child of childEntities(model.value, id)) shiftUnitInstant(child.id, dx, dy);
	}
}

/** Cancel in-flight tweens for an entity and (for expanded folders) everything inside. */
function cancelSubtreeTweens(id: string): void {
	tweens.cancelTween(id);
	if (model.value.folders.has(id) && expandedSet().has(id)) {
		for (const child of childEntities(model.value, id)) cancelSubtreeTweens(child.id);
	}
}

function screenToWorld(clientX: number, clientY: number): XY {
	const bounds = viewportRef.value?.getBoundingClientRect();
	if (!bounds) return { x: clientX, y: clientY };
	return project({ x: clientX - bounds.left, y: clientY - bounds.top });
}

/** Folder under the point: collapsed folder cards win, then the deepest expanded container. */
function dropTargetAt(worldX: number, worldY: number): string | null {
	const m = model.value;
	const expanded = expandedSet();
	const candidates: DropCandidate[] = [...m.folders.values()].map((folder) => ({
		id: folder.id,
		expanded: expanded.has(folder.id),
		visible: isEntityVisible(m, expanded, folder.id),
		depth: folderDepth(m, folder.id),
		rect: dropRectOf(folder.id),
	}));
	return resolveDropTarget({ x: worldX, y: worldY }, candidates);
}

function onCardPointerDown(id: string, kind: CanvasPressKind, event: PointerEvent): void {
	const origPos = pos.get(id);
	if (!origPos) return;
	const world = screenToWorld(event.clientX, event.clientY);
	press = {
		id,
		kind,
		startClient: { x: event.clientX, y: event.clientY },
		grabOffset: { x: world.x - origPos.x, y: world.y - origPos.y },
		origPos: { ...origPos },
		moved: false,
		lifted: false,
		raw: null,
		target: null,
	};
	window.addEventListener('pointermove', onWindowPointerMove);
	window.addEventListener('pointerup', onWindowPointerUp);
	window.addEventListener('pointercancel', onWindowPointerCancel);
}

function onWindowPointerMove(event: PointerEvent): void {
	if (!press) return;
	if ((event.buttons & 1) === 0) {
		onWindowPointerCancel();
		return;
	}
	const dx = event.clientX - press.startClient.x;
	const dy = event.clientY - press.startClient.y;
	if (Math.hypot(dx, dy) > 4) press.moved = true;
	if (!press.moved) return;

	const world = screenToWorld(event.clientX, event.clientY);
	const dragTo = { x: world.x - press.grabOffset.x, y: world.y - press.grabOffset.y };

	if (press.kind === 'workflow') {
		if (!press.lifted) {
			press.lifted = true;
			liftedId.value = press.id;
			tweens.cancelTween(press.id);
		}
		pos.set(press.id, dragTo);
		press.raw = dropTargetAt(world.x, world.y);
		const currentFolder = parentOf(model.value, press.id);
		press.target = press.raw === currentFolder ? null : press.raw;
		dropHotId.value = press.target;
	} else {
		// folder card or expanded container: reposition the whole unit live (no filing)
		if (!press.lifted) {
			press.lifted = true;
			cancelSubtreeTweens(press.id);
		}
		const current = pos.get(press.id);
		if (current) shiftUnitInstant(press.id, dragTo.x - current.x, dragTo.y - current.y);
	}
	applyPositions();
}

function detachWindowListeners(): void {
	window.removeEventListener('pointermove', onWindowPointerMove);
	window.removeEventListener('pointerup', onWindowPointerUp);
	window.removeEventListener('pointercancel', onWindowPointerCancel);
}

function onWindowPointerUp(): void {
	if (!press) return;
	detachWindowListeners();
	const current = press;
	press = null;

	if (current.kind === 'folder') {
		// click toggles; a drag already repositioned the folder live
		if (!current.moved) void toggleFolder(current.id);
		return;
	}
	if (current.kind === 'container') {
		// click on the header collapses; a drag already moved the container live
		if (!current.moved) collapseFolder(current.id);
		return;
	}
	if (!current.lifted) {
		if (!current.moved) {
			void router.push({ name: VIEWS.WORKFLOW, params: { workflowId: current.id } });
		}
		return;
	}

	liftedId.value = null;
	dropHotId.value = null;
	const outcome = resolveDropOutcome({ target: current.target });
	if (outcome.kind === 'file') {
		void moveWorkflowToFolder(current.id, outcome.folderId, current.origPos);
	} else {
		// manual reposition — the card stays where it was dropped and keeps its folder
		applyPositions();
	}
}

function onWindowPointerCancel(): void {
	if (!press) return;
	detachWindowListeners();
	if (press.lifted) {
		if (press.kind === 'workflow') {
			pos.set(press.id, { ...press.origPos });
			liftedId.value = null;
			dropHotId.value = null;
		} else {
			const current = pos.get(press.id);
			if (current) {
				shiftUnitInstant(press.id, press.origPos.x - current.x, press.origPos.y - current.y);
			}
		}
		applyPositions();
	}
	press = null;
}

/* ============================== moving workflows between folders ============================== */

function folderChain(folderId: string | null): string[] {
	const chain: string[] = [];
	let current = folderId;
	let guard = 0;
	while (current && guard++ <= 100) {
		chain.unshift(current);
		current = model.value.folders.get(current)?.parentFolderId ?? null;
	}
	return chain;
}

function adjustWorkflowCounts(chain: string[], delta: number): void {
	for (const folderId of chain) {
		countAdjustments.set(folderId, (countAdjustments.get(folderId) ?? 0) + delta);
		const folder = model.value.folders.get(folderId);
		if (folder) folder.workflowCount += delta;
	}
}

/** Re-pack an expanded folder's children into the grid, keeping its top-left corner put. */
function relayoutFolder(folderId: string | null): void {
	if (!folderId || !expandedSet().has(folderId)) return;
	const children = childEntities(model.value, folderId).map((c) => c.id);
	if (children.length === 0) return;
	const rect = containerRectWith(folderId, targetPos);
	pos.set(folderId, { x: rect.x, y: rect.y - C_PAD * 0.4 });
	const anchor = pos.get(folderId)!;
	const slots = childSlots(anchor, children);
	for (const slot of slots) tweens.tweenPos(slot.id, { x: slot.x, y: slot.y });
	resolveAround(folderId, containerRectForSlots(anchor, slots));
}

async function moveWorkflowToFolder(
	workflowId: string,
	targetFolderId: string | null,
	origPos: XY,
): Promise<void> {
	const workflow = model.value.workflows.get(workflowId);
	if (!workflow) return;
	const sourceFolderId = parentOf(model.value, workflowId);
	if ((targetFolderId ?? null) === sourceFolderId) return;

	const previousOverride = moveOverrides.get(workflowId);
	const previousState = {
		parentFolderId: workflow.parentFolderId,
		folderPath: workflow.folderPath,
		external: workflow.external,
	};

	// optimistic model update
	const targetPath = targetFolderId ? folderChain(targetFolderId) : [];
	moveOverrides.set(workflowId, { parentFolderId: targetFolderId, folderPath: targetPath });
	workflow.parentFolderId = targetFolderId;
	workflow.folderPath = targetPath;
	workflow.external = false;
	adjustWorkflowCounts(folderChain(sourceFolderId), -1);
	adjustWorkflowCounts(targetPath, 1);

	const finish = () => {
		renderStructure();
		// existing children stay where they are — no re-layout. The card keeps its drop
		// position inside an open container; just push the container's neighbours clear
		// of any growth.
		if (targetFolderId && expandedSet().has(targetFolderId)) {
			resolveAround(targetFolderId, rectOfT(targetFolderId));
		}
		// remember a spot inside a collapsed folder's arrangement for the swallowed card
		if (targetFolderId && !expandedSet().has(targetFolderId)) {
			rememberChildOffset(targetFolderId, workflowId);
		}
		// moved to project root: make sure it doesn't sit on top of its old container
		if (!targetFolderId && sourceFolderId && expandedSet().has(sourceFolderId)) {
			const containerRectNow = containerRect(sourceFolderId);
			const workflowRect = rectOf(workflowId);
			if (rectsOverlap(containerRectNow, workflowRect, 0)) {
				const v = separationVector(containerRectNow, workflowRect);
				const p = pos.get(workflowId);
				if (p) tweens.tweenPos(workflowId, { x: p.x + v.x, y: p.y + v.y });
			}
		}
		// a folder emptied by the move collapses away
		if (
			sourceFolderId &&
			expandedSet().has(sourceFolderId) &&
			childEntities(model.value, sourceFolderId).length === 0
		) {
			markFolderCollapsed(sourceFolderId);
			renderStructure();
		}
	};

	if (targetFolderId && !expandedSet().has(targetFolderId)) {
		// swallow animation: glide into the collapsed folder node, then rebuild
		const rect = rectOf(targetFolderId);
		tweens.tweenPos(
			workflowId,
			{ x: rect.x + (rect.w - NODE.w) / 2, y: rect.y + (rect.h - NODE.h) / 2 },
			finish,
		);
	} else {
		finish();
	}

	try {
		await workflowsStore.updateWorkflow(workflowId, {
			parentFolderId: targetFolderId ?? '0',
		});
	} catch (error) {
		// revert the optimistic update
		if (previousOverride) moveOverrides.set(workflowId, previousOverride);
		else moveOverrides.delete(workflowId);
		workflow.parentFolderId = previousState.parentFolderId;
		workflow.folderPath = previousState.folderPath;
		workflow.external = previousState.external;
		adjustWorkflowCounts(folderChain(sourceFolderId), 1);
		adjustWorkflowCounts(targetPath, -1);
		pos.set(workflowId, { ...origPos });
		renderStructure();
		toast.showError(error, i18n.baseText('folders.move.workflow.error.title'));
	}
}

/* ============================== creating workflows and folders ============================== */

function createWorkflowIn(folderId: string | null): void {
	void router.push({
		name: VIEWS.NEW_WORKFLOW,
		query: {
			projectId,
			parentFolderId: folderId ?? undefined,
		},
	});
}

async function createFolderIn(parentFolderId: string | null): Promise<void> {
	const parentName = parentFolderId
		? (model.value.folders.get(parentFolderId)?.name ?? '')
		: projectName.value;

	const promptResponse = await message.prompt(
		i18n.baseText('folders.add.to.parent.message', { interpolate: { parent: parentName } }),
		{
			confirmButtonText: i18n.baseText('generic.create'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			inputValidator: folderHelpers.validateFolderName,
			customClass: 'add-folder-modal',
		},
	);
	if (promptResponse.action !== MODAL_CONFIRM) return;

	try {
		const newFolder = await foldersStore.createFolder(
			promptResponse.value,
			projectId,
			parentFolderId ?? undefined,
		);
		appendFolderNode({ id: newFolder.id, name: newFolder.name, parentFolderId });
		rebuildModel();
		if (parentFolderId && expandedSet().has(parentFolderId)) {
			// place the new folder card beneath the container's existing content — siblings
			// keep their positions; only the container's neighbours get pushed by the growth
			const rect = containerRect(parentFolderId);
			pos.set(newFolder.id, { x: rect.x + C_PAD, y: rect.y + (rect.h - NODE.h) / 2 });
			renderStructure();
			tweens.tweenPos(newFolder.id, { x: rect.x + C_PAD, y: rect.y + rect.h - C_PAD + C_GAPY });
			resolveAround(parentFolderId, rectOfT(parentFolderId));
		} else {
			ensureRootUnitPositions();
			renderStructure();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('folders.create.error.title'));
	}
}

/* ============================== renaming ============================== */

async function renameFolderIn(folderId: string): Promise<void> {
	const folder = model.value.folders.get(folderId);
	if (!folder) return;
	const promptResponse = await message.prompt(
		i18n.baseText('folders.rename.message', { interpolate: { folderName: folder.name } }),
		{
			confirmButtonText: i18n.baseText('generic.rename'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			inputValue: folder.name,
			customClass: 'rename-folder-modal',
			inputValidator: folderHelpers.validateFolderName,
		},
	);
	if (promptResponse.action !== MODAL_CONFIRM) return;

	const newName = promptResponse.value;
	try {
		await foldersStore.renameFolder(projectId, folderId, newName);
		renameNodeInCache(folderId, newName);
		folder.name = newName;
		renderStructure();
		toast.showMessage({
			title: i18n.baseText('folders.rename.success.message', {
				interpolate: { folderName: newName },
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('folders.rename.error.title'));
	}
}

async function renameWorkflow(workflowId: string): Promise<void> {
	const workflow = model.value.workflows.get(workflowId);
	if (!workflow) return;
	const promptResponse = await message.prompt(
		i18n.baseText('projectCanvas.workflow.rename.message', {
			interpolate: { workflowName: workflow.name },
		}),
		{
			confirmButtonText: i18n.baseText('generic.rename'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			inputValue: workflow.name,
			customClass: 'rename-workflow-modal',
		},
	);
	if (promptResponse.action !== MODAL_CONFIRM) return;

	const newName = promptResponse.value.trim();
	if (!newName || newName === workflow.name) return;
	try {
		await workflowsStore.updateWorkflow(workflowId, { name: newName });
		renameNodeInCache(workflowId, newName);
		workflow.name = newName;
		renderStructure();
	} catch (error) {
		toast.showError(error, i18n.baseText('projectCanvas.workflow.rename.error.title'));
	}
}

/* ============================== archiving / deleting ============================== */

/** Remove a workflow from the canvas model and caches after it was archived or deleted. */
function removeWorkflowFromCanvas(workflowId: string): void {
	const sourceFolderId = parentOf(model.value, workflowId);
	removeNodeFromCache(workflowId);
	moveOverrides.delete(workflowId);
	if (sourceFolderId) adjustWorkflowCounts(folderChain(sourceFolderId), -1);
	rebuildModel();
	renderStructure();
	relayoutFolder(sourceFolderId);
	// a folder emptied by the removal collapses away
	if (
		sourceFolderId &&
		expandedSet().has(sourceFolderId) &&
		childEntities(model.value, sourceFolderId).length === 0
	) {
		markFolderCollapsed(sourceFolderId);
		renderStructure();
	}
}

async function deleteWorkflowPermanently(workflowId: string, name: string): Promise<void> {
	const confirmed = await message.confirm(
		i18n.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
			interpolate: { workflowName: name },
		}),
		i18n.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText(
				'mainSidebar.confirmMessage.workflowDelete.confirmButtonText',
			),
			cancelButtonText: i18n.baseText('mainSidebar.confirmMessage.workflowDelete.cancelButtonText'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await workflowsListStore.deleteWorkflow(workflowId);
	} catch (error) {
		toast.showError(error, i18n.baseText('generic.deleteWorkflowError'));
		return;
	}
	toast.showMessage({
		title: i18n.baseText('mainSidebar.showMessage.handleSelect1.title', {
			interpolate: { workflowName: name },
		}),
		type: 'success',
	});
}

/**
 * The platform's delete gesture for live workflows: archive (removes it from the
 * project and this canvas), with a follow-up toast link to delete permanently —
 * the backend only allows hard-deleting archived workflows.
 */
async function archiveWorkflowAction(workflowId: string): Promise<void> {
	const workflow = model.value.workflows.get(workflowId);
	if (!workflow) return;

	if (workflow.active) {
		const confirmed = await message.confirm(
			i18n.baseText('mainSidebar.confirmMessage.workflowArchive.message', {
				interpolate: { workflowName: workflow.name },
			}),
			i18n.baseText('mainSidebar.confirmMessage.workflowArchive.headline'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText(
					'mainSidebar.confirmMessage.workflowArchive.confirmButtonText',
				),
				cancelButtonText: i18n.baseText(
					'mainSidebar.confirmMessage.workflowArchive.cancelButtonText',
				),
			},
		);
		if (confirmed !== MODAL_CONFIRM) return;
	}

	const name = workflow.name;
	try {
		await workflowsStore.archiveWorkflow(workflowId);
	} catch (error) {
		toast.showError(error, i18n.baseText('generic.archiveWorkflowError'));
		return;
	}
	removeWorkflowFromCanvas(workflowId);
	toast.showToast({
		title: i18n.baseText('mainSidebar.showMessage.handleArchive.title', {
			interpolate: { workflowName: name },
		}),
		message: `<a href="#" data-test-id="archive-toast-delete-permanently-link">${i18n.baseText('mainSidebar.showMessage.handleArchive.message')}</a>`,
		onClick: (event) => {
			if (event?.target instanceof HTMLAnchorElement) {
				event.preventDefault();
				void deleteWorkflowPermanently(workflowId, name);
			}
		},
		type: 'success',
	});
}

/* ============================== deleting folders ============================== */

const folderEventBus = createEventBus<WorkflowListEventMap>();

/**
 * Refetch this project's graphs and rebuild the canvas after a folder was deleted
 * (possibly with its contents transferred elsewhere). Surviving units keep their
 * positions; anything newly discovered gets placed.
 */
async function refreshAfterFolderDeletion(folderId: string): Promise<void> {
	markFolderCollapsed(folderId);
	pos.delete(folderId);
	// the refetched data is authoritative — local overrides are no longer needed
	moveOverrides.clear();
	countAdjustments.clear();

	const stillExpanded = [...expandedSet()];
	clearProjectCache();
	await fetchRootGraph();
	for (const expandedFolderId of stillExpanded) {
		await fetchFolderGraph(expandedFolderId);
	}
	rebuildModel();
	// drop expansion state for folders that no longer exist (e.g. deleted descendants)
	for (const expandedFolderId of [...expandedSet()]) {
		if (!model.value.folders.has(expandedFolderId)) markFolderCollapsed(expandedFolderId);
	}
	ensureRootUnitPositions();
	renderStructure();
	// place any children that appeared in still-expanded folders (transferred contents)
	for (const expandedFolderId of expandedSet()) {
		const hasNewChildren = childEntities(model.value, expandedFolderId).some((c) => !pos.has(c.id));
		if (hasNewChildren) relayoutFolder(expandedFolderId);
	}
}

async function deleteFolderAction(folderId: string): Promise<void> {
	try {
		const content = await foldersStore.fetchFolderContent(projectId, folderId);
		if (content.totalWorkflows || content.totalSubFolders) {
			// the shared modal reads the folder's name from the folders store cache
			const folder = model.value.folders.get(folderId);
			if (folder) {
				foldersStore.cacheFolders([
					{ id: folder.id, name: folder.name, parentFolder: folder.parentFolderId ?? undefined },
				]);
			}
			// the shared modal offers transferring the contents or deleting everything,
			// performs the deletion, and reports back on the event bus
			uiStore.openDeleteFolderModal(folderId, folderEventBus, {
				workflowCount: content.totalWorkflows,
				subFolderCount: content.totalSubFolders,
			});
			return;
		}
		await foldersStore.deleteFolder(projectId, folderId);
		toast.showMessage({
			title: i18n.baseText('folders.delete.success.message'),
			type: 'success',
		});
		await refreshAfterFolderDeletion(folderId);
	} catch (error) {
		toast.showError(error, i18n.baseText('folders.delete.error.message'));
	}
}

function onFolderDeletedEvent(payload: WorkflowListEventMap['folder-deleted']): void {
	void refreshAfterFolderDeletion(payload.folderId);
}

/* ============================== context menu ============================== */

type ContextMenuTarget =
	| { kind: 'canvas' }
	| { kind: 'workflow'; id: string }
	| { kind: 'folder'; id: string };

const contextMenuOpen = ref(false);
const contextMenuPosition = ref<[number, number]>([0, 0]);
const contextMenuTarget = ref<ContextMenuTarget>({ kind: 'canvas' });
const contextMenuItems = ref<ProjectCanvasMenuItem[]>([]);

function buildContextMenuItems(target: ContextMenuTarget): ProjectCanvasMenuItem[] {
	if (target.kind === 'canvas') {
		return [
			{ id: 'new-workflow', label: i18n.baseText('projectCanvas.menu.newWorkflow'), icon: 'plus' },
			{
				id: 'new-folder',
				label: i18n.baseText('projectCanvas.menu.newFolder'),
				icon: 'folder-plus',
			},
		];
	}
	if (target.kind === 'workflow') {
		const items: ProjectCanvasMenuItem[] = [
			{
				id: 'open-workflow',
				label: i18n.baseText('projectCanvas.menu.openWorkflow'),
				icon: 'workflow',
			},
			{
				id: 'rename-workflow',
				label: i18n.baseText('projectCanvas.menu.renameWorkflow'),
				icon: 'pen',
			},
		];
		// dropping on empty canvas repositions in place, so moving out of a folder is explicit
		if (parentOf(model.value, target.id) !== null) {
			items.push({
				id: 'move-to-root',
				label: i18n.baseText('projectCanvas.menu.moveToRoot'),
				icon: 'log-out',
			});
		}
		items.push({
			id: 'archive-workflow',
			label: i18n.baseText('projectCanvas.menu.archiveWorkflow'),
			icon: 'archive',
			divided: true,
		});
		return items;
	}
	const expanded = expandedSet().has(target.id);
	return [
		{
			id: expanded ? 'collapse-folder' : 'expand-folder',
			label: i18n.baseText(
				expanded ? 'projectCanvas.menu.collapseFolder' : 'projectCanvas.menu.expandFolder',
			),
			icon: expanded ? 'chevrons-down-up' : 'folder-open',
		},
		{ id: 'rename-folder', label: i18n.baseText('projectCanvas.menu.renameFolder'), icon: 'pen' },
		{
			id: 'new-workflow-in-folder',
			label: i18n.baseText('projectCanvas.menu.newWorkflow'),
			icon: 'plus',
			divided: true,
		},
		{
			id: 'new-subfolder',
			label: i18n.baseText('projectCanvas.menu.newSubfolder'),
			icon: 'folder-plus',
		},
		{
			id: 'delete-folder',
			label: i18n.baseText('projectCanvas.menu.deleteFolder'),
			icon: 'trash-2',
			divided: true,
		},
	];
}

function openContextMenu(target: ContextMenuTarget, event: MouseEvent): void {
	contextMenuTarget.value = target;
	contextMenuItems.value = buildContextMenuItems(target);
	contextMenuPosition.value = [event.clientX, event.clientY];
	contextMenuOpen.value = true;
}

function onCardContextMenu(id: string, kind: CanvasPressKind, event: MouseEvent): void {
	// folder cards and expanded containers share the same folder menu
	openContextMenu(kind === 'workflow' ? { kind: 'workflow', id } : { kind: 'folder', id }, event);
}

function onPaneContextMenu(event: MouseEvent): void {
	event.preventDefault();
	openContextMenu({ kind: 'canvas' }, event);
}

function onContextMenuSelect(actionId: string): void {
	contextMenuOpen.value = false;
	const target = contextMenuTarget.value;
	switch (actionId) {
		case 'new-workflow':
			createWorkflowIn(null);
			break;
		case 'new-folder':
			void createFolderIn(null);
			break;
		case 'open-workflow':
			if (target.kind === 'workflow') {
				void router.push({ name: VIEWS.WORKFLOW, params: { workflowId: target.id } });
			}
			break;
		case 'rename-workflow':
			if (target.kind === 'workflow') void renameWorkflow(target.id);
			break;
		case 'archive-workflow':
			if (target.kind === 'workflow') void archiveWorkflowAction(target.id);
			break;
		case 'move-to-root':
			if (target.kind === 'workflow') {
				const currentPos = pos.get(target.id);
				if (currentPos) void moveWorkflowToFolder(target.id, null, { ...currentPos });
			}
			break;
		case 'rename-folder':
			if (target.kind === 'folder') void renameFolderIn(target.id);
			break;
		case 'expand-folder':
			if (target.kind === 'folder') void expandFolder(target.id);
			break;
		case 'collapse-folder':
			if (target.kind === 'folder') collapseFolder(target.id);
			break;
		case 'new-workflow-in-folder':
			if (target.kind === 'folder') createWorkflowIn(target.id);
			break;
		case 'new-subfolder':
			if (target.kind === 'folder') void createFolderIn(target.id);
			break;
		case 'delete-folder':
			if (target.kind === 'folder') void deleteFolderAction(target.id);
			break;
	}
}

/* ============================== interaction wiring ============================== */

const canvasContext: ProjectCanvasContext = {
	hoveredNodeId,
	dropHotId,
	liftedId,
	contentLeftX,
	contentBottomY,
	onCardPointerDown,
	onAddWorkflow: (folderId) => createWorkflowIn(folderId),
	onAddFolder: (parentFolderId) => void createFolderIn(parentFolderId),
	onOpenContextMenu: onCardContextMenu,
};
provide(ProjectCanvasContextKey, canvasContext);

function onNodeMouseEnter({ node }: { node: Node }): void {
	if (liftedId.value || node.type !== 'projectNode') return;
	hoveredNodeId.value = node.id;
}

function onNodeMouseLeave(): void {
	hoveredNodeId.value = null;
}

function toggleRelationshipType(type: WorkflowRelationType): void {
	const next = new Set(visibleTypes.value);
	if (next.has(type)) next.delete(type);
	else next.add(type);
	visibleTypes.value = next;
	// re-resolve visible edges without re-layout or viewport changes
	renderStructure();
}

function goBack(): void {
	void router.push({ name: VIEWS.PROJECTS });
}

onMounted(async () => {
	folderEventBus.on('folder-deleted', onFolderDeletedEvent);
	try {
		await initialise();
	} finally {
		initialising.value = false;
	}
});

onBeforeUnmount(() => {
	folderEventBus.off('folder-deleted', onFolderDeletedEvent);
	detachWindowListeners();
	// flush any pending debounced save so the latest arrangement survives navigation
	persistPositions();
});

defineExpose({
	flowNodes,
	flowEdges,
	// test hooks
	dropTargetAt,
	toggleFolder,
	rectOf,
	__testing: { pos, model, endpointOf },
});
</script>

<template>
	<div class="project-canvas">
		<div class="project-canvas__toolbar">
			<button class="project-canvas__back" data-testid="project-canvas-back" @click="goBack">
				<N8nIcon icon="arrow-left" />
				<span>{{ i18n.baseText('projectCanvas.back') }}</span>
			</button>
			<h2 class="project-canvas__title" data-testid="project-canvas-title">
				{{ projectName }}
			</h2>
			<N8nRadioButtons
				v-model="activeTab"
				:options="tabOptions"
				size="small"
				data-testid="project-canvas-tabs"
			/>
			<div v-if="activeTab === 'canvas'" class="project-canvas__create">
				<N8nButton
					type="secondary"
					size="mini"
					icon="plus"
					data-testid="project-canvas-add-workflow"
					@click="createWorkflowIn(null)"
				>
					{{ i18n.baseText('projectCanvas.create.workflow') }}
				</N8nButton>
				<N8nButton
					type="secondary"
					size="mini"
					icon="folder-plus"
					data-testid="project-canvas-add-folder"
					@click="createFolderIn(null)"
				>
					{{ i18n.baseText('projectCanvas.create.folder') }}
				</N8nButton>
			</div>
			<div v-if="activeTab === 'canvas'" class="project-canvas__filters">
				<label
					v-for="opt in relationshipTypeOptions"
					:key="opt.value"
					class="project-canvas__filter"
					:data-testid="`project-canvas-filter-${opt.value}`"
				>
					<input
						type="checkbox"
						:checked="visibleTypes.has(opt.value)"
						@change="toggleRelationshipType(opt.value)"
					/>
					<span>{{ opt.label }}</span>
				</label>
			</div>
		</div>

		<!-- keep the canvas mounted across tab switches so vue-flow state survives -->
		<div v-show="activeTab === 'canvas'" class="project-canvas__canvas-area">
			<div v-if="showLoading" class="project-canvas__loading">
				{{ i18n.baseText('projectCanvas.loading') }}
			</div>
			<div v-else-if="!hasNodes" class="project-canvas__empty">
				{{ i18n.baseText('projectCanvas.empty') }}
			</div>
			<VueFlow
				v-else
				v-model:nodes="flowNodes"
				v-model:edges="flowEdges"
				:nodes-draggable="false"
				:nodes-connectable="false"
				:elements-selectable="false"
				:fit-view-on-init="true"
				:min-zoom="0.12"
				:max-zoom="2.2"
				@node-mouse-enter="onNodeMouseEnter"
				@node-mouse-leave="onNodeMouseLeave"
				@pane-context-menu="onPaneContextMenu"
			>
				<Background />
				<Controls :show-interactive="false" />
				<MiniMap />

				<template #node-projectNode="nodeProps">
					<ProjectCanvasNode v-bind="nodeProps" />
				</template>

				<template #node-projectContainer="containerProps">
					<ProjectCanvasContainer v-bind="containerProps" />
				</template>

				<template #edge-projectEdge="edgeProps">
					<ProjectCanvasEdge v-bind="edgeProps" />
				</template>
			</VueFlow>

			<ProjectCanvasContextMenu
				:is-open="contextMenuOpen"
				:position="contextMenuPosition"
				:items="contextMenuItems"
				@select="onContextMenuSelect"
				@close="contextMenuOpen = false"
			/>
		</div>

		<div v-if="activeTab === 'atlas'" class="project-canvas__canvas-area">
			<ProjectAtlas :project-id="projectId" />
		</div>
	</div>
</template>

<style scoped lang="scss">
.project-canvas {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	background: var(--color--background--light-2);
}

.project-canvas__toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: var(--color--background--light-3);
	border-bottom: var(--border-width) solid var(--color--foreground);
	flex-shrink: 0;
}

.project-canvas__back {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);

	&:hover {
		background: var(--color--background--hover);
		color: var(--color--text--shade-1);
	}
}

.project-canvas__title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0;
}

.project-canvas__create {
	display: flex;
	gap: var(--spacing--3xs);
}

.project-canvas__filters {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.project-canvas__filter {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	cursor: pointer;
	user-select: none;

	input {
		cursor: pointer;
	}
}

.project-canvas__canvas-area {
	flex: 1;
	min-height: 0;
	position: relative;

	// expanded folder containers must not block pane panning — only their header interacts
	:deep(.vue-flow__node-projectContainer) {
		pointer-events: none !important;

		.project-canvas-container__head {
			pointer-events: auto;
		}
	}
}

.project-canvas__loading,
.project-canvas__empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}
</style>
