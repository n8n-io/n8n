/**
 * Pure view-layer transform for collapsed node groups.
 *
 * When a group is collapsed it renders as a single node-like box. This module
 * computes, from the already-mapped canvas connections:
 *   - which member nodes to hide,
 *   - a synthetic "collapsed group" node descriptor per collapsed group,
 *   - how to rewrite / drop connections so external edges reattach to the box
 *     (incoming on the left, outgoing on the right) and internal edges vanish.
 *
 * The workflow document is never mutated — this is display only. Kept pure and
 * dependency-light so it is fully unit-testable without the canvas runtime.
 */

import type { NodeConnectionType } from 'n8n-workflow';

import type { CanvasCollapsedGroupHandle, CanvasConnection } from '../canvas.types';
import { CanvasConnectionMode } from '../canvas.types';
import { createCanvasConnectionHandleString, createCanvasConnectionId } from '../canvas.utils';
import {
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
	GROUP_HEADER_HEIGHT,
} from '../stores/canvasNodeGroups.constants';

export interface CollapsedGroupInput {
	id: string;
	name: string;
	nodeIds: string[];
}

export interface CollapsedGroupNodeDescriptor {
	groupId: string;
	nodeId: string;
	title: string;
	position: { x: number; y: number };
	incoming: CanvasCollapsedGroupHandle[];
	outgoing: CanvasCollapsedGroupHandle[];
}

export interface ConnectionRewrite {
	id: string;
	source: string;
	sourceHandle: string;
	target: string;
	targetHandle: string;
}

export interface CollapsedGroupView {
	hiddenNodeIds: Set<string>;
	nodes: CollapsedGroupNodeDescriptor[];
	connectionRewrites: Map<string, ConnectionRewrite>;
	droppedConnectionIds: Set<string>;
}

const COLLAPSED_GROUP_NODE_PREFIX = '__collapsed-group__';

/** Stable Vue Flow node id for a collapsed group's synthetic node. */
export function collapsedGroupNodeId(groupId: string): string {
	return `${COLLAPSED_GROUP_NODE_PREFIX}${groupId}`;
}

/** Whether a node id belongs to a synthetic collapsed-group node. */
export function isCollapsedGroupNodeId(id: string): boolean {
	return id.startsWith(COLLAPSED_GROUP_NODE_PREFIX);
}

/** Group id encoded in a synthetic collapsed-group node id, or null. */
export function groupIdFromCollapsedNodeId(id: string): string | null {
	return isCollapsedGroupNodeId(id) ? id.slice(COLLAPSED_GROUP_NODE_PREFIX.length) : null;
}

interface GroupAccumulator {
	descriptor: CollapsedGroupNodeDescriptor;
	incomingCount: number;
	outgoingCount: number;
}

export function buildCollapsedGroupView(input: {
	collapsedGroups: CollapsedGroupInput[];
	canvasConnections: CanvasConnection[];
	nodePositionsById: Map<string, { x: number; y: number }>;
}): CollapsedGroupView {
	const { collapsedGroups, canvasConnections, nodePositionsById } = input;

	const hiddenNodeIds = new Set<string>();
	const memberToGroupId = new Map<string, string>();
	const accumulators = new Map<string, GroupAccumulator>();

	for (const group of collapsedGroups) {
		// Anchor the box at the same top-left the expanded frame used: the
		// member bounding box's top-left, minus the frame paddings.
		let minX = Infinity;
		let minY = Infinity;
		let hasMember = false;
		for (const nodeId of group.nodeIds) {
			const position = nodePositionsById.get(nodeId);
			if (!position) continue;
			hasMember = true;
			hiddenNodeIds.add(nodeId);
			memberToGroupId.set(nodeId, group.id);
			if (position.x < minX) minX = position.x;
			if (position.y < minY) minY = position.y;
		}
		if (!hasMember) continue;

		accumulators.set(group.id, {
			descriptor: {
				groupId: group.id,
				nodeId: collapsedGroupNodeId(group.id),
				title: group.name,
				position: {
					x: minX - GROUP_PADDING_X,
					y: minY - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
				},
				incoming: [],
				outgoing: [],
			},
			incomingCount: 0,
			outgoingCount: 0,
		});
	}

	const connectionRewrites = new Map<string, ConnectionRewrite>();
	const droppedConnectionIds = new Set<string>();

	function addOutgoingHandle(acc: GroupAccumulator, type: NodeConnectionType): string {
		const handleId = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type,
			index: acc.outgoingCount,
		});
		acc.outgoingCount += 1;
		acc.descriptor.outgoing.push({ handleId, type });
		return handleId;
	}

	function addIncomingHandle(acc: GroupAccumulator, type: NodeConnectionType): string {
		const handleId = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type,
			index: acc.incomingCount,
		});
		acc.incomingCount += 1;
		acc.descriptor.incoming.push({ handleId, type });
		return handleId;
	}

	for (const connection of canvasConnections) {
		const sourceGroupId = memberToGroupId.get(connection.source);
		const targetGroupId = memberToGroupId.get(connection.target);
		if (!sourceGroupId && !targetGroupId) continue;

		// Internal edge (both ends in the same collapsed group) — hide it.
		if (sourceGroupId && targetGroupId && sourceGroupId === targetGroupId) {
			droppedConnectionIds.add(connection.id);
			continue;
		}

		let source = connection.source;
		let sourceHandle = connection.sourceHandle ?? '';
		let target = connection.target;
		let targetHandle = connection.targetHandle ?? '';

		if (sourceGroupId) {
			const acc = accumulators.get(sourceGroupId);
			if (acc) {
				source = acc.descriptor.nodeId;
				sourceHandle = addOutgoingHandle(acc, connection.data?.source.type ?? 'main');
			}
		}
		if (targetGroupId) {
			const acc = accumulators.get(targetGroupId);
			if (acc) {
				target = acc.descriptor.nodeId;
				targetHandle = addIncomingHandle(acc, connection.data?.target.type ?? 'main');
			}
		}

		connectionRewrites.set(connection.id, {
			id: createCanvasConnectionId({ source, sourceHandle, target, targetHandle }),
			source,
			sourceHandle,
			target,
			targetHandle,
		});
	}

	return {
		hiddenNodeIds,
		nodes: Array.from(accumulators.values(), (acc) => acc.descriptor),
		connectionRewrites,
		droppedConnectionIds,
	};
}
