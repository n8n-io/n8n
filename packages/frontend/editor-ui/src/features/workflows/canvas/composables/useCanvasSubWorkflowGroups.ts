import { computed, type InjectionKey, type Ref } from 'vue';
import type { INodeUi } from '@/Interface';
import { EXECUTE_WORKFLOW_NODE_TYPE, getSubworkflowId } from 'n8n-workflow';
import type { CanvasConnection, CanvasGroupNode } from '../canvas.types';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	CANVAS_SUBWORKFLOW_GROUP_TYPE,
	createCanvasSubWorkflowGroupNodeId,
} from '../canvas.types';
import { GROUP_HEADER_HEIGHT } from '../stores/canvasNodeGroups.constants';
import { titleBarFromNodesRect } from './useCanvasMapping.groups';
import { createCanvasConnectionId } from '../canvas.utils';

// Expanded frame size until the interior nodes drive it.
const EXPANDED_PLACEHOLDER = { width: 600, height: 320 };

// Lets the shared group shell toggle sub-workflow expansion, which is tracked
// separately from real-group view state.
export interface SubWorkflowGroupView {
	isExpanded: (hostNodeId: string) => boolean;
	toggle: (hostNodeId: string) => void;
}
export const SubWorkflowGroupViewKey: InjectionKey<SubWorkflowGroupView> =
	Symbol('SubWorkflowGroupView');

function eligibleWorkflowId(node: INodeUi): string | undefined {
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE) return undefined;
	const id = getSubworkflowId(node);
	return id && !id.startsWith('=') ? id : undefined;
}

export function useCanvasSubWorkflowGroups(deps: {
	nodes: Ref<INodeUi[]>;
	getNodeDisplaySize: (id: string) => { width: number; height: number } | undefined;
	isGroupExpanded: (hostNodeId: string) => boolean;
	getCurrentWorkflowId: () => string | undefined;
}) {
	const eligibleHosts = computed(() => {
		const currentWorkflowId = deps.getCurrentWorkflowId();
		return deps.nodes.value.filter((n) => {
			const targetId = eligibleWorkflowId(n);
			// Skip self-references (calling the current workflow) / inline sub-workflows
			return targetId !== undefined && targetId !== currentWorkflowId;
		});
	});

	const hostNodeIds = computed(() => new Set(eligibleHosts.value.map((h) => h.id)));

	const groupNodes = computed<CanvasGroupNode[]>(() =>
		eligibleHosts.value.map((host) => {
			const collapsed = !deps.isGroupExpanded(host.id);
			const size = deps.getNodeDisplaySize(host.id) ?? { width: 100, height: 100 };
			// `titleBarFromNodesRect` derives the title bar position from x/y only, so
			// anchoring x/y to the host keeps the frame in place across collapse/expand.
			const nodesRect = collapsed
				? { x: host.position[0], y: host.position[1], ...size }
				: { x: host.position[0], y: host.position[1], ...EXPANDED_PLACEHOLDER };
			const titleBar = titleBarFromNodesRect(nodesRect, collapsed);
			return {
				id: createCanvasSubWorkflowGroupNodeId(host.id),
				type: CANVAS_SUBWORKFLOW_GROUP_TYPE,
				position: titleBar.position,
				width: titleBar.width,
				height: GROUP_HEADER_HEIGHT,
				draggable: false,
				selectable: collapsed,
				connectable: false,
				zIndex: -1,
				data: {
					group: { id: host.id, name: host.name, nodeIds: [] },
					nodesRect,
					isCollapsed: collapsed,
				},
			};
		}),
	);

	// Route the host node's external edges onto the group's border handles so the
	// group wires to neighbors as a black box. The host stays present but hidden, so
	// its edges still exist here to be rewritten to the group node id.
	function remapBoundaryConnections(connections: CanvasConnection[]): CanvasConnection[] {
		const hosts = hostNodeIds.value;
		if (hosts.size === 0) return connections;
		return connections.map((conn) => {
			const sourceIsHost = hosts.has(conn.source);
			const targetIsHost = hosts.has(conn.target);
			if (!sourceIsHost && !targetIsHost) return conn;
			const remapped = {
				source: sourceIsHost ? createCanvasSubWorkflowGroupNodeId(conn.source) : conn.source,
				sourceHandle: sourceIsHost ? CANVAS_NODE_GROUP_HANDLE_RIGHT : conn.sourceHandle,
				target: targetIsHost ? createCanvasSubWorkflowGroupNodeId(conn.target) : conn.target,
				targetHandle: targetIsHost ? CANVAS_NODE_GROUP_HANDLE_LEFT : conn.targetHandle,
			};
			return { ...conn, ...remapped, id: createCanvasConnectionId(remapped) };
		});
	}

	return { groupNodes, hostNodeIds, remapBoundaryConnections };
}
