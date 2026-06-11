import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';
import {
	createCanvasGroupNodeId,
	type BoundingBox,
} from '@/features/workflows/canvas/canvas.types';
import { checkOverlap } from '@/features/workflows/canvas/canvas.utils';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP,
} from '@/features/workflows/canvas/stores/canvasNodeGroups.constants';
import {
	computeNodesRectFromStore,
	type GetNodeDisplaySize,
} from '@/features/workflows/canvas/composables/useCanvasMapping.groups';

export type NodeGroupLayoutAxis = 'x' | 'y';

export type NodeGroupLayoutOffset = { x: number; y: number };

export type NodeGroupLayoutComponentKind = 'node' | 'group';

export interface NodeGroupLayoutComponent {
	id: string;
	kind: NodeGroupLayoutComponentKind;
	nodeIds: string[];
	groupId?: string;
	rect: BoundingBox;
	collapsedRect?: BoundingBox;
	expandedRect?: BoundingBox;
}

export interface BuildNodeGroupLayoutComponentsInput {
	allGroups: IWorkflowGroup[];
	nodes: INodeUi[];
	getNodeById: (id: string) => INodeUi | undefined;
	getNodeDisplaySize?: GetNodeDisplaySize;
	isGroupCollapsed: (id: string) => boolean;
}

export interface ComputeNodeGroupLayoutOffsetsInput {
	components: NodeGroupLayoutComponent[];
	expandedGroupIds: Set<string>;
	expandedGroupIdOrder?: string[];
	ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>;
	spacing?: number;
}

export interface NodeGroupLayoutOffsetEntry {
	sourceGroupId: string;
	componentId: string;
	axis: NodeGroupLayoutAxis;
	delta: number;
}

const GROUP_REPOSITION_SPACING = GRID_SIZE;

// Works in unsnapped store space — the render path additionally grid-snaps
// and width-clamps the title bar (`titleBarFromNodesRect`).
function getGroupRects(memberRect: BoundingBox) {
	const x = memberRect.x - GROUP_PADDING_X;
	const y = memberRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT;
	const collapsedRect: BoundingBox = {
		x,
		y,
		width: GROUP_HEADER_WIDTH_COLLAPSED,
		height: GROUP_HEADER_HEIGHT,
	};
	const expandedRect: BoundingBox = {
		x,
		y,
		width: memberRect.width + 2 * GROUP_PADDING_X,
		height: GROUP_HEADER_HEIGHT + memberRect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
	};
	return { collapsedRect, expandedRect };
}

export function buildNodeGroupLayoutComponents({
	allGroups,
	nodes,
	getNodeById,
	getNodeDisplaySize,
	isGroupCollapsed,
}: BuildNodeGroupLayoutComponentsInput): NodeGroupLayoutComponent[] {
	const components: NodeGroupLayoutComponent[] = [];
	const groupedNodeIds = new Set<string>();

	for (const group of allGroups) {
		for (const nodeId of group.nodeIds) groupedNodeIds.add(nodeId);
		const hasMember = group.nodeIds.some((id) => getNodeById(id) !== undefined);
		if (!hasMember) continue;

		const nodesRect = computeNodesRectFromStore(group.nodeIds, getNodeById, getNodeDisplaySize);
		const { collapsedRect, expandedRect } = getGroupRects(nodesRect);
		components.push({
			id: createCanvasGroupNodeId(group.id),
			kind: 'group',
			groupId: group.id,
			nodeIds: [...group.nodeIds],
			rect: isGroupCollapsed(group.id) ? collapsedRect : expandedRect,
			collapsedRect,
			expandedRect,
		});
	}

	for (const node of nodes) {
		if (groupedNodeIds.has(node.id)) continue;
		components.push({
			id: node.id,
			kind: 'node',
			nodeIds: [node.id],
			rect: computeNodesRectFromStore([node.id], getNodeById, getNodeDisplaySize),
		});
	}

	return components;
}

export function mapNodeIdsToComponentIds(components: NodeGroupLayoutComponent[]) {
	const index = new Map<string, string>();

	for (const component of components) {
		for (const nodeId of component.nodeIds) {
			index.set(nodeId, component.id);
		}
	}

	return index;
}

export function getOffsetForComponent(
	offsets: Map<string, NodeGroupLayoutOffset>,
	componentId: string,
): NodeGroupLayoutOffset {
	return offsets.get(componentId) ?? { x: 0, y: 0 };
}

function offsetRect(rect: BoundingBox, offset: NodeGroupLayoutOffset): BoundingBox {
	return {
		...rect,
		x: rect.x + offset.x,
		y: rect.y + offset.y,
	};
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
	return aStart < bEnd && bStart < aEnd;
}

function overlapsVerticalBand(rect: BoundingBox, band: BoundingBox): boolean {
	return rangesOverlap(rect.y, rect.y + rect.height, band.y, band.y + band.height);
}

function overlapsHorizontalBand(rect: BoundingBox, band: BoundingBox): boolean {
	return rangesOverlap(rect.x, rect.x + rect.width, band.x, band.x + band.width);
}

function getComponentLaneOrigin(component: NodeGroupLayoutComponent, componentRect: BoundingBox) {
	if (component.kind === 'group') {
		return {
			x: componentRect.x + GROUP_PADDING_X,
			y: componentRect.y + GROUP_HEADER_HEIGHT + GROUP_PADDING_Y_TOP,
		};
	}

	return { x: componentRect.x, y: componentRect.y };
}

function getPushTargetAnchorRect(component: NodeGroupLayoutComponent) {
	if (component.kind === 'group' && component.expandedRect) {
		return component.expandedRect;
	}

	return component.rect;
}

function getComponentPushLane(
	component: NodeGroupLayoutComponent,
	componentAnchorRect: BoundingBox,
	componentCurrentRect: BoundingBox,
	collapsedGroupRect: BoundingBox,
	expandedGroupRect: BoundingBox,
	horizontalPushDistance: number,
	verticalPushDistance: number,
	targetExpandedAfterSource = false,
): NodeGroupLayoutAxis | null {
	const collapsedGroupRight = collapsedGroupRect.x + collapsedGroupRect.width;
	const sourceContentRowBottom =
		collapsedGroupRect.y + GROUP_HEADER_HEIGHT + GROUP_PADDING_Y_TOP + GROUP_HEADER_HEIGHT;
	const collapsedGroupBottom = collapsedGroupRect.y + collapsedGroupRect.height;
	const laneOrigin = getComponentLaneOrigin(component, componentAnchorRect);
	const componentStartsAtOrBelowSourceTop = laneOrigin.y >= collapsedGroupRect.y;
	const componentStartsBelowSourceRow = laneOrigin.y >= sourceContentRowBottom;
	const componentStartsRightOfCollapsedGroup = laneOrigin.x >= collapsedGroupRight;
	// A group target expanded AFTER this source whose chip column sits fully
	// left of the source's content is not pushed down: its own, later source
	// pass is guaranteed to claim the right lane against this source and push
	// it rightward, keeping the freshly expanded group where the user
	// expanded it.
	const skipDownPush =
		targetExpandedAfterSource &&
		component.kind === 'group' &&
		component.collapsedRect !== undefined &&
		collapsedGroupRect.x + GROUP_PADDING_X >= componentAnchorRect.x + component.collapsedRect.width;
	const componentIntersectsBottomExpansion =
		componentAnchorRect.y + componentAnchorRect.height > collapsedGroupBottom;
	// Lane extents are directional, following how a group frame grows from its
	// chip (rightward and downward):
	// - The RIGHT lane's vertical extent uses the inflated anchor: a chip above
	//   the band whose future frame dips down into it must ride along.
	// - The DOWN lane's horizontal extent uses the ACTUAL rect: a chip's
	//   not-yet-real width must not pull a component that sits left of the
	//   source into the down lane — only what really occupies the column moves
	//   (and moves together, so a pushed chip can't land on a lane neighbor).
	const componentOverlapsExpandedHeight = overlapsVerticalBand(
		componentAnchorRect,
		expandedGroupRect,
	);
	const componentOverlapsExpandedWidth = overlapsHorizontalBand(
		componentCurrentRect,
		expandedGroupRect,
	);
	const canPushDownFromLaneOrigin =
		verticalPushDistance > 0 &&
		componentStartsBelowSourceRow &&
		componentOverlapsExpandedWidth &&
		!skipDownPush;
	const canPushRightFromLaneOrigin =
		horizontalPushDistance > 0 &&
		componentStartsRightOfCollapsedGroup &&
		componentOverlapsExpandedHeight;

	if (canPushDownFromLaneOrigin && canPushRightFromLaneOrigin) {
		const distanceIntoRightLane = laneOrigin.x - collapsedGroupRight;
		const distanceIntoBottomLane = laneOrigin.y - sourceContentRowBottom;
		return distanceIntoRightLane >= distanceIntoBottomLane ? 'x' : 'y';
	}

	if (canPushDownFromLaneOrigin) {
		return 'y';
	}

	if (canPushRightFromLaneOrigin) {
		return 'x';
	}

	if (
		verticalPushDistance > 0 &&
		componentStartsAtOrBelowSourceTop &&
		componentIntersectsBottomExpansion &&
		componentOverlapsExpandedWidth &&
		!skipDownPush
	) {
		return 'y';
	}

	return null;
}

function addComponentOffset(
	offsets: Map<string, NodeGroupLayoutOffset>,
	componentId: string,
	axis: NodeGroupLayoutAxis,
	delta: number,
) {
	if (delta === 0) return;
	const offset = offsets.get(componentId) ?? { x: 0, y: 0 };
	if (axis === 'x') {
		offset.x += delta;
	} else {
		offset.y += delta;
	}
	offsets.set(componentId, offset);
}

export function aggregateNodeGroupLayoutOffsets(entries: NodeGroupLayoutOffsetEntry[]) {
	const offsets = new Map<string, NodeGroupLayoutOffset>();

	for (const entry of entries) {
		addComponentOffset(offsets, entry.componentId, entry.axis, entry.delta);
	}

	return offsets;
}

function isComponentIgnoredForSource(
	component: NodeGroupLayoutComponent,
	sourceGroupId: string,
	ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>,
) {
	const ignoredNodeIds = ignoredNodeIdsBySourceGroup?.get(sourceGroupId);
	return ignoredNodeIds ? component.nodeIds.some((nodeId) => ignoredNodeIds.has(nodeId)) : false;
}

function getExpandedGroupSources(
	components: NodeGroupLayoutComponent[],
	expandedGroupIds: Set<string>,
	expandedGroupIdOrder: string[] = [],
) {
	const groupOrderIndex = new Map(expandedGroupIdOrder.map((groupId, index) => [groupId, index]));

	return components
		.filter(
			(component) =>
				component.kind === 'group' &&
				component.groupId &&
				expandedGroupIds.has(component.groupId) &&
				component.collapsedRect &&
				component.expandedRect,
		)
		.sort((a, b) => {
			const aOrder = a.groupId ? groupOrderIndex.get(a.groupId) : undefined;
			const bOrder = b.groupId ? groupOrderIndex.get(b.groupId) : undefined;
			if (aOrder !== undefined || bOrder !== undefined) {
				if (aOrder === undefined) return 1;
				if (bOrder === undefined) return -1;
				if (aOrder !== bOrder) return aOrder - bOrder;
			}

			const aRect = a.collapsedRect ?? a.rect;
			const bRect = b.collapsedRect ?? b.rect;
			if (aRect.y !== bRect.y) return aRect.y - bRect.y;
			if (aRect.x !== bRect.x) return aRect.x - bRect.x;
			return a.id.localeCompare(b.id);
		});
}

function didComponentPushSource(
	entries: NodeGroupLayoutOffsetEntry[],
	component: NodeGroupLayoutComponent,
	sourceComponentId: string,
) {
	return (
		component.kind === 'group' &&
		component.groupId !== undefined &&
		entries.some(
			(entry) =>
				entry.sourceGroupId === component.groupId && entry.componentId === sourceComponentId,
		)
	);
}

interface SourceLayoutContext {
	source: NodeGroupLayoutComponent;
	sourceGroupId: string;
	collapsedRect: BoundingBox;
	expandedRect: BoundingBox;
	horizontalPushDistance: number;
	verticalPushDistance: number;
	spacing: number;
}

interface SourcePushPlan {
	pushLaneByComponentId: Map<string, NodeGroupLayoutAxis>;
	triggeredPushLanes: Set<NodeGroupLayoutAxis>;
	requiredClearanceByLane: Map<NodeGroupLayoutAxis, number>;
}

interface ApplyOffsetInput {
	entries: NodeGroupLayoutOffsetEntry[];
	offsets: Map<string, NodeGroupLayoutOffset>;
	componentsById: Map<string, NodeGroupLayoutComponent>;
	sourceGroupId: string;
	sourceComponentId: string;
	ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>;
}

function getSourceLayoutContext(
	source: NodeGroupLayoutComponent,
	sourceOffset: NodeGroupLayoutOffset,
	spacing: number,
): SourceLayoutContext | undefined {
	if (!source.groupId || !source.collapsedRect || !source.expandedRect) return undefined;

	const collapsedRect = offsetRect(source.collapsedRect, sourceOffset);
	const expandedRect = offsetRect(source.expandedRect, sourceOffset);
	return {
		source,
		sourceGroupId: source.groupId,
		collapsedRect,
		expandedRect,
		horizontalPushDistance: expandedRect.width - collapsedRect.width + spacing,
		verticalPushDistance: expandedRect.height - collapsedRect.height + spacing,
		spacing,
	};
}

function hasSourceEntry(
	entries: NodeGroupLayoutOffsetEntry[],
	sourceGroupId: string,
	componentId: string,
	axis: NodeGroupLayoutAxis,
) {
	return entries.some(
		(entry) =>
			entry.sourceGroupId === sourceGroupId &&
			entry.componentId === componentId &&
			entry.axis === axis,
	);
}

function applyOffset({
	entries,
	offsets,
	componentsById,
	sourceGroupId,
	sourceComponentId,
	ignoredNodeIdsBySourceGroup,
}: ApplyOffsetInput) {
	function apply(
		componentId: string,
		axis: NodeGroupLayoutAxis,
		delta: number,
		propagatedGroupIds = new Set<string>(),
	) {
		if (delta === 0 || hasSourceEntry(entries, sourceGroupId, componentId, axis)) return;

		addComponentOffset(offsets, componentId, axis, delta);
		entries.push({ sourceGroupId, componentId, axis, delta });

		// A pushed group drags its own previously pushed targets ("followers")
		// along so their relative arrangement survives the move.
		const component = componentsById.get(componentId);
		if (!component?.groupId || propagatedGroupIds.has(component.groupId)) return;

		propagatedGroupIds.add(component.groupId);
		const followerIds = new Set(
			entries
				.filter((entry) => entry.sourceGroupId === component.groupId)
				.map((entry) => entry.componentId),
		);

		for (const followerId of followerIds) {
			if (followerId === sourceComponentId || followerId === componentId) continue;

			const follower = componentsById.get(followerId);
			if (!follower) continue;
			if (isComponentIgnoredForSource(follower, sourceGroupId, ignoredNodeIdsBySourceGroup)) {
				continue;
			}

			apply(followerId, axis, delta, propagatedGroupIds);
		}
	}

	return apply;
}

function findSourcePushPlan(
	components: NodeGroupLayoutComponent[],
	sourceLayout: SourceLayoutContext,
	offsets: Map<string, NodeGroupLayoutOffset>,
	entries: NodeGroupLayoutOffsetEntry[],
	expandedOrderIndex: Map<string, number>,
	ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>,
): SourcePushPlan {
	const pushLaneByComponentId = new Map<string, NodeGroupLayoutAxis>();
	const triggeredPushLanes = new Set<NodeGroupLayoutAxis>();
	const requiredClearanceByLane = new Map<NodeGroupLayoutAxis, number>();
	const sourceOrderIndex = expandedOrderIndex.get(sourceLayout.sourceGroupId);

	for (const component of components) {
		if (component.id === sourceLayout.source.id) continue;
		// Don't let the current source push a component that already pushed it.
		// When two expanded groups overlap, the first-processed one pushes the
		// second; this stops the second from pushing the first back and giving an
		// already-settled source a spurious offset. Confirmed load-bearing by the
		// 'uses expanded group order to keep an older source pushing a newly
		// expanded target' layout test — removing it fails that case.
		if (didComponentPushSource(entries, component, sourceLayout.source.id)) continue;
		if (
			isComponentIgnoredForSource(
				component,
				sourceLayout.sourceGroupId,
				ignoredNodeIdsBySourceGroup,
			)
		) {
			continue;
		}

		const targetOffset = getOffsetForComponent(offsets, component.id);
		const targetAnchorRect = offsetRect(getPushTargetAnchorRect(component), targetOffset);
		const targetCurrentRect = offsetRect(component.rect, targetOffset);
		const targetOrderIndex =
			component.groupId === undefined ? undefined : expandedOrderIndex.get(component.groupId);
		const targetExpandedAfterSource =
			sourceOrderIndex !== undefined &&
			targetOrderIndex !== undefined &&
			targetOrderIndex > sourceOrderIndex;
		const pushLane = getComponentPushLane(
			component,
			targetAnchorRect,
			targetCurrentRect,
			sourceLayout.collapsedRect,
			sourceLayout.expandedRect,
			sourceLayout.horizontalPushDistance,
			sourceLayout.verticalPushDistance,
			targetExpandedAfterSource,
		);
		if (!pushLane) continue;

		pushLaneByComponentId.set(component.id, pushLane);
		if (checkOverlap(targetAnchorRect, sourceLayout.expandedRect)) {
			triggeredPushLanes.add(pushLane);
			// The default lane distance (source width/height delta) preserves each
			// target's clearance measured from its lane origin, but a group frame
			// extends beyond its lane origin (padding/header), so it can still end
			// up overlapping. Track the distance the overlapping targets actually
			// need to clear the source's expanded frame.
			const clearanceDistance =
				pushLane === 'x'
					? sourceLayout.expandedRect.x + sourceLayout.expandedRect.width - targetAnchorRect.x
					: sourceLayout.expandedRect.y + sourceLayout.expandedRect.height - targetAnchorRect.y;
			requiredClearanceByLane.set(
				pushLane,
				Math.max(requiredClearanceByLane.get(pushLane) ?? 0, clearanceDistance),
			);
		}
	}

	return { pushLaneByComponentId, triggeredPushLanes, requiredClearanceByLane };
}

function applySourcePushPlan(
	components: NodeGroupLayoutComponent[],
	sourceLayout: SourceLayoutContext,
	pushPlan: SourcePushPlan,
	apply: ReturnType<typeof applyOffset>,
) {
	for (const component of components) {
		const pushLane = pushPlan.pushLaneByComponentId.get(component.id);
		if (!pushLane || !pushPlan.triggeredPushLanes.has(pushLane)) continue;

		const basePushDistance =
			pushLane === 'x' ? sourceLayout.horizontalPushDistance : sourceLayout.verticalPushDistance;
		// Only bump beyond the base distance when it would leave an overlapping
		// frame: a base distance that already clears every frame is kept as-is so
		// targets keep their established relative positions.
		const requiredClearance = pushPlan.requiredClearanceByLane.get(pushLane) ?? 0;
		const pushDistance =
			basePushDistance >= requiredClearance
				? basePushDistance
				: requiredClearance + sourceLayout.spacing;
		apply(component.id, pushLane, pushDistance);
	}
}

export function computeNodeGroupLayoutOffsetEntries({
	components,
	expandedGroupIds,
	expandedGroupIdOrder,
	ignoredNodeIdsBySourceGroup,
	spacing = GROUP_REPOSITION_SPACING,
}: ComputeNodeGroupLayoutOffsetsInput): NodeGroupLayoutOffsetEntry[] {
	const entries: NodeGroupLayoutOffsetEntry[] = [];
	const sources = getExpandedGroupSources(components, expandedGroupIds, expandedGroupIdOrder);
	if (sources.length === 0) return entries;

	const offsets = new Map<string, NodeGroupLayoutOffset>();
	const componentsById = new Map(components.map((component) => [component.id, component]));
	const expandedOrderIndex = new Map(
		(expandedGroupIdOrder ?? []).map((groupId, index) => [groupId, index]),
	);

	for (const source of sources) {
		const sourceOffset = getOffsetForComponent(offsets, source.id);
		const sourceLayout = getSourceLayoutContext(source, sourceOffset, spacing);
		if (!sourceLayout) continue;

		const pushPlan = findSourcePushPlan(
			components,
			sourceLayout,
			offsets,
			entries,
			expandedOrderIndex,
			ignoredNodeIdsBySourceGroup,
		);
		const apply = applyOffset({
			entries,
			offsets,
			componentsById,
			sourceGroupId: sourceLayout.sourceGroupId,
			sourceComponentId: source.id,
			ignoredNodeIdsBySourceGroup,
		});

		applySourcePushPlan(components, sourceLayout, pushPlan, apply);
	}

	return entries;
}
