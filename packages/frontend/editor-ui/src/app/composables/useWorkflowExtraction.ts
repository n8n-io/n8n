import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import {
	extractReferencesInNodeExpressions,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	NodeHelpers,
	EXECUTE_WORKFLOW_NODE_TYPE,
} from 'n8n-workflow';
import type {
	ExtractableSubgraphData,
	ExtractableErrorResult,
	IConnections,
	INode,
} from 'n8n-workflow';
import { useToast } from './useToast';
import { useRouter } from 'vue-router';
import { VIEWS, WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/app/constants';
import { useHistoryStore } from '@/app/stores/history.store';
import { UpdateNodeGroupCommand } from '@/app/models/history';
import { deleteGroupWithHistory } from '@/features/workflows/canvas/nodeGroups.utils';
import { useCanvasNodeGroupTelemetry } from '@/features/workflows/canvas/composables/useCanvasNodeGroupTelemetry';
import { useCanvasOperations } from './useCanvasOperations';
import { useSelectionValidation } from './useSelectionValidation';

import type { AddedNode, INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';
import { useI18n } from '@n8n/i18n';
import { PUSH_NODES_OFFSET } from '@/app/utils/nodeViewUtils';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useTelemetry } from './useTelemetry';
import { checkExhaustive } from '@/app/utils/typeGuards';
import isEqual from 'lodash/isEqual';
import uniq from 'lodash/uniq';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeConnections } from '../utils/workflowUtils';

const CANVAS_HISTORY_OPTIONS = {
	trackBulk: false,
	trackHistory: true,
};

export function useWorkflowExtraction() {
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const toast = useToast();
	const router = useRouter();
	const historyStore = useHistoryStore();
	const canvasOperations = useCanvasOperations();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const groupTelemetry = useCanvasNodeGroupTelemetry();
	const { expandSelectionWithSubNodes, isSelectionExtractable } = useSelectionValidation();

	function showError(message: string) {
		toast.showMessage({
			type: 'error',
			message,
			title: i18n.baseText('workflowExtraction.error.failure'),
			duration: 15 * 1000,
		});
	}

	function extractableErrorResultToMessage(result: ExtractableErrorResult) {
		switch (result.errorCode) {
			case 'Input Edge To Non-Root Node':
				return i18n.baseText('workflowExtraction.error.selectionGraph.inputEdgeToNonRoot', {
					interpolate: { node: result.node },
				});
			case 'Output Edge From Non-Leaf Node':
				return i18n.baseText('workflowExtraction.error.selectionGraph.outputEdgeFromNonLeaf', {
					interpolate: { node: result.node },
				});
			case 'Multiple Input Nodes':
				return i18n.baseText('workflowExtraction.error.selectionGraph.multipleInputNodes', {
					interpolate: { nodes: [...result.nodes].map((x) => `'${x}'`).join(', ') },
				});
			case 'Multiple Output Nodes':
				return i18n.baseText('workflowExtraction.error.selectionGraph.multipleOutputNodes', {
					interpolate: { nodes: [...result.nodes].map((x) => `'${x}'`).join(', ') },
				});
			case 'No Continuous Path From Root To Leaf In Selection':
				return i18n.baseText(
					'workflowExtraction.error.selectionGraph.noContinuousPathFromRootToLeaf',
					{ interpolate: { start: result.start, end: result.end } },
				);
		}
	}

	function makeExecuteWorkflowNode(
		workflowId: string,
		name: string,
		position: [number, number],
		variables: Map<string, string>,
	): Omit<INode, 'id'> {
		const variableEntries = [...variables.entries()];
		const variableNames = [...variables.keys()];

		return {
			parameters: {
				workflowId: {
					__rl: true,
					value: workflowId,
					mode: 'list',
				},
				workflowInputs: {
					mappingMode: 'defineBelow',
					value: Object.fromEntries(variableEntries.map(([k, v]) => [k, `={{ ${v} }}`])),
					matchingColumns: variableNames,
					schema: variableNames.map((x) => ({
						id: x,
						displayName: x,
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						removed: false,
						// omitted type implicitly uses our `any` type
					})),
					attemptToConvertTypes: false,
					convertFieldsToString: true,
				},
				options: {},
			},
			type: EXECUTE_WORKFLOW_NODE_TYPE,
			typeVersion: 1.2,
			position,
			name,
		};
	}

	function makeSubworkflow(
		newWorkflowName: string,
		{ start, end }: ExtractableSubgraphData,
		nodes: INodeUi[],
		connections: IConnections,
		selectionVariables: Map<string, string>,
		selectionChildrenVariables: Map<string, string>,
		startNodeName: string,
		returnNodeName: string,
	): WorkflowDataCreate {
		const newConnections = Object.fromEntries(
			Object.entries(connections).filter(([k]) => nodes.some((x) => x.name === k)),
		);
		if (end) {
			// this is necessary because the new workflow may crash looking for the
			// nodes in these connections
			delete newConnections[end];
		}

		const startNodeTarget = nodes.find((x) => x.name === start);
		const firstNode = startNodeTarget ?? nodes.sort((a, b) => a.position[1] - b.position[1])[0];
		const startNodePosition: [number, number] = [
			firstNode.position[0] - PUSH_NODES_OFFSET,
			firstNode.position[1],
		];

		const endNodeTarget = nodes.find((x) => x.name === end);
		const lastNode = endNodeTarget ?? nodes.sort((a, b) => b.position[1] - a.position[1])[0];
		const endNodePosition: [number, number] = [
			lastNode.position[0] + PUSH_NODES_OFFSET,
			lastNode.position[1],
		];

		const shouldInsertReturnNode = selectionChildrenVariables.size > 0;

		// Connect Start node to firstNode only if it accepts main input
		// Either because it's an explicit start target, or it accepts main connections
		const firstNodeType = nodeTypesStore.getNodeType(firstNode.type, firstNode.typeVersion);
		const shouldConnectStart =
			startNodeTarget !== undefined ||
			(firstNodeType && NodeHelpers.nodeAcceptsInputType(firstNodeType, 'main'));

		const startNodeConnection = shouldConnectStart
			? ({
					[startNodeName]: {
						main: [
							[
								{
									node: firstNode.name,
									type: 'main',
									index: 0,
								},
							],
						],
					},
				} satisfies IConnections)
			: {};

		const endNodeConnection =
			endNodeTarget && shouldInsertReturnNode
				? ({
						[endNodeTarget.name]: {
							main: [
								[
									{
										node: returnNodeName,
										type: 'main',
										index: 0,
									},
								],
							],
						},
					} satisfies IConnections)
				: {};

		const returnNode = shouldInsertReturnNode
			? [
					{
						parameters: {
							assignments: {
								assignments: [
									...selectionChildrenVariables.entries().map((x) => ({
										id: uuidv4(),
										name: x[0],
										value: `={{ ${x[1]} }}`,
										type: 'string',
									})),
								],
							},
							options: {},
						},
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: endNodePosition,
						id: uuidv4(),
						name: returnNodeName,
					} satisfies INode,
				]
			: [];
		const triggerParameters =
			selectionVariables.size === 0
				? {
						inputSource: 'passthrough',
					}
				: {
						workflowInputs: {
							values: [...selectionVariables.keys().map((k) => ({ name: k, type: 'any' }))],
						},
					};

		const triggerNode: INode = {
			id: uuidv4(),
			typeVersion: 1.1,
			name: startNodeName,
			type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
			position: startNodePosition,
			parameters: triggerParameters,
		};

		const result: WorkflowDataCreate = {
			name: newWorkflowName,
			nodes: [...nodes, ...returnNode, triggerNode],
			connections: {
				...newConnections,
				...startNodeConnection,
				...endNodeConnection,
			},
			settings: { executionOrder: 'v1' },
			projectId: workflowDocumentStore.value.homeProject?.id,
			parentFolderId: workflowDocumentStore.value.parentFolder?.id ?? undefined,
		};
		result.connections = sanitizeConnections(
			result.connections,
			result.nodes?.map((x) => x.name),
		);
		return result;
	}

	function computeAveragePosition(nodes: INode[]): [number, number] {
		const summedUp = nodes.reduce(
			(acc, v) => [acc[0] + v.position[0], acc[1] + v.position[1], acc[2] + 1],
			[0, 0, 0],
		);
		return [summedUp[0] / summedUp[2], summedUp[1] / summedUp[2]];
	}

	function getNonMainConnectionTargets(nodeName: string, connections: IConnections): string[] {
		const nodeConnections = connections[nodeName];
		if (!nodeConnections) return [];

		const targets: string[] = [];
		for (const [type, connectionsByOutputIndex] of Object.entries(nodeConnections)) {
			if (type === NodeConnectionTypes.Main) continue;

			for (const outputConnections of connectionsByOutputIndex) {
				for (const connection of outputConnections ?? []) {
					targets.push(connection.node);
				}
			}
		}

		return targets;
	}

	function getNodesToRemoveFromParent(
		extractedNodes: INodeUi[],
		connections: IConnections,
	): INodeUi[] {
		const extractedNodeNames = new Set(extractedNodes.map((node) => node.name));
		const nonMainTargetsByNodeName = new Map(
			extractedNodes.map((node) => [
				node.name,
				getNonMainConnectionTargets(node.name, connections),
			]),
		);
		const subNodeNames = new Set(
			[...nonMainTargetsByNodeName.entries()]
				.filter(([, targets]) => targets.some((target) => extractedNodeNames.has(target)))
				.map(([nodeName]) => nodeName),
		);

		const preservedNodeNames = new Set(
			[...subNodeNames].filter((nodeName) =>
				(nonMainTargetsByNodeName.get(nodeName) ?? []).some(
					(target) => !extractedNodeNames.has(target),
				),
			),
		);

		let didAddPreservedNode = true;
		while (didAddPreservedNode) {
			didAddPreservedNode = false;

			for (const nodeName of subNodeNames) {
				if (preservedNodeNames.has(nodeName)) continue;

				const shouldPreserve = (nonMainTargetsByNodeName.get(nodeName) ?? []).some((target) =>
					preservedNodeNames.has(target),
				);
				if (!shouldPreserve) continue;

				preservedNodeNames.add(nodeName);
				didAddPreservedNode = true;
			}
		}

		return extractedNodes.filter((node) => !preservedNodeNames.has(node.name));
	}

	async function tryCreateWorkflow(workflowData: WorkflowDataCreate): Promise<IWorkflowDb | null> {
		try {
			const createdWorkflow = await workflowsStore.createNewWorkflow(workflowData);

			try {
				await workflowsStore.publishWorkflow(createdWorkflow.id, {
					versionId: createdWorkflow.versionId,
				});
			} catch (activationError) {
				console.error('Failed to activate extracted sub-workflow:', activationError);
			}

			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: {
					workflowId: createdWorkflow.id,
				},
			});

			toast.showMessage({
				title: i18n.baseText('workflowExtraction.success.title'),
				message: i18n.baseText('workflowExtraction.success.message', {
					interpolate: { url: href },
				}),
				type: 'success',
				duration: 10 * 1000,
			});
			return createdWorkflow;
		} catch (e) {
			toast.showError(e, i18n.baseText('workflowExtraction.error.subworkflowCreationFailed'));
			return null;
		}
	}

	async function replaceParentSelectionWithSubworkflowNode(
		executeWorkflowNodeData: AddedNode,
		startId: string | undefined,
		endId: string | undefined,
		nodesToRemoveFromParent: INode[],
		rewrittenDownstreamNodes: INode[],
	) {
		historyStore.startRecordingUndo();

		uiStore.resetLastInteractedWith();

		const executeWorkflowNode = (
			await canvasOperations.addNodes([executeWorkflowNodeData], {
				...CANVAS_HISTORY_OPTIONS,
				forcePosition: true,
			})
		)[0];

		addReplacementNodeToCanvasGroup(
			nodesToRemoveFromParent.map((node) => node.id),
			executeWorkflowNode.id,
		);

		if (endId)
			canvasOperations.replaceNodeConnections(endId, executeWorkflowNode.id, {
				...CANVAS_HISTORY_OPTIONS,
				replaceInputs: false,
				validateNodeGroups: false,
			});

		if (startId)
			canvasOperations.replaceNodeConnections(startId, executeWorkflowNode.id, {
				...CANVAS_HISTORY_OPTIONS,
				replaceOutputs: false,
				validateNodeGroups: false,
			});

		canvasOperations.deleteNodes(
			nodesToRemoveFromParent.map((x) => x.id),
			CANVAS_HISTORY_OPTIONS,
		);

		for (const node of rewrittenDownstreamNodes) {
			const currentNode = workflowDocumentStore.value.allNodes.find((x) => x.id === node.id);

			if (isEqual(node, currentNode)) continue;

			canvasOperations.replaceNodeParameters(
				node.id,
				{ ...currentNode?.parameters },
				{ ...node.parameters },
				CANVAS_HISTORY_OPTIONS,
			);
		}

		uiStore.markStateDirty();
		historyStore.stopRecordingUndo();
	}

	function addReplacementNodeToCanvasGroup(removableNodeIds: string[], replacementNodeId: string) {
		const affectedGroupIds = uniq(
			removableNodeIds
				.map((nodeId) => workflowDocumentStore.value.getGroupForNode(nodeId)?.id)
				.filter((id): id is string => id !== undefined),
		);

		if (affectedGroupIds.length !== 1) return;

		const groupId = affectedGroupIds[0];
		const groupBeforeReplacements = workflowDocumentStore.value.getGroupById(groupId);
		if (!groupBeforeReplacements) return;

		const remainingGroupMembers = groupBeforeReplacements.nodeIds.filter(
			(id) => !removableNodeIds.includes(id),
		);

		// Whole group extracted: the only node left would be the Execute node. In this case, a single-node
		// group is invalid, so dissolve the group and leave the Execute node ungrouped.
		if (remainingGroupMembers.length === 0) {
			deleteGroupWithHistory(groupBeforeReplacements, workflowDocumentStore.value, historyStore);
			groupTelemetry.trackUngrouped(groupBeforeReplacements, 'sub-workflow-extraction');
			return;
		}

		workflowDocumentStore.value.addNodesToGroup(groupId, [replacementNodeId]);
		const groupAfterReplacements = workflowDocumentStore.value.getGroupById(groupId);
		if (groupAfterReplacements) {
			historyStore.pushCommandToUndo(
				new UpdateNodeGroupCommand(
					{ ...groupBeforeReplacements, nodeIds: [...groupBeforeReplacements.nodeIds] },
					{ ...groupAfterReplacements, nodeIds: [...groupAfterReplacements.nodeIds] },
					Date.now(),
				),
			);
		}
	}

	function tryExtractNodesIntoSubworkflow(nodeIds: string[]): boolean {
		const expandedNodeIds = expandSelectionWithSubNodes(nodeIds);
		const result = isSelectionExtractable(expandedNodeIds);

		if (!result.valid) {
			switch (result.reason) {
				case 'trigger-selected':
					showError(
						i18n.baseText('workflowExtraction.error.triggerSelected', {
							interpolate: {
								nodes: result.triggers.map((name) => `'${name}'`).join(', '),
							},
						}),
					);
					break;
				case 'invalid-subgraph':
					showError(
						i18n.baseText('workflowExtraction.error.selectionGraph.listHeader', {
							interpolate: {
								body: result.errors
									.map(extractableErrorResultToMessage)
									.map((x) => `- ${x}`)
									.join('<br>'),
							},
						}),
					);
					break;
				case 'multiple-input-branches':
					showError(
						i18n.baseText('workflowExtraction.error.inputNodeHasMultipleInputBranches', {
							interpolate: { node: result.node },
						}),
					);
					break;
				case 'multiple-output-branches':
					showError(
						i18n.baseText('workflowExtraction.error.outputNodeHasMultipleOutputBranches', {
							interpolate: { node: result.node },
						}),
					);
					break;
				default:
					checkExhaustive(result);
			}
			return false;
		}

		uiStore.openModalWithData({
			name: WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
			data: { subGraph: result.subGraph, selection: result.subGraphData },
		});
		return true;
	}

	async function doExtractNodesIntoSubworkflow(
		extractionBoundary: ExtractableSubgraphData,
		extractedNodes: INodeUi[],
		newWorkflowName: string,
	) {
		const { start, end } = extractionBoundary;

		const allNodeNames = workflowDocumentStore.value.allNodes.map((x) => x.name) ?? [];

		let startNodeName = 'Start';
		const extractedNodeNames = extractedNodes.map((x) => x.name);
		const nodesToRemoveFromParent = getNodesToRemoveFromParent(
			extractedNodes,
			workflowDocumentStore.value.connectionsBySourceNode,
		);
		const removedParentNodeNames = nodesToRemoveFromParent.map((node) => node.name);
		while (extractedNodeNames.includes(startNodeName)) startNodeName += '_1';

		let returnNodeName = 'Return';
		while (extractedNodeNames.includes(returnNodeName)) returnNodeName += '_1';

		const directAfterEndNodeNames = end
			? (workflowDocumentStore.value
					.getChildNodes(end, 'main', 1)
					.map((x) => workflowDocumentStore.value.getNodeByName(x)?.name)
					.filter((x) => x !== undefined) ?? [])
			: [];

		const allAfterEndNodes = end
			? (workflowDocumentStore.value
					.getChildNodes(end, 'ALL')
					.map((x) => workflowDocumentStore.value.getNodeByName(x) ?? null)
					.filter((x) => x !== null) ?? [])
			: [];

		const { nodes, variables } = extractReferencesInNodeExpressions(
			extractedNodes,
			allNodeNames,
			startNodeName,
			start ? [start] : undefined,
		);

		let executeWorkflowNodeName = `Call ${newWorkflowName}`;
		while (allNodeNames.includes(executeWorkflowNodeName)) executeWorkflowNodeName += '_1';

		const { nodes: afterNodes, variables: afterVariables } = extractReferencesInNodeExpressions(
			allAfterEndNodes,
			allAfterEndNodes.map((x) => x.name).concat(removedParentNodeNames),
			executeWorkflowNodeName,
			directAfterEndNodeNames,
		);

		const workflowData = makeSubworkflow(
			newWorkflowName,
			extractionBoundary,
			nodes,
			workflowDocumentStore.value?.connectionsBySourceNode,
			variables,
			afterVariables,
			startNodeName,
			returnNodeName,
		);
		const createdWorkflow = await tryCreateWorkflow(workflowData);
		if (createdWorkflow === null) return false;

		const executeWorkflowPosition = computeAveragePosition(
			nodesToRemoveFromParent.length > 0 ? nodesToRemoveFromParent : extractedNodes,
		);
		const executeWorkflowNode = makeExecuteWorkflowNode(
			createdWorkflow.id,
			executeWorkflowNodeName,
			executeWorkflowPosition,
			variables,
		);
		await replaceParentSelectionWithSubworkflowNode(
			executeWorkflowNode,
			nodesToRemoveFromParent.find((x) => x.name === start)?.id,
			nodesToRemoveFromParent.find((x) => x.name === end)?.id,
			nodesToRemoveFromParent,
			afterNodes,
		);

		return true;
	}

	function trackStartExtractWorkflow(nodeCount: number, success: boolean) {
		telemetry.track('User started nodes to sub-workflow extraction', {
			node_count: nodeCount,
			success,
		});
	}

	function trackExtractWorkflow(nodeCount: number, success: boolean) {
		telemetry.track('User extracted nodes to sub-workflow', {
			node_count: nodeCount,
			success,
		});
	}

	/**
	 * This mutates the current workflow and creates a new one.
	 * Intended to be called from @WorkflowExtractionNameModal spawned
	 * by @tryExtractNodesIntoSubworkflow
	 */
	async function extractNodesIntoSubworkflow(
		extractionBoundary: ExtractableSubgraphData,
		extractedNodes: INodeUi[],
		newWorkflowName: string,
	) {
		const success = await doExtractNodesIntoSubworkflow(
			extractionBoundary,
			extractedNodes,
			newWorkflowName,
		);
		trackExtractWorkflow(extractedNodes.length, success);
	}

	/**
	 * This starts the extraction process by checking whether the selection is extractable
	 * and spawning a pop up asking for a sub-workflow name.
	 * If confirmed, the modal calls @extractNodesIntoSubworkflow to handle the actual mutation
	 *
	 * @param nodeIds the ids to be extracted from the current workflow into a sub-workflow
	 */
	function extractWorkflow(nodeIds: string[]) {
		if (nodeIds.length === 0) return;

		const success = tryExtractNodesIntoSubworkflow(nodeIds);
		trackStartExtractWorkflow(nodeIds.length, success);
	}

	return {
		extractWorkflow,
		tryExtractNodesIntoSubworkflow,
		extractNodesIntoSubworkflow,
	};
}
