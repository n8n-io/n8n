/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { useI18n } from '@n8n/i18n';
import type { CanvasRenderData } from '../canvas.utils';
import type { Ref } from 'vue';
import { computed } from 'vue';
import type {
	CanvasConnection,
	CanvasConnectionData,
	CanvasNode,
	CanvasNodeData,
} from '../canvas.types';
import { CanvasConnectionMode } from '../canvas.types';
import {
	mapLegacyConnectionsToCanvasConnections,
	parseCanvasConnectionHandleString,
} from '../canvas.utils';
import type { IConnections, ITaskData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { MarkerType } from '@vue-flow/core';
import * as workflowUtils from 'n8n-workflow/common';

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
}: {
	nodes: Ref<INodeUi[]>;
	connections: Ref<IConnections>;
	renderData: Ref<CanvasRenderData>;
}) {
	const i18n = useI18n();

	function filterOutCanceled(tasks: ITaskData[] | null): ITaskData[] | null {
		if (!tasks) return null;
		return tasks.filter((task) => task.executionStatus !== 'canceled');
	}

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
					status: rd.executionStatusByNodeId.get(node.id)?.value,
					waiting: rd.executionWaitingByNodeId.get(node.id)?.value,
					waitingForNext: rd.executionWaitingForNextByNodeId.get(node.id)?.value ?? false,
					running: rd.executionRunningByNodeId.get(node.id)?.value ?? false,
				},
				runData: {
					outputMap: rd.executionRunDataOutputMapByNodeId.get(node.id),
					iterations: filterOutCanceled(runData)?.length ?? 0,
					visible: !!runData,
				},
				render:
					rd.renderTypeByNodeId.get(node.id)?.value ??
					({ type: node.type, options: {} } as CanvasNodeData['render']),
			};

			return {
				id: node.id,
				label: node.name,
				type: 'canvas-node',
				position: { x: node.position[0], y: node.position[1] },
				data,
				...additionalProperties[node.id],
				draggable: node.draggable,
			};
		});
	});

	const mappedConnections = computed<CanvasConnection[]>(() => {
		return mapLegacyConnectionsToCanvasConnections(connections.value ?? [], nodes.value ?? []).map(
			(connection) => ({
				...connection,
				data: getConnectionData(connection),
				type: 'canvas-edge',
				label: getConnectionLabel(connection),
				markerEnd: MarkerType.ArrowClosed,
			}),
		);
	});

	function getConnectionData(connection: CanvasConnection): CanvasConnectionData {
		const rd = renderData.value;
		const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);
		const outputMap = rd.executionRunDataOutputMapByNodeId.get(connection.source);
		const runData = outputMap?.[type]?.[index];
		const runDataTotal = runData?.total ?? 0;

		const sourceTasks = rd.executionRunDataByNodeId.get(connection.source)?.value ?? [];
		let lastSourceTask: ITaskData | undefined = sourceTasks[sourceTasks.length - 1];
		if (lastSourceTask?.executionStatus === 'canceled' && sourceTasks.length > 1) {
			lastSourceTask = sourceTasks[sourceTasks.length - 2];
		}

		const sourcePinned = rd.pinnedDataByNodeId.get(connection.source)?.value;
		const sourceRunData = rd.executionRunDataByNodeId.get(connection.source)?.value;
		const targetRunData = rd.executionRunDataByNodeId.get(connection.target)?.value;
		const sourceRunning = rd.executionRunningByNodeId.get(connection.source)?.value ?? false;
		const sourceHasIssues = rd.hasIssuesByNodeId.get(connection.source)?.value ?? false;

		let status: CanvasConnectionData['status'];
		if (sourceRunning && runDataTotal === 0) {
			status = 'running';
		} else if (sourcePinned && sourceRunData) {
			status = 'pinned';
		} else if (sourceHasIssues) {
			status = 'error';
		} else if (runDataTotal > 0 && lastSourceTask?.executionStatus !== 'canceled') {
			// Non-main connections (model/memory/tool) are passive — only mark
			// success when the target node also produced run data.
			const isMainConnection = type === NodeConnectionTypes.Main;
			if (isMainConnection || targetRunData) {
				status = 'success';
			}
		}

		const sourceInputs = rd.nodeInputsByNodeId.get(connection.source)?.value ?? [];
		const targetInputs = rd.nodeInputsByNodeId.get(connection.target)?.value ?? [];
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
		const sourceId = connection.source;

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

		const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);
		const outputMap = rd.executionRunDataOutputMapByNodeId.get(sourceId);
		const outputData = outputMap?.[type]?.[index];

		const isMainConnection = type === NodeConnectionTypes.Main;
		const targetRunData = rd.executionRunDataByNodeId.get(connection.target)?.value;

		// Non-main connections (AI tool/memory/embedding) track per-target counts
		// when the target has run data; otherwise stay quiet.
		if (!isMainConnection && outputData?.byTarget) {
			const targetData = outputData.byTarget[connection.target];
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
	};
}
