import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';
import {
	createCanvasGroupNodeId,
	type BoundingBox,
} from '@/features/workflows/canvas/canvas.types';
import { applyOffset, checkOverlap } from '@/features/workflows/canvas/canvas.utils';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '@/features/workflows/canvas/stores/canvasNodeGroups.constants';
import {
	computeGroupFrameRects,
	computeNodesRectFromStore,
	type GetNodeDisplaySize,
} from '@/features/workflows/canvas/composables/useCanvasMapping.groups';

export type NodeGroupLayoutAxis = 'x' | 'y';

export type NodeGroupLayoutOffset = { x: number; y: number };

interface NodeGroupLayoutComponentBase {
	id: string;
	nodeIds: string[];
	rect: BoundingBox;
}

export interface NodeLayoutComponent extends NodeGroupLayoutComponentBase {
	kind: 'node';
}

export interface GroupLayoutComponent extends NodeGroupLayoutComponentBase {
	kind: 'group';
	groupId: string;
	collapsedRect: BoundingBox;
	expandedRect: BoundingBox;
}

export type NodeGroupLayoutComponent = NodeLayoutComponent | GroupLayoutComponent;

export interface BuildNodeGroupLayoutComponentsInput {
	allGroups: IWorkflowGroup[];
	nodes: INodeUi[];
	getNodeById: (id: string) => INodeUi | undefined;
	getNodeDisplaySize?: GetNodeDisplaySize;
	isGroupCollapsed: (id: string) => boolean;
}

export interface ComputeNodeGroupLayoutPushesInput {
	components: NodeGroupLayoutComponent[];
	expandedGroupIds: Set<string>;
	expandedGroupIdOrder?: string[];
	ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>;
	spacing?: number;
}

export interface NodeGroupLayoutPushEntry {
	sourceGroupId: string;
	componentId: string;
	axis: NodeGroupLayoutAxis;
	delta: number;
}

const GROUP_REPOSITION_SPACING = GRID_SIZE;

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
		const { collapsed: collapsedRect, expanded: expandedRect } = computeGroupFrameRects(nodesRect);
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

function translateRect(rect: BoundingBox, offset: NodeGroupLayoutOffset): BoundingBox {
	return { ...rect, ...applyOffset(rect, offset) };
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
	return component.kind === 'group' ? component.expandedRect : component.rect;
}

function getComponentPushLane(
	component: NodeGroupLayoutComponent,
	componentAnchorRect: BoundingBox,
	componentCurrentRect: BoundingBox,
	pushSource: PushSourceContext,
	targetExpandedAfterSource = false,
): NodeGroupLayoutAxis | null {
	const {
		collapsedRect: collapsedGroupRect,
		expandedRect: expandedGroupRect,
		horizontalPushDistance,
		verticalPushDistance,
	} = pushSource;
	const collapsedGroupRight = collapsedGroupRect.x + collapsedGroupRect.width;
	const sourceContentRowBottom =
		collapsedGroupRect.y + GROUP_HEADER_HEIGHT + GROUP_PADDING_Y_TOP + GROUP_HEADER_HEIGHT;
	const collapsedGroupBottom = collapsedGroupRect.y + collapsedGroupRect.height;
	const laneOrigin = getComponentLaneOrigin(component, componentAnchorRect);
	const componentStartsAtOrBelowSourceTop = componentAnchorRect.y >= collapsedGroupRect.y;
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

	if (canPushDownFromLaneOrigin) return 'y';
	if (canPushRightFromLaneOrigin) return 'x';

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

export function aggregateNodeGroupLayoutOffsets(entries: NodeGroupLayoutPushEntry[]) {
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

function getOrderedPushSources(
	components: NodeGroupLayoutComponent[],
	expandedGroupIds: Set<string>,
	expandedGroupIdOrder: string[] = [],
) {
	const groupOrderIndex = new Map(expandedGroupIdOrder.map((groupId, index) => [groupId, index]));

	return components
		.filter(
			(component): component is GroupLayoutComponent =>
				component.kind === 'group' && expandedGroupIds.has(component.groupId),
		)
		.sort((a, b) => {
			const aOrder = groupOrderIndex.get(a.groupId) ?? Number.POSITIVE_INFINITY;
			const bOrder = groupOrderIndex.get(b.groupId) ?? Number.POSITIVE_INFINITY;
			if (aOrder !== bOrder) return aOrder - bOrder;

			if (a.collapsedRect.y !== b.collapsedRect.y) return a.collapsedRect.y - b.collapsedRect.y;
			if (a.collapsedRect.x !== b.collapsedRect.x) return a.collapsedRect.x - b.collapsedRect.x;
			return a.id.localeCompare(b.id);
		});
}

function didComponentPushSource(
	entries: NodeGroupLayoutPushEntry[],
	component: NodeGroupLayoutComponent,
	sourceComponentId: string,
) {
	return (
		component.kind === 'group' &&
		entries.some(
			(entry) =>
				entry.sourceGroupId === component.groupId && entry.componentId === sourceComponentId,
		)
	);
}

interface PushSourceContext {
	source: GroupLayoutComponent;
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

interface CreateOffsetApplierInput {
	entries: NodeGroupLayoutPushEntry[];
	offsets: Map<string, NodeGroupLayoutOffset>;
	componentsById: Map<string, NodeGroupLayoutComponent>;
	sourceGroupId: string;
	sourceComponentId: string;
	ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>;
}

function getPushSourceContext(
	source: GroupLayoutComponent,
	sourceOffset: NodeGroupLayoutOffset,
	spacing: number,
): PushSourceContext {
	const collapsedRect = translateRect(source.collapsedRect, sourceOffset);
	const expandedRect = translateRect(source.expandedRect, sourceOffset);
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

function sourceAlreadyPushedComponent(
	entries: NodeGroupLayoutPushEntry[],
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

function createOffsetApplier({
	entries,
	offsets,
	componentsById,
	sourceGroupId,
	sourceComponentId,
	ignoredNodeIdsBySourceGroup,
}: CreateOffsetApplierInput) {
	function applyPush(
		componentId: string,
		axis: NodeGroupLayoutAxis,
		delta: number,
		propagatedGroupIds = new Set<string>(),
	) {
		if (delta === 0 || sourceAlreadyPushedComponent(entries, sourceGroupId, componentId, axis))
			return;

		addComponentOffset(offsets, componentId, axis, delta);
		entries.push({ sourceGroupId, componentId, axis, delta });

		// A pushed group drags its own previously pushed targets ("followers")
		// along so their relative arrangement survives the move.
		const component = componentsById.get(componentId);
		if (component?.kind !== 'group' || propagatedGroupIds.has(component.groupId)) return;

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

			applyPush(followerId, axis, delta, propagatedGroupIds);
		}
	}

	return applyPush;
}

function findSourcePushPlan(
	components: NodeGroupLayoutComponent[],
	pushSource: PushSourceContext,
	offsets: Map<string, NodeGroupLayoutOffset>,
	entries: NodeGroupLayoutPushEntry[],
	expandedOrderIndex: Map<string, number>,
	ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>,
): SourcePushPlan {
	const pushLaneByComponentId = new Map<string, NodeGroupLayoutAxis>();
	const triggeredPushLanes = new Set<NodeGroupLayoutAxis>();
	const requiredClearanceByLane = new Map<NodeGroupLayoutAxis, number>();
	const sourceOrderIndex = expandedOrderIndex.get(pushSource.sourceGroupId);

	for (const component of components) {
		if (component.id === pushSource.source.id) continue;
		if (didComponentPushSource(entries, component, pushSource.source.id)) continue;
		if (
			isComponentIgnoredForSource(component, pushSource.sourceGroupId, ignoredNodeIdsBySourceGroup)
		) {
			continue;
		}

		const targetOffset = getOffsetForComponent(offsets, component.id);
		const targetAnchorRect = translateRect(getPushTargetAnchorRect(component), targetOffset);
		const targetCurrentRect = translateRect(component.rect, targetOffset);
		const targetOrderIndex =
			component.kind === 'group' ? expandedOrderIndex.get(component.groupId) : undefined;
		const targetExpandedAfterSource =
			sourceOrderIndex !== undefined &&
			targetOrderIndex !== undefined &&
			targetOrderIndex > sourceOrderIndex;
		const pushLane = getComponentPushLane(
			component,
			targetAnchorRect,
			targetCurrentRect,
			pushSource,
			targetExpandedAfterSource,
		);
		if (!pushLane) continue;

		pushLaneByComponentId.set(component.id, pushLane);
		if (checkOverlap(targetAnchorRect, pushSource.expandedRect)) {
			triggeredPushLanes.add(pushLane);
			// The default lane distance (source width/height delta) preserves each
			// target's clearance measured from its lane origin, but a group frame
			// extends beyond its lane origin (padding/header), so it can still end
			// up overlapping. Track the distance the overlapping targets actually
			// need to clear the source's expanded frame.
			const clearanceDistance =
				pushLane === 'x'
					? pushSource.expandedRect.x + pushSource.expandedRect.width - targetAnchorRect.x
					: pushSource.expandedRect.y + pushSource.expandedRect.height - targetAnchorRect.y;
			requiredClearanceByLane.set(
				pushLane,
				Math.max(requiredClearanceByLane.get(pushLane) ?? 0, clearanceDistance),
			);
		}
	}

	return { pushLaneByComponentId, triggeredPushLanes, requiredClearanceByLane };
}

function applySourcePushPlan(
	pushSource: PushSourceContext,
	pushPlan: SourcePushPlan,
	applyPush: ReturnType<typeof createOffsetApplier>,
) {
	for (const [componentId, pushLane] of pushPlan.pushLaneByComponentId) {
		if (!pushPlan.triggeredPushLanes.has(pushLane)) continue;

		const basePushDistance =
			pushLane === 'x' ? pushSource.horizontalPushDistance : pushSource.verticalPushDistance;
		// Only bump beyond the base distance when it would leave an overlapping
		// frame: a base distance that already clears every frame is kept as-is so
		// targets keep their established relative positions.
		const requiredClearance = pushPlan.requiredClearanceByLane.get(pushLane) ?? 0;
		const pushDistance =
			basePushDistance >= requiredClearance
				? basePushDistance
				: requiredClearance + pushSource.spacing;
		applyPush(componentId, pushLane, pushDistance);
	}
}

export function computeNodeGroupLayoutPushes({
	components,
	expandedGroupIds,
	expandedGroupIdOrder,
	ignoredNodeIdsBySourceGroup,
	spacing = GROUP_REPOSITION_SPACING,
}: ComputeNodeGroupLayoutPushesInput): NodeGroupLayoutPushEntry[] {
	const entries: NodeGroupLayoutPushEntry[] = [];
	const sources = getOrderedPushSources(components, expandedGroupIds, expandedGroupIdOrder);
	if (sources.length === 0) return entries;

	const offsets = new Map<string, NodeGroupLayoutOffset>();
	const componentsById = new Map(components.map((component) => [component.id, component]));
	const expandedOrderIndex = new Map(
		(expandedGroupIdOrder ?? []).map((groupId, index) => [groupId, index]),
	);

	for (const source of sources) {
		const sourceOffset = getOffsetForComponent(offsets, source.id);
		const pushSource = getPushSourceContext(source, sourceOffset, spacing);

		const pushPlan = findSourcePushPlan(
			components,
			pushSource,
			offsets,
			entries,
			expandedOrderIndex,
			ignoredNodeIdsBySourceGroup,
		);
		const applyPush = createOffsetApplier({
			entries,
			offsets,
			componentsById,
			sourceGroupId: pushSource.sourceGroupId,
			sourceComponentId: source.id,
			ignoredNodeIdsBySourceGroup,
		});

		applySourcePushPlan(pushSource, pushPlan, applyPush);
	}

	return entries;
}
