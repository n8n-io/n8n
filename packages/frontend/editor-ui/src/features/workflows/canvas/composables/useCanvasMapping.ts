/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { useI18n } from '@n8n/i18n';
import type { CanvasRenderData } from '../canvas.utils';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type {
	CanvasConnection,
	CanvasConnectionData,
	CanvasNode,
	CanvasNodeData,
	NodeExecutionSnapshot,
} from '../canvas.types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../canvas.types';
import type { CanvasNodeGroupView } from './useCanvasNodeGroupView';
import {
	buildCollapsedGroupByNodeId,
	remapCollapsedGroupConnections,
} from './useCanvasMapping.groups';
import {
	computeNodeDisplaySize,
	mapLegacyConnectionsToCanvasConnections,
	parseCanvasConnectionHandleString,
} from '../canvas.utils';
import type { IConnections, ITaskData, IWorkflowGroup } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { MarkerType } from '@vue-flow/core';
import type { Connection } from '@vue-flow/core';
import * as workflowUtils from 'n8n-workflow/common';

// Highest priority first — single source of precedence for connection status.
const CONNECTION_STATUS_PRIORITY = ['running', 'pinned', 'error', 'success'] as const;

/**
 * Maps workflow nodes and connections into the vue-flow canvas shape.
 *
 * All per-node-id projections (subtitle, validation errors, execution status,
 * render type, sticky-note z-index, etc.) live on `renderData`, produced by
 * `useWorkflowDocumentRenderData`. This composable is the final glue layer —
 * it reads from `renderData` and `connections` to assemble `CanvasNode` and
 * `CanvasConnection` objects.
 */
export function useCanvasMapping({
	nodes,
	connections,
	renderData,
	allGroups = ref([]),
	nodeGroupView,
	isExperimentalNdvActive = ref(false),
}: {
	nodes: Ref<INodeUi[]>;
	connections: Ref<IConnections>;
	renderData: Ref<CanvasRenderData>;
	allGroups?: Ref<IWorkflowGroup[]>;
	nodeGroupView?: CanvasNodeGroupView;
	isExperimentalNdvActive?: Ref<boolean>;
}) {
	const i18n = useI18n();

	// `executionIssuesByNodeName` is keyed by name; groups address nodes by id.
	const nodeNameById = computed(() => {
		const map = new Map<string, string>();
		for (const node of nodes.value) map.set(node.id, node.name);
		return map;
	});

	function countNonCanceledIterations(tasks: ITaskData[] | null | undefined): number {
		if (!tasks) return 0;
		let count = 0;
		for (const task of tasks) {
			if (task.executionStatus !== 'canceled') count++;
		}
		return count;
	}

	// Per-node execution projection feeding the group-status aggregation.
	function getNodeExecutionSnapshot(id: string): NodeExecutionSnapshot {
		const rd = renderData.value;
		const render = rd.renderTypeByNodeId.get(id)?.value;
		const name = nodeNameById.value.get(id);
		const status = rd.executionStatusByNodeId.get(id)?.value;
		const tasks = rd.executionRunDataByNodeId.get(id)?.value;

		// Mirror the single-node `computeHasIssues`
		const executionIssues = name ? rd.executionIssuesByNodeName.get(name)?.value : undefined;
		const hasExecutionError =
			status === 'error' ||
			status === 'crashed' ||
			(executionIssues?.length ?? 0) > 0 ||
			Boolean(tasks?.at(-1)?.error);

		return {
			running: rd.executionRunningByNodeId.get(id)?.value ?? false,
			waitingForNext: rd.executionWaitingForNextByNodeId.get(id)?.value ?? false,
			waiting: rd.executionWaitingByNodeId.get(id)?.value,
			hasExecutionError,
			hasValidationError: (rd.validationErrorsByNodeId.get(id)?.value?.length ?? 0) > 0,
			status,
			dirty:
				render?.type === CanvasNodeRenderType.Default && render.options.dirtiness !== undefined,
			iterations: countNonCanceledIterations(tasks),
		};
	}

	// Node id → its collapsed group, for nodes hidden by a collapsed group.
	const collapsedGroupByNodeId = computed<Map<string, IWorkflowGroup>>(() => {
		if (!nodeGroupView) return new Map();
		return buildCollapsedGroupByNodeId(allGroups.value, (id) => nodeGroupView.isGroupCollapsed(id));
	});

	// Display size by node id. WorkflowCanvas uses this for group bounds so
	// they wrap each node's actual rendered size. Sticky notes are omitted —
	// their own width/height parameters are read by the group mapper directly.
	const nodeDisplaySizeById = computed(() => {
		const rd = renderData.value;
		const dimensionsById: Record<string, { width: number; height: number }> = {};

		for (const node of nodes.value) {
			const render = rd.renderTypeByNodeId.get(node.id)?.value;

			if (render?.type !== CanvasNodeRenderType.Default) continue;

			dimensionsById[node.id] = computeNodeDisplaySize(
				node.id,
				render.options,
				rd,
				isExperimentalNdvActive.value,
			);
		}
		return dimensionsById;
	});

	const mappedNodes = computed<CanvasNode[]>(() => {
		const connectionsBySourceNode = connections.value;
		const connectionsByDestinationNode =
			workflowUtils.mapConnectionsByDestination(connectionsBySourceNode);
		const rd = renderData.value;
		const additionalProperties = rd.additionalPropertiesByNodeId.value;

		return nodes.value.map<CanvasNode>((node) => {
			const outputConnections = connectionsBySourceNode[node.name] ?? {};
			const inputConnections = connectionsByDestinationNode[node.name] ?? {};

			const runData = rd.executionRunDataByNodeId.get(node.id)?.value ?? null;
			const executionSnapshot = getNodeExecutionSnapshot(node.id);

			const data: CanvasNodeData = {
				id: node.id,
				name: node.name,
				subtitle: rd.subtitleByNodeId.get(node.id)?.value ?? '',
				type: node.type,
				typeVersion: node.typeVersion,
				disabled: node.disabled,
				connections: {
					[CanvasConnectionMode.Input]: inputConnections,
					[CanvasConnectionMode.Output]: outputConnections,
				},
				issues: {
					validation: rd.validationErrorsByNodeId.get(node.id)?.value ?? [],
					visible: rd.hasIssuesByNodeId.get(node.id)?.value ?? false,
				},
				execution: {
					status: executionSnapshot.status,
					waiting: executionSnapshot.waiting,
					waitingForNext: executionSnapshot.waitingForNext,
					running: executionSnapshot.running,
				},
				runData: {
					outputMap: rd.executionRunDataOutputMapByNodeId.get(node.id),
					iterations: executionSnapshot.iterations,
					visible: !!runData,
				},
				render:
					rd.renderTypeByNodeId.get(node.id)?.value ??
					({ type: node.type, options: {} } as CanvasNodeData['render']),
			};
			const offset = nodeGroupView?.getVisualOffsetForNode(node.id) ?? { x: 0, y: 0 };

			return {
				id: node.id,
				label: node.name,
				type: 'canvas-node',
				position: { x: node.position[0] + offset.x, y: node.position[1] + offset.y },
				data,
				...additionalProperties[node.id],
				draggable: node.draggable,
				hidden: collapsedGroupByNodeId.value.has(node.id) ? true : undefined,
			};
		});
	});

	const mappedConnections = computed<CanvasConnection[]>(() => {
		const raw = mapLegacyConnectionsToCanvasConnections(connections.value ?? [], nodes.value ?? []);
		const remapped = remapCollapsedGroupConnections(raw, collapsedGroupByNodeId.value);
		return remapped.map((connection) => ({
			...connection,
			data: getConnectionData(connection),
			type: 'canvas-edge',
			label: getConnectionLabel(connection),
			markerEnd: MarkerType.ArrowClosed,
		}));
	});

	function getConnectionStatus(connection: Connection): CanvasConnectionData['status'] {
		const rd = renderData.value;
		const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);

		const runData = rd.executionRunDataOutputMapByNodeId.get(connection.source)?.[type]?.[index];
		const runDataTotal = runData?.total ?? 0;

		const sourceTasks = rd.executionRunDataByNodeId.get(connection.source)?.value;
		let lastSourceTask: ITaskData | undefined = sourceTasks?.[sourceTasks.length - 1];
		if (lastSourceTask?.executionStatus === 'canceled' && sourceTasks && sourceTasks.length > 1) {
			lastSourceTask = sourceTasks[sourceTasks.length - 2];
		}

		// Non-main connections (model, memory, tool) are passive — count as
		// executed only if the target node also ran.
		const targetExecuted =
			type === NodeConnectionTypes.Main ||
			Boolean(rd.executionRunDataByNodeId.get(connection.target)?.value);

		const matches: Record<(typeof CONNECTION_STATUS_PRIORITY)[number], boolean> = {
			running:
				(rd.executionRunningByNodeId.get(connection.source)?.value ?? false) && runDataTotal === 0,
			pinned: Boolean(rd.pinnedDataByNodeId.get(connection.source)?.value && sourceTasks),
			error: rd.hasIssuesByNodeId.get(connection.source)?.value ?? false,
			success: runDataTotal > 0 && lastSourceTask?.executionStatus !== 'canceled' && targetExecuted,
		};

		return CONNECTION_STATUS_PRIORITY.find((status) => matches[status]);
	}

	function getConnectionData(connection: CanvasConnection): CanvasConnectionData {
		const rd = renderData.value;
		// For edges remapped to `group:*` ids, the real endpoints live on
		// `data.canonicals` (multiple when same-endpoint edges were merged).
		// The edge surfaces the highest-priority status among them.
		const canonicals: Connection[] = connection.data?.canonicals ?? [connection];

		let status: CanvasConnectionData['status'];
		if (canonicals.length === 1) {
			status = getConnectionStatus(canonicals[0]);
		} else {
			const statuses = canonicals.map(getConnectionStatus);
			status = CONNECTION_STATUS_PRIORITY.find((s) => statuses.includes(s));
		}

		const { source: sourceNodeId, target: targetNodeId, sourceHandle } = canonicals[0];
		const { type } = parseCanvasConnectionHandleString(sourceHandle);

		const sourceInputs = rd.nodeInputsByNodeId.get(sourceNodeId)?.value ?? [];
		const targetInputs = rd.nodeInputsByNodeId.get(targetNodeId)?.value ?? [];
		const maxConnections = [...sourceInputs, ...targetInputs]
			.filter((port) => port.type === type)
			.reduce<number | undefined>((acc, port) => {
				if (port.maxConnections === undefined) return acc;
				return Math.min(acc ?? Infinity, port.maxConnections);
			}, undefined);

		return {
			...(connection.data as CanvasConnectionData),
			...(maxConnections ? { maxConnections } : {}),
			status,
		};
	}

	function getConnectionLabel(connection: CanvasConnection): string {
		const rd = renderData.value;
		// For edges remapped to `group:*` ids, the real endpoints live on
		// `data.canonicals`; the label describes the underlying node, like the status.
		const {
			source: sourceId,
			target: targetId,
			sourceHandle,
		} = connection.data?.canonicals?.[0] ?? connection;

		const pinned = rd.pinnedDataByNodeId.get(sourceId)?.value;
		if (pinned) {
			const pinnedDataCount = pinned.length;
			return pinnedDataCount > 0
				? i18n.baseText('ndv.output.items', {
						adjustToNumber: pinnedDataCount,
						interpolate: { count: String(pinnedDataCount) },
					})
				: '';
		}

		const sourceRunData = rd.executionRunDataByNodeId.get(sourceId)?.value;
		if (!sourceRunData) return '';

		const { type, index } = parseCanvasConnectionHandleString(sourceHandle);
		const outputMap = rd.executionRunDataOutputMapByNodeId.get(sourceId);
		const outputData = outputMap?.[type]?.[index];

		const isMainConnection = type === NodeConnectionTypes.Main;
		const targetRunData = rd.executionRunDataByNodeId.get(targetId)?.value;

		// Non-main connections (AI tool/memory/embedding) track per-target counts
		// when the target has run data; otherwise stay quiet.
		if (!isMainConnection && outputData?.byTarget) {
			const targetData = outputData.byTarget[targetId];
			if (targetData && targetData.total > 0 && targetRunData) {
				return i18n.baseText(
					targetData.iterations > 1 ? 'ndv.output.itemsTotal' : 'ndv.output.items',
					{
						adjustToNumber: targetData.total,
						interpolate: { count: String(targetData.total) },
					},
				);
			}
			return '';
		}

		const runDataTotal = outputData?.total ?? 0;
		const hasMultipleRunDataIterations = (outputData?.iterations ?? 1) > 1;

		return runDataTotal > 0 && (isMainConnection || targetRunData)
			? i18n.baseText(hasMultipleRunDataIterations ? 'ndv.output.itemsTotal' : 'ndv.output.items', {
					adjustToNumber: runDataTotal,
					interpolate: { count: String(runDataTotal) },
				})
			: '';
	}

	return {
		nodes: mappedNodes,
		connections: mappedConnections,
		nodeDisplaySizeById,
		getNodeExecutionSnapshot,
	};
}
