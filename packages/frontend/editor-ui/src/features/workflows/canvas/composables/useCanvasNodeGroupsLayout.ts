import type { IWorkflowGroup, NodeConnectionType } from 'n8n-workflow';
import { computed, type Ref } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { sortNodesByExecutionOrder } from '@/app/utils/workflowUtils';
import type { CanvasConnection, CanvasNode } from '../canvas.types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../canvas.types';
import {
	COLLAPSED_GROUP_NODE_PREFIX,
	GROUP_COLLAPSED_WIDTH,
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
import * as workflowUtils from 'n8n-workflow/common';

const DEFAULT_NODE_WIDTH = 100;
const DEFAULT_NODE_HEIGHT = 100;
const COLLAPSED_GROUP_HANDLE_SPACING = 18;
const COLLAPSED_GROUP_VERTICAL_PADDING = 12;

type Rect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type GroupRuntimeHandle = {
	id: string;
	mode: CanvasConnectionMode;
	type: NodeConnectionType;
	top: string;
};

type GroupRuntimeStatus = 'success' | 'error' | 'running' | 'waiting' | 'idle';

export type CanvasNodeGroupLayout = {
	group: IWorkflowGroup;
	collapsed: boolean;
	x: number;
	y: number;
	width: number;
	height: number;
	frameTop: number;
	frameHeight: number;
	status: GroupRuntimeStatus;
};

type BoundaryConnection = {
	connection: CanvasConnection;
	memberNodeId: string;
	oppositeNodeId: string;
};

export function useCanvasNodeGroupsLayout({
	nodes,
	connections,
	nodeDimensionsById,
}: {
	nodes: Ref<CanvasNode[]>;
	connections: Ref<CanvasConnection[]>;
	nodeDimensionsById: Ref<Map<string, { width: number; height: number }>>;
}) {
	const workflowDocumentStore = injectWorkflowDocumentStore();

	const nodesById = computed(() => new Map(nodes.value.map((node) => [node.id, node])));
	const nodeIdToCollapsedGroupId = computed(() => {
		const index = new Map<string, string>();
		const collapsedGroupIds = workflowDocumentStore.value.collapsedGroupIds;

		for (const group of workflowDocumentStore.value.allGroups) {
			if (!collapsedGroupIds.has(group.id)) continue;

			for (const nodeId of group.nodeIds) {
				index.set(nodeId, group.id);
			}
		}

		return index;
	});

	const basePositionsByNodeId = computed(() => {
		return new Map(nodes.value.map((node) => [node.id, { ...node.position }]));
	});

	const baseGroupBoundsById = computed(() => {
		const result = new Map<string, Rect>();
		for (const group of workflowDocumentStore.value.allGroups) {
			const bounds = getExpandedGroupBounds(group, basePositionsByNodeId.value, nodesById.value);
			if (bounds) result.set(group.id, bounds);
		}
		return result;
	});

	const shiftedPositionsByNodeId = computed(() => {
		const positions = new Map(
			Array.from(basePositionsByNodeId.value, ([id, position]) => [id, { ...position }]),
		);
		const groups = workflowDocumentStore.value.allGroups
			.filter((group) => workflowDocumentStore.value.collapsedGroupIds.has(group.id))
			.sort((left, right) => {
				const leftBounds = baseGroupBoundsById.value.get(left.id);
				const rightBounds = baseGroupBoundsById.value.get(right.id);
				if (!leftBounds || !rightBounds) return 0;
				if (leftBounds.x !== rightBounds.x) return leftBounds.x - rightBounds.x;
				return leftBounds.y - rightBounds.y;
			});

		for (const group of groups) {
			const expandedBounds = getExpandedGroupBounds(group, positions, nodesById.value);
			if (!expandedBounds) continue;

			const memberNodeIds = new Set(group.nodeIds);
			const collapsedHeight = getCollapsedGroupHeight(group.id);
			const deltaX = Math.max(expandedBounds.width - GROUP_COLLAPSED_WIDTH, 0);
			const deltaY = Math.max(expandedBounds.height - collapsedHeight, 0);

			if (deltaX === 0 && deltaY === 0) continue;

			for (const node of nodes.value) {
				if (memberNodeIds.has(node.id)) continue;

				const position = positions.get(node.id);
				if (!position) continue;

				const nodeRect = getNodeRect(node, position, nodeDimensionsById.value);
				const overlapsVertical = rangesOverlap(
					nodeRect.y,
					nodeRect.y + nodeRect.height,
					expandedBounds.y,
					expandedBounds.y + expandedBounds.height,
				);
				const overlapsHorizontal = rangesOverlap(
					nodeRect.x,
					nodeRect.x + nodeRect.width,
					expandedBounds.x,
					expandedBounds.x + expandedBounds.width,
				);

				if (
					deltaX > 0 &&
					nodeRect.x >= expandedBounds.x + expandedBounds.width &&
					overlapsVertical
				) {
					position.x -= deltaX;
				}

				if (
					deltaY > 0 &&
					nodeRect.y >= expandedBounds.y + expandedBounds.height &&
					overlapsHorizontal
				) {
					position.y -= deltaY;
				}
			}
		}

		return positions;
	});

	const groupLayouts = computed<CanvasNodeGroupLayout[]>(() => {
		return workflowDocumentStore.value.allGroups
			.map((group) => {
				const expandedBounds = getExpandedGroupBounds(
					group,
					shiftedPositionsByNodeId.value,
					nodesById.value,
				);
				if (!expandedBounds) return null;

				const collapsed = workflowDocumentStore.value.collapsedGroupIds.has(group.id);
				const status = getGroupStatus(group, nodesById.value);

				if (!collapsed) {
					return {
						group,
						collapsed,
						x: expandedBounds.x,
						y: expandedBounds.y,
						width: expandedBounds.width,
						height: expandedBounds.height,
						frameTop: GROUP_HEADER_HEIGHT,
						frameHeight: expandedBounds.height - GROUP_HEADER_HEIGHT,
						status,
					};
				}

				const collapsedHeight = getCollapsedGroupHeight(group.id);
				return {
					group,
					collapsed,
					x: expandedBounds.x,
					y: expandedBounds.y,
					width: GROUP_COLLAPSED_WIDTH,
					height: collapsedHeight,
					frameTop: 0,
					frameHeight: collapsedHeight,
					status,
				};
			})
			.filter((layout): layout is CanvasNodeGroupLayout => layout !== null);
	});

	const groupExecutionOrderIndexById = computed(() => {
		const index = new Map<string, Map<string, number>>();
		const connectionsByDestination = workflowUtils.mapConnectionsByDestination(
			workflowDocumentStore.value.connectionsBySourceNode,
		);
		const nodeTypes = Object.fromEntries(
			workflowDocumentStore.value.allNodes.map((node) => [node.name, node.type]),
		);

		for (const group of workflowDocumentStore.value.allGroups) {
			const groupNodes = group.nodeIds
				.map((nodeId) => nodesById.value.get(nodeId))
				.filter(hasCanvasNodeData);
			const executionOrder = sortNodesByExecutionOrder(
				groupNodes.map((node) => ({
					node: {
						name: node.data.name,
						position: [node.position.x, node.position.y] as [number, number],
					},
					isTrigger: Boolean(
						node.data.render.type === CanvasNodeRenderType.Default &&
							node.data.render.options.trigger,
					),
				})),
				workflowDocumentStore.value.connectionsBySourceNode,
				connectionsByDestination,
				nodeTypes,
			);

			const orderIndex = new Map<string, number>();
			executionOrder.forEach((item, order) => {
				const member = groupNodes.find((node) => node.data.name === item.node.name);
				if (member) orderIndex.set(member.id, order);
			});

			groupNodes
				.filter((node) => !orderIndex.has(node.id))
				.sort((left, right) =>
					left.position.y === right.position.y
						? left.position.x - right.position.x
						: left.position.y - right.position.y,
				)
				.forEach((node) => orderIndex.set(node.id, orderIndex.size));

			index.set(group.id, orderIndex);
		}

		return index;
	});

	const boundaryConnectionsByGroupId = computed(() => {
		const result = new Map<
			string,
			{ incoming: BoundaryConnection[]; outgoing: BoundaryConnection[] }
		>();

		for (const connection of connections.value) {
			const sourceGroupId = nodeIdToCollapsedGroupId.value.get(connection.source);
			const targetGroupId = nodeIdToCollapsedGroupId.value.get(connection.target);

			if (sourceGroupId && sourceGroupId === targetGroupId) continue;

			if (sourceGroupId) {
				const outgoing = getOrCreateBoundaryGroup(result, sourceGroupId).outgoing;
				outgoing.push({
					connection,
					memberNodeId: connection.source,
					oppositeNodeId: connection.target,
				});
			}

			if (targetGroupId) {
				const incoming = getOrCreateBoundaryGroup(result, targetGroupId).incoming;
				incoming.push({
					connection,
					memberNodeId: connection.target,
					oppositeNodeId: connection.source,
				});
			}
		}

		for (const [groupId, boundary] of result) {
			const orderIndex =
				groupExecutionOrderIndexById.value.get(groupId) ?? new Map<string, number>();

			const sortBoundaryConnections = (left: BoundaryConnection, right: BoundaryConnection) => {
				const leftOrder = orderIndex.get(left.memberNodeId) ?? Number.MAX_SAFE_INTEGER;
				const rightOrder = orderIndex.get(right.memberNodeId) ?? Number.MAX_SAFE_INTEGER;
				if (leftOrder !== rightOrder) return leftOrder - rightOrder;

				const leftNode = nodesById.value.get(left.oppositeNodeId);
				const rightNode = nodesById.value.get(right.oppositeNodeId);
				const leftY = leftNode?.position.y ?? 0;
				const rightY = rightNode?.position.y ?? 0;
				if (leftY !== rightY) return leftY - rightY;

				return getConnectionStableId(left.connection).localeCompare(
					getConnectionStableId(right.connection),
				);
			};

			boundary.incoming.sort(sortBoundaryConnections);
			boundary.outgoing.sort(sortBoundaryConnections);
		}

		return result;
	});

	const groupHandlesById = computed(() => {
		const result = new Map<string, GroupRuntimeHandle[]>();

		for (const layout of groupLayouts.value) {
			if (!layout.collapsed) continue;

			const boundary = boundaryConnectionsByGroupId.value.get(layout.group.id) ?? {
				incoming: [],
				outgoing: [],
			};
			const handles: GroupRuntimeHandle[] = [];

			boundary.incoming.forEach((item, index) => {
				if (!item.connection.data) return;
				handles.push({
					id: createCollapsedGroupHandleId(
						CanvasConnectionMode.Input,
						getConnectionStableId(item.connection),
					),
					mode: CanvasConnectionMode.Input,
					type: item.connection.data.target.type,
					top: getHandleTop(index, boundary.incoming.length, GROUP_HEADER_HEIGHT),
				});
			});

			boundary.outgoing.forEach((item, index) => {
				if (!item.connection.data) return;
				handles.push({
					id: createCollapsedGroupHandleId(
						CanvasConnectionMode.Output,
						getConnectionStableId(item.connection),
					),
					mode: CanvasConnectionMode.Output,
					type: item.connection.data.source.type,
					top: getHandleTop(index, boundary.outgoing.length, GROUP_HEADER_HEIGHT),
				});
			});

			result.set(layout.group.id, handles);
		}

		return result;
	});

	const displayNodes = computed<CanvasNode[]>(() => {
		const visibleNodes = nodes.value
			.filter((node) => !nodeIdToCollapsedGroupId.value.has(node.id))
			.map((node) => ({
				...node,
				position: shiftedPositionsByNodeId.value.get(node.id) ?? node.position,
			}));

		const collapsedGroupNodes = groupLayouts.value
			.filter((layout) => layout.collapsed)
			.map<CanvasNode>((layout) => ({
				id: `${COLLAPSED_GROUP_NODE_PREFIX}${layout.group.id}`,
				type: 'canvas-node',
				label: layout.group.name,
				position: { x: layout.x, y: layout.y },
				selectable: false,
				draggable: false,
				data: {
					id: `${COLLAPSED_GROUP_NODE_PREFIX}${layout.group.id}`,
					name: layout.group.name,
					subtitle: '',
					type: 'n8n-nodes-internal.collapsedGroup',
					typeVersion: 1,
					disabled: false,
					connections: {
						[CanvasConnectionMode.Input]: {},
						[CanvasConnectionMode.Output]: {},
					},
					issues: {
						validation: [],
						visible: false,
					},
					pinnedData: {
						count: 0,
						visible: false,
					},
					execution: {
						status: undefined,
						running: false,
					},
					runData: {
						iterations: 0,
						visible: false,
					},
					render: {
						type: CanvasNodeRenderType.GroupCollapsed,
						options: {},
					},
					runtime: {
						group: {
							id: layout.group.id,
							handles: groupHandlesById.value.get(layout.group.id) ?? [],
						},
					},
				},
				style: {
					width: `${layout.width}px`,
					height: `${layout.height}px`,
					opacity: '0',
					pointerEvents: 'none',
				},
			}));

		return [...visibleNodes, ...collapsedGroupNodes];
	});

	const displayConnections = computed<CanvasConnection[]>(() => {
		return connections.value
			.map<CanvasConnection | null>((connection) => {
				if (!connection.data) return null;

				const sourceGroupId = nodeIdToCollapsedGroupId.value.get(connection.source);
				const targetGroupId = nodeIdToCollapsedGroupId.value.get(connection.target);

				if (sourceGroupId && sourceGroupId === targetGroupId) {
					return null;
				}

				const connectionData = connection.data;
				let nextConnectionData = { ...connectionData };
				const nextConnection: CanvasConnection = {
					...connection,
					data: nextConnectionData,
				};

				if (sourceGroupId) {
					const group = workflowDocumentStore.value.getGroupById(sourceGroupId);
					if (!group) return null;

					nextConnection.source = `${COLLAPSED_GROUP_NODE_PREFIX}${sourceGroupId}`;
					nextConnection.sourceHandle = createCollapsedGroupHandleId(
						CanvasConnectionMode.Output,
						getConnectionStableId(connection),
					);
					nextConnectionData = {
						...nextConnectionData,
						source: {
							...nextConnectionData.source,
							node: group.name,
						},
					};
					nextConnection.data = nextConnectionData;
				}

				if (targetGroupId) {
					const group = workflowDocumentStore.value.getGroupById(targetGroupId);
					if (!group) return null;

					nextConnection.target = `${COLLAPSED_GROUP_NODE_PREFIX}${targetGroupId}`;
					nextConnection.targetHandle = createCollapsedGroupHandleId(
						CanvasConnectionMode.Input,
						getConnectionStableId(connection),
					);
					nextConnectionData = {
						...nextConnectionData,
						target: {
							...nextConnectionData.target,
							node: group.name,
						},
					};
					nextConnection.data = nextConnectionData;
				}

				if (sourceGroupId || targetGroupId) {
					nextConnectionData = {
						...nextConnectionData,
						runtime: {
							...(nextConnectionData.runtime ?? {}),
							rerouted: true,
						},
					};
					nextConnection.data = nextConnectionData;
				}

				return nextConnection;
			})
			.filter((connection): connection is CanvasConnection => connection !== null);
	});

	return {
		displayNodes,
		displayConnections,
		groupLayouts,
		shiftedPositionsByNodeId,
	};

	function getCollapsedGroupHeight(groupId: string) {
		const boundary = boundaryConnectionsByGroupId.value.get(groupId);
		const maxCount = Math.max(boundary?.incoming.length ?? 0, boundary?.outgoing.length ?? 0, 1);
		return Math.max(
			GROUP_HEADER_HEIGHT,
			(maxCount - 1) * COLLAPSED_GROUP_HANDLE_SPACING +
				COLLAPSED_GROUP_VERTICAL_PADDING * 2 +
				GROUP_HEADER_HEIGHT,
		);
	}
}

function getOrCreateBoundaryGroup(
	map: Map<string, { incoming: BoundaryConnection[]; outgoing: BoundaryConnection[] }>,
	groupId: string,
) {
	const existing = map.get(groupId);
	if (existing) return existing;

	const next = {
		incoming: [],
		outgoing: [],
	};
	map.set(groupId, next);
	return next;
}

function getExpandedGroupBounds(
	group: IWorkflowGroup,
	positionsByNodeId: Map<string, { x: number; y: number }>,
	nodesById: Map<string, CanvasNode>,
): Rect | null {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	let hasMembers = false;

	for (const nodeId of group.nodeIds) {
		const node = nodesById.get(nodeId);
		const position = positionsByNodeId.get(nodeId);
		if (!node || !position) continue;

		const rect = getNodeRect(node, position);
		minX = Math.min(minX, rect.x);
		minY = Math.min(minY, rect.y);
		maxX = Math.max(maxX, rect.x + rect.width);
		maxY = Math.max(maxY, rect.y + rect.height);
		hasMembers = true;
	}

	if (!hasMembers) {
		return null;
	}

	return {
		x: minX - GROUP_PADDING_X,
		y: minY - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
		width: maxX - minX + 2 * GROUP_PADDING_X,
		height: GROUP_HEADER_HEIGHT + (maxY - minY) + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
	};
}

function getNodeRect(
	node: CanvasNode,
	position: { x: number; y: number },
	nodeDimensionsById?: Map<string, { width: number; height: number }>,
): Rect {
	const dimensions = nodeDimensionsById?.get(node.id);
	return {
		x: position.x,
		y: position.y,
		width: dimensions?.width ?? DEFAULT_NODE_WIDTH,
		height: dimensions?.height ?? DEFAULT_NODE_HEIGHT,
	};
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
	return aStart < bEnd && bStart < aEnd;
}

function createCollapsedGroupHandleId(mode: CanvasConnectionMode, connectionId: string) {
	return `${mode}/${connectionId}`;
}

function getConnectionStableId(connection: CanvasConnection) {
	return (
		connection.id ??
		`${connection.source}/${connection.sourceHandle}/${connection.target}/${connection.targetHandle}`
	);
}

function getHandleTop(index: number, count: number, groupHeight: number) {
	const clusterHeight = (count - 1) * COLLAPSED_GROUP_HANDLE_SPACING;
	const start = groupHeight / 2 - clusterHeight / 2;
	return `${start + index * COLLAPSED_GROUP_HANDLE_SPACING}px`;
}

function getGroupStatus(
	group: IWorkflowGroup,
	nodesById: Map<string, CanvasNode>,
): GroupRuntimeStatus {
	const memberNodes = group.nodeIds
		.map((nodeId) => nodesById.get(nodeId))
		.filter(hasCanvasNodeData);

	if (
		memberNodes.some((node) => node.data.execution.running || node.data.execution.waitingForNext)
	) {
		return 'running';
	}

	if (memberNodes.some((node) => node.data.execution.waiting)) {
		return 'waiting';
	}

	if (memberNodes.some((node) => node.data.issues.visible)) {
		return 'error';
	}

	if (
		memberNodes.length > 0 &&
		memberNodes.every((node) => node.data.execution.status === 'success')
	) {
		return 'success';
	}

	return 'idle';
}

function hasCanvasNodeData(
	node: CanvasNode | undefined,
): node is CanvasNode & { data: NonNullable<CanvasNode['data']> } {
	return node?.data !== undefined;
}
