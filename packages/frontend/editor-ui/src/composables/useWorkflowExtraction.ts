import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	buildAdjacencyList,
	parseExtractableSubgraphSelection,
	extractReferencesInNodeExpressions,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	NodeHelpers,
} from 'n8n-workflow';
import type {
	ExtractableSubgraphData,
	ExtractableErrorResult,
	IConnections,
	INode,
	Workflow,
} from 'n8n-workflow';
import { computed } from 'vue';
import { useToast } from './useToast';
import { useRouter } from 'vue-router';
import { VIEWS, WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/constants';
import { useHistoryStore } from '@/stores/history.store';
import { useCanvasOperations } from './useCanvasOperations';

import type { AddedNode, INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';
import { useI18n } from '@n8n/i18n';
import { PUSH_NODES_OFFSET } from '@/utils/nodeViewUtils';
import { useUIStore } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useTelemetry } from './useTelemetry';
import isEqual from 'lodash/isEqual';
import { v4 as uuidv4 } from 'uuid';

const CANVAS_HISTORY_OPTIONS = {
	trackBulk: false,
	trackHistory: true,
};

export function useWorkflowExtraction() {
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();
	const router = useRouter();
	const historyStore = useHistoryStore();
	const canvasOperations = useCanvasOperations();
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const adjacencyList = computed(() => buildAdjacencyList(workflowsStore.workflow.connections));

	const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

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
		return {
			parameters: {
				workflowId: {
					__rl: true,
					value: workflowId,
					mode: 'list',
				},
				workflowInputs: {
					mappingMode: 'defineBelow',
					value: Object.fromEntries(variables.entries().map(([k, v]) => [k, `={{ ${v} }}`])),
					matchingColumns: [...variables.keys()],
					schema: [
						...variables.keys().map((x) => ({
							id: x,
							displayName: x,
							required: false,
							defaultMatch: false,
							display: true,
							canBeUsedToMatch: true,
							removed: false,
							// omitted type implicitly uses our `any` type
						})),
					],
					attemptToConvertTypes: false,
					convertFieldsToString: true,
				},
				options: {},
			},
			type: 'n8n-nodes-base.executeWorkflow',
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

		const startNodeConnection = startNodeTarget
			? ({
					[startNodeName]: {
						main: [
							[
								{
									node: startNodeTarget.name,
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
			selectionVariables.size > 0
				? {
						workflowInputs: {
							values: [...selectionVariables.keys().map((k) => ({ name: k, type: 'any' }))],
						},
					}
				: {
						inputSource: 'passthrough',
					};

		const triggerNode: INode = {
			id: uuidv4(),
			typeVersion: 1.1,
			name: startNodeName,
			type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
			position: startNodePosition,
			parameters: triggerParameters,
		};

		return {
			name: newWorkflowName,
			nodes: [...nodes, ...returnNode, triggerNode],
			connections: {
				...newConnections,
				...startNodeConnection,
				...endNodeConnection,
			},
			settings: { executionOrder: 'v1' },
			projectId: workflowsStore.workflow.homeProject?.id,
			parentFolderId: workflowsStore.workflow.parentFolder?.id ?? undefined,
		};
	}

	function computeAveragePosition(nodes: INode[]): [number, number] {
		const summedUp = nodes.reduce(
			(acc, v) => [acc[0] + v.position[0], acc[1] + v.position[1], acc[2] + 1],
			[0, 0, 0],
		);
		return [summedUp[0] / summedUp[2], summedUp[1] / summedUp[2]];
	}

	async function tryCreateWorkflow(workflowData: WorkflowDataCreate): Promise<IWorkflowDb | null> {
		try {
			const createdWorkflow = await workflowsStore.createNewWorkflow(workflowData);

			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: {
					name: createdWorkflow.id,
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

	function checkExtractableSelectionValidity(
		selection: ReturnType<typeof parseExtractableSubgraphSelection>,
	): selection is ExtractableSubgraphData {
		if (Array.isArray(selection)) {
			showError(
				i18n.baseText('workflowExtraction.error.selectionGraph.listHeader', {
					interpolate: {
						body: selection
							.map(extractableErrorResultToMessage)
							.map((x) => `- ${x}`)
							.join('<br>'),
					},
				}),
			);
			return false;
		}
		const { start, end } = selection;

		const isSingleIO = (
			nodeName: string,
			getIOs: (
				...x: Parameters<typeof NodeHelpers.getNodeInputs>
			) => ReturnType<typeof NodeHelpers.getNodeInputs>,
		) => {
			const node = workflowsStore.getNodeByName(nodeName);
			if (!node) return true; // invariant broken -> abort onto error path
			const nodeType = useNodeTypesStore().getNodeType(node.type, node.typeVersion);
			if (!nodeType) return true; // invariant broken -> abort onto error path

			const ios = getIOs(workflowObject.value, node, nodeType);
			return (
				ios.filter((x) => (typeof x === 'string' ? x === 'main' : x.type === 'main')).length <= 1
			);
		};

		if (start && !isSingleIO(start, NodeHelpers.getNodeInputs)) {
			showError(
				i18n.baseText('workflowExtraction.error.inputNodeHasMultipleInputBranches', {
					interpolate: { node: start },
				}),
			);
			return false;
		}
		if (end && !isSingleIO(end, NodeHelpers.getNodeOutputs)) {
			showError(
				i18n.baseText('workflowExtraction.error.outputNodeHasMultipleOutputBranches', {
					interpolate: { node: end },
				}),
			);
			return false;
		}

		// Returns an array of errors
		return !Array.isArray(selection);
	}

	async function replaceSelectionWithNode(
		executeWorkflowNodeData: AddedNode,
		startId: string | undefined,
		endId: string | undefined,
		selection: INode[],
		selectionChildNodes: INode[],
	) {
		historyStore.startRecordingUndo();

		// In most cases we're about to move the selection anyway
		// One remarkable edge case is when a single node is right-clicked on
		// This allows extraction, but does not necessarily select the node
		uiStore.resetLastInteractedWith();

		const executeWorkflowNode = (
			await canvasOperations.addNodes([executeWorkflowNodeData], {
				...CANVAS_HISTORY_OPTIONS,
				forcePosition: true,
			})
		)[0];

		if (endId)
			canvasOperations.replaceNodeConnections(endId, executeWorkflowNode.id, {
				...CANVAS_HISTORY_OPTIONS,
				replaceInputs: false,
			});

		if (startId)
			canvasOperations.replaceNodeConnections(startId, executeWorkflowNode.id, {
				...CANVAS_HISTORY_OPTIONS,
				replaceOutputs: false,
			});

		canvasOperations.deleteNodes(
			selection.map((x) => x.id),
			CANVAS_HISTORY_OPTIONS,
		);

		for (const node of selectionChildNodes) {
			const currentNode = workflowsStore.workflow.nodes.find((x) => x.id === node.id);

			if (isEqual(node, currentNode)) continue;

			canvasOperations.replaceNodeParameters(
				node.id,
				{ ...currentNode?.parameters },
				{ ...node.parameters },
				CANVAS_HISTORY_OPTIONS,
			);
		}

		uiStore.stateIsDirty = true;
		historyStore.stopRecordingUndo();
	}

	function tryExtractNodesIntoSubworkflow(nodeIds: string[]): boolean {
		const subGraph = nodeIds.map(workflowsStore.getNodeById).filter((x) => x !== undefined);

		const triggers = subGraph.filter((x) =>
			useNodeTypesStore().getNodeType(x.type, x.typeVersion)?.group.includes('trigger'),
		);
		if (triggers.length > 0) {
			showError(
				i18n.baseText('workflowExtraction.error.triggerSelected', {
					interpolate: { nodes: triggers.map((x) => `'${x.name}'`).join(', ') },
				}),
			);
			return false;
		}

		const selection = parseExtractableSubgraphSelection(
			new Set(subGraph.map((x) => x.name)),
			adjacencyList.value,
		);

		if (!checkExtractableSelectionValidity(selection)) return false;

		uiStore.openModalWithData({
			name: WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
			data: { subGraph, selection },
		});
		return true;
	}

	async function doExtractNodesIntoSubworkflow(
		selection: ExtractableSubgraphData,
		subGraph: INodeUi[],
		newWorkflowName: string,
	) {
		const { start, end } = selection;

		const allNodeNames = workflowsStore.workflow.nodes.map((x) => x.name);

		let startNodeName = 'Start';
		const subGraphNames = subGraph.map((x) => x.name);
		while (subGraphNames.includes(startNodeName)) startNodeName += '_1';

		let returnNodeName = 'Return';
		while (subGraphNames.includes(returnNodeName)) returnNodeName += '_1';

		const directAfterEndNodeNames = end
			? workflowObject.value
					.getChildNodes(end, 'main', 1)
					.map((x) => workflowObject.value.getNode(x)?.name)
					.filter((x) => x !== undefined)
			: [];

		const allAfterEndNodes = end
			? workflowObject.value
					.getChildNodes(end, 'ALL')
					.map((x) => workflowObject.value.getNode(x))
					.filter((x) => x !== null)
			: [];

		const { nodes, variables } = extractReferencesInNodeExpressions(
			subGraph,
			allNodeNames,
			startNodeName,
			start ? [start] : undefined,
		);

		let executeWorkflowNodeName = `Call ${newWorkflowName}`;
		while (allNodeNames.includes(executeWorkflowNodeName)) executeWorkflowNodeName += '_1';

		const { nodes: afterNodes, variables: afterVariables } = extractReferencesInNodeExpressions(
			allAfterEndNodes,
			allAfterEndNodes
				.map((x) => x.name)
				.concat(subGraphNames), // this excludes nodes that will remain in the parent workflow
			executeWorkflowNodeName,
			directAfterEndNodeNames,
		);

		const workflowData = makeSubworkflow(
			newWorkflowName,
			selection,
			nodes,
			workflowsStore.workflow.connections,
			variables,
			afterVariables,
			startNodeName,
			returnNodeName,
		);
		const createdWorkflow = await tryCreateWorkflow(workflowData);
		if (createdWorkflow === null) return false;

		const executeWorkflowPosition = computeAveragePosition(subGraph);
		const executeWorkflowNode = makeExecuteWorkflowNode(
			createdWorkflow.id,
			executeWorkflowNodeName,
			executeWorkflowPosition,
			variables,
		);
		await replaceSelectionWithNode(
			executeWorkflowNode,
			subGraph.find((x) => x.name === start)?.id,
			subGraph.find((x) => x.name === end)?.id,
			subGraph,
			afterNodes,
		);

		return true;
	}

	/**
	 * This mutates the current workflow and creates a new one.
	 * Intended to be called from @WorkflowExtractionNameModal spawned
	 * by @tryExtractNodesIntoSubworkflow
	 */
	async function extractNodesIntoSubworkflow(
		selection: ExtractableSubgraphData,
		subGraph: INodeUi[],
		newWorkflowName: string,
	) {
		const success = await doExtractNodesIntoSubworkflow(selection, subGraph, newWorkflowName);
		trackExtractWorkflow(subGraph.length, success);
	}

	/**
	 * This starts the extraction process by checking whether the selection is extractable
	 * and spawning a pop up asking for a sub-workflow name.
	 * If confirmed, the modal calls @extractNodesIntoSubworkflow to handle the actual mutation
	 *
	 * @param nodeIds the ids to be extracted from the current workflow into a sub-workflow
	 */
	async function extractWorkflow(nodeIds: string[]) {
		const success = tryExtractNodesIntoSubworkflow(nodeIds);
		trackStartExtractWorkflow(nodeIds.length, success);
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

	return {
		adjacencyList,
		extractWorkflow,
		tryExtractNodesIntoSubworkflow,
		extractNodesIntoSubworkflow,
	};
}
