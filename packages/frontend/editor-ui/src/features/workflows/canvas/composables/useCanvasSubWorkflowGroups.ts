import { computed, ref, watch, type InjectionKey, type Ref } from 'vue';
import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import { EXECUTE_WORKFLOW_NODE_TYPE, getSubworkflowId, NodeConnectionTypes } from 'n8n-workflow';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type {
	CanvasConnection,
	CanvasConnectionPort,
	CanvasGroupNode,
	CanvasNodeData,
} from '../canvas.types';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	CANVAS_SUBWORKFLOW_GROUP_TYPE,
	CanvasNodeRenderType,
	createCanvasSubWorkflowGroupNodeId,
} from '../canvas.types';
import { GROUP_HEADER_HEIGHT } from '../stores/canvasNodeGroups.constants';
import { titleBarFromNodesRect } from './useCanvasMapping.groups';
import {
	createCanvasConnectionId,
	mapLegacyEndpointsToCanvasConnectionPort,
} from '../canvas.utils';

const PHANTOM_NODE_SIZE = { width: 100, height: 100 };
const COLLAPSED_INTERIOR = { width: 200, height: 120 };

// Lets the shared group shell toggle sub-workflow expansion, which is tracked
// separately from real-group view state.
export interface SubWorkflowGroupView {
	isExpanded: (hostNodeId: string) => boolean;
	toggle: (hostNodeId: string) => void;
}
export const SubWorkflowGroupViewKey: InjectionKey<SubWorkflowGroupView> =
	Symbol('SubWorkflowGroupView');

// Phantom id and name are namespaced per host so they can't collide with real
// nodes — connections are keyed by name, so a shared name would rewire real edges.
// The original name is restored for display via `phantomDisplayName`.
const PHANTOM_NAME_PREFIX = /^sub:[^:]+:/;
const phantomId = (hostId: string, subNodeId: string) => `sub:${hostId}:${subNodeId}`;
const phantomName = (hostId: string, subNodeName: string) => `sub:${hostId}:${subNodeName}`;

export function phantomDisplayName(name: string): string {
	return name.replace(PHANTOM_NAME_PREFIX, '');
}

function eligibleWorkflowId(node: INodeUi): string | undefined {
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE) return undefined;
	const id = getSubworkflowId(node);
	return id && !id.startsWith('=') ? id : undefined;
}

type Interior = {
	nodes: INodeUi[];
	connections: IConnections;
	rect: { width: number; height: number };
};

export function useCanvasSubWorkflowGroups(deps: {
	nodes: Ref<INodeUi[]>;
	isGroupExpanded: (hostNodeId: string) => boolean;
	getCurrentWorkflowId: () => string | undefined;
}) {
	const workflowsListStore = useWorkflowsListStore();
	const nodeTypesStore = useNodeTypesStore();

	const eligibleHosts = computed(() => {
		const currentWorkflowId = deps.getCurrentWorkflowId();
		return deps.nodes.value.filter((n) => {
			const targetId = eligibleWorkflowId(n);
			// Skip self-references (calling the current workflow) / inline sub-workflows
			return targetId !== undefined && targetId !== currentWorkflowId;
		});
	});
	const hostNodeIds = computed(() => new Set(eligibleHosts.value.map((h) => h.id)));

	const expandedHosts = computed(() =>
		eligibleHosts.value.filter((h) => deps.isGroupExpanded(h.id)),
	);

	// Fetched sub-workflow interiors, keyed by host node id. Positions are anchored
	// to the host so the interior's top-left sits at the host position.
	const interiorByHost = ref(new Map<string, Interior>());

	watch(
		expandedHosts,
		async (hosts) => {
			for (const host of hosts) {
				if (interiorByHost.value.has(host.id)) continue;
				const workflowId = eligibleWorkflowId(host);
				if (!workflowId) continue;
				try {
					const wf = await workflowsListStore.fetchWorkflow(workflowId);
					const minX = Math.min(0, ...wf.nodes.map((n) => n.position[0]));
					const minY = Math.min(0, ...wf.nodes.map((n) => n.position[1]));
					const [hx, hy] = host.position;
					const nodes: INodeUi[] = wf.nodes.map((n) => ({
						...n,
						id: phantomId(host.id, n.id),
						name: phantomName(host.id, n.name),
						position: [hx + (n.position[0] - minX), hy + (n.position[1] - minY)],
						draggable: false,
					}));
					// Remap connection keys and targets to the namespaced names.
					const connections: IConnections = {};
					for (const [source, byType] of Object.entries(wf.connections)) {
						const remappedByType: IConnections[string] = {};
						for (const [type, outputs] of Object.entries(byType)) {
							remappedByType[type] = outputs.map((conns) =>
								conns ? conns.map((c) => ({ ...c, node: phantomName(host.id, c.node) })) : conns,
							);
						}
						connections[phantomName(host.id, source)] = remappedByType;
					}
					const width =
						Math.max(0, ...nodes.map((n) => n.position[0] - hx)) + PHANTOM_NODE_SIZE.width;
					const height =
						Math.max(0, ...nodes.map((n) => n.position[1] - hy)) + PHANTOM_NODE_SIZE.height;
					interiorByHost.value.set(host.id, {
						nodes,
						connections,
						rect: { width, height },
					});
					interiorByHost.value = new Map(interiorByHost.value);
				} catch {
					// Missing workflow / no access — leave the frame empty.
				}
			}
		},
		{ immediate: true },
	);

	const phantomNodes = computed(() =>
		expandedHosts.value.flatMap((h) => interiorByHost.value.get(h.id)?.nodes ?? []),
	);

	const phantomConnections = computed(() => {
		const out: IConnections = {};
		for (const h of expandedHosts.value) {
			Object.assign(out, interiorByHost.value.get(h.id)?.connections ?? {});
		}
		return out;
	});

	const phantomById = computed(() => {
		const map = new Map<string, INodeUi>();
		for (const n of phantomNodes.value) map.set(n.id, n);
		return map;
	});

	// Phantom nodes aren't in the document store, so their render data (icon/type
	// and input/output ports) must be provided explicitly for the canvas to render
	// them with proper handles. Ports resolve from the node type's static endpoints;
	// expression-based endpoints fall back to a single main port.
	const phantomRenderById = computed(() => {
		const map = new Map<string, CanvasNodeData['render']>();
		for (const node of phantomNodes.value) {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			map.set(node.id, {
				type: CanvasNodeRenderType.Default,
				options: {
					trigger: nodeType?.group?.includes('trigger') ?? false,
					icon: getNodeIconSource(nodeType, node, null),
				},
			});
		}
		return map;
	});

	function portsFor(node: INodeUi, kind: 'inputs' | 'outputs'): CanvasConnectionPort[] {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		const endpoints = kind === 'outputs' ? nodeType?.outputs : nodeType?.inputs;
		const names = (kind === 'outputs' ? nodeType?.outputNames : nodeType?.inputNames) ?? [];
		return mapLegacyEndpointsToCanvasConnectionPort(
			Array.isArray(endpoints) ? endpoints : [NodeConnectionTypes.Main],
			names,
		);
	}

	const phantomInputsById = computed(() => {
		const map = new Map<string, CanvasConnectionPort[]>();
		for (const node of phantomNodes.value) map.set(node.id, portsFor(node, 'inputs'));
		return map;
	});
	const phantomOutputsById = computed(() => {
		const map = new Map<string, CanvasConnectionPort[]>();
		for (const node of phantomNodes.value) map.set(node.id, portsFor(node, 'outputs'));
		return map;
	});

	const groupNodes = computed<CanvasGroupNode[]>(() =>
		eligibleHosts.value.map((host) => {
			const collapsed = !deps.isGroupExpanded(host.id);
			const interior = collapsed
				? COLLAPSED_INTERIOR
				: (interiorByHost.value.get(host.id)?.rect ?? COLLAPSED_INTERIOR);
			// `titleBarFromNodesRect` derives the title bar position from x/y only, so
			// anchoring x/y to the host keeps the frame in place across collapse/expand.
			const nodesRect = {
				x: host.position[0],
				y: host.position[1],
				width: interior.width,
				height: interior.height,
			};
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

	// Expanded groups expressed as IWorkflowGroup-shaped entries (members = phantom
	// ids) so they can drive the existing repositioning algorithm.
	const layoutGroups = computed(() =>
		expandedHosts.value
			.map((host) => ({
				id: host.id,
				name: host.name,
				nodeIds: interiorByHost.value.get(host.id)?.nodes.map((n) => n.id) ?? [],
			}))
			.filter((group) => group.nodeIds.length > 0),
	);

	return {
		groupNodes,
		hostNodeIds,
		layoutGroups,
		phantomNodes,
		phantomConnections,
		phantomById,
		phantomRenderById,
		phantomInputsById,
		phantomOutputsById,
		remapBoundaryConnections,
	};
}
