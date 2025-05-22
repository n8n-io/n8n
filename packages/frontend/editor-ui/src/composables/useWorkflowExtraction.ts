import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	buildAdjacencyList,
	parseExtractableSubgraphSelection,
	type ExtractableSubgraphData,
	type ExtractableErrorResult,
	extractReferencesInNodeExpressions,
	type IConnections,
	type INode,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	NodeHelpers,
} from 'n8n-workflow';
import { computed, nextTick } from 'vue';
import { useToast } from './useToast';
import { useRouter } from 'vue-router';
import { VIEWS, WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/constants';
import { useHistoryStore } from '@/stores/history.store';
import { useCanvasOperations } from './useCanvasOperations';

import type { INodeUi, IWorkflowDataCreate, IWorkflowDb } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { PUSH_NODES_OFFSET } from '@/utils/nodeViewUtils';
import { useUIStore } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useTelemetry } from './useTelemetry';
import { isEqual, uniqueId } from 'lodash-es';

export const SUBWORKFLOW_TRIGGER_ID = 'c155762a-8fe7-4141-a639-df2372f30060';
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
	const canvasOperations = useCanvasOperations({ router });
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const adjacencyList = computed(() => buildAdjacencyList(workflowsStore.workflow.connections));

	function showError(message: string) {
		toast.showMessage({
			type: 'error',
			message,
			title: i18n.baseText('workflowExtraction.error.failure'),
			duration: 0,
		});
	}

	// An array indicates a list of errors, preventing extraction
	function getExtractableSelection(nodeNameSet: Set<string>) {
		return parseExtractableSubgraphSelection(nodeNameSet, adjacencyList.value);
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

	function checkExtractableSelectionValidity(
		selection: ReturnType<typeof getExtractableSelection>,
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
			nodeName: string | undefined,
			getIOs: (
				...x: Parameters<typeof NodeHelpers.getNodeInputs>
			) => ReturnType<typeof NodeHelpers.getNodeInputs>,
		) => {
			if (!nodeName) {
				return true;
			}
			const node = workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return true;
			}
			const nodeType = useNodeTypesStore().getNodeType(node.type, node.typeVersion);
			if (nodeType) {
				const ios = getIOs(workflowsStore.getCurrentWorkflow(), node, nodeType);
				if (
					ios.filter((x) => (typeof x === 'string' ? x === 'main' : x.type === 'main')).length > 1
				) {
					return false;
				}
			}
			return true;
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

	function tryExtractNodesIntoSubworkflow(nodeIds: string[], connections: IConnections): boolean {
		const subGraph = nodeIds
			.map(workflowsStore.getNodeById)
			.filter((x) => x !== undefined && x !== null);

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

		const selection = getExtractableSelection(new Set(subGraph.map((x) => x.name)));

		if (!checkExtractableSelectionValidity(selection)) return false;

		uiStore.openModalWithData({
			name: WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
			data: { connections, subGraph, selection },
		});
		return true;
	}

	async function extractNodesIntoSubworkflow(
		selection: ExtractableSubgraphData,
		subGraph: INodeUi[],
		connections: IConnections,
		newWorkflowName: string,
	) {
		const { start, end } = selection;
		const currentWorkflow = workflowsStore.getCurrentWorkflow();
		const allNodeNames = workflowsStore.workflow.nodes.map((x) => x.name);
		let startNodeName = 'Start';
		const subGraphNames = subGraph.map((x) => x.name);
		while (subGraphNames.includes(startNodeName)) startNodeName += '_1';

		let returnNodeName = 'Return';
		while (subGraphNames.includes(returnNodeName)) returnNodeName += '_1';

		const directAfterEndNodes = end
			? currentWorkflow
					.getChildNodes(end, 'main', 1)
					.map((x) => currentWorkflow.getNode(x))
					.filter((x) => x !== null)
			: [];

		const allAfterEndNodes = end
			? currentWorkflow
					.getChildNodes(end, 'ALL')
					.map((x) => currentWorkflow.getNode(x))
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

		const newConnections = Object.fromEntries(
			Object.entries(connections).filter(([k]) => nodes.some((x) => x.name === k)),
		);
		if (end) {
			// this is necessary because the new workflow crashes looking for the
			// nodes in these connections
			newConnections[end] = {};
			delete newConnections[end];
		}
		const startNodeTarget =
			nodes.find((x) => x.name === start) ?? nodes.sort((a, b) => a.position[1] - b.position[1])[0];
		const startNodePosition: [number, number] = [
			startNodeTarget.position[0] - PUSH_NODES_OFFSET,
			startNodeTarget.position[1],
		];

		const endNodeTarget = nodes.find((x) => x.name === end);

		const startNodeConnection = startNodeTarget
			? ({
					[startNodeName]: {
						main: [
							[
								{
									node: startNodeTarget.name,
									type: 'main', // todo check if this is valid
									index: 0,
								},
							],
						],
					},
				} as IConnections)
			: {};

		const endNodeConnection = endNodeTarget
			? ({
					[endNodeTarget.name]: {
						main: [
							[
								{
									node: returnNodeName,
									type: 'main', // todo check if this is valid
									index: 0,
								},
							],
						],
					},
				} as IConnections)
			: {};

		const { nodes: afterNodes, variables: afterVariables } = extractReferencesInNodeExpressions(
			allAfterEndNodes,
			allAfterEndNodes
				.map((x) => x.name)
				.concat(subGraphNames), // this excludes nodes that will remain in the parent workflow
			executeWorkflowNodeName,
			directAfterEndNodes.map((x) => x.name),
		);

		const returnNode =
			afterVariables.size === 0
				? []
				: [
						{
							parameters: {
								assignments: {
									assignments: [
										...afterVariables.entries().map((x) => ({
											id: Math.random().toString().slice(2),
											name: x[0],
											value: `={{ ${x[1]} }}`,
											type: 'string', // todo infer from execution data?
										})),
									],
								},
								options: {},
							},
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: endNodeTarget
								? [endNodeTarget.position[0] + PUSH_NODES_OFFSET, endNodeTarget.position[1]]
								: undefined,
							id: Math.random().toString().slice(2),
							name: returnNodeName,
						} as INode,
					];

		const triggerParameters =
			variables.size > 0
				? {
						workflowInputs: {
							values: [...variables.keys().map((k) => ({ name: k, type: 'any' }))],
						},
					}
				: {
						inputSource: 'passthrough',
					};

		const newWorkflow: IWorkflowDataCreate = {
			name: newWorkflowName,
			nodes: [
				...nodes,
				{
					id: SUBWORKFLOW_TRIGGER_ID,
					typeVersion: 1.1,
					name: startNodeName,
					type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
					position: startNodePosition,
					parameters: triggerParameters,
				} as INode,
				...returnNode,
			],
			connections: {
				...newConnections,
				...startNodeConnection,
				...endNodeConnection,
			},
			settings: { executionOrder: 'v1' },
			projectId: workflowsStore.workflow.homeProject?.id,
			parentFolderId: workflowsStore.workflow.parentFolder?.id ?? undefined,
		};

		let createdWorkflow: IWorkflowDb;
		try {
			createdWorkflow = await workflowsStore.createNewWorkflow(newWorkflow);

			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: {
					name: createdWorkflow.id,
					// nodeId: SUBWORKFLOW_TRIGGER_ID
				},
			});

			toast.showMessage({
				title: i18n.baseText('workflowExtraction.success.title'),
				message: i18n.baseText('workflowExtraction.success.message', {
					interpolate: { url: href },
				}),
				type: 'success',
			});
		} catch (e) {
			toast.showError(e, i18n.baseText('workflowExtraction.error.subworkflowCreationFailed'));
			return false;
		}

		const mathy = ([a, b, c]: [number, number, number]): [number, number] => [a / c, b / c];
		const avgPosition = (n: INode[]) =>
			mathy(
				n.reduce<[number, number, number]>(
					(acc, v) => [acc[0] + v.position[0], acc[1] + v.position[1], acc[2] + 1],
					[0, 0, 0],
				),
			);

		const executeWorkflowPosition = avgPosition(subGraph);

		historyStore.startRecordingUndo();
		// In most cases we're about to move the selection anyway
		// One remarkable edge case is when a single node is right-clicked on
		// This allows extraction, but does not necessarily select the node
		uiStore.resetLastInteractedWith();
		const executeWorkflowNode = (
			await canvasOperations.addNodes(
				[
					{
						parameters: {
							workflowId: {
								__rl: true,
								value: createdWorkflow.id,
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
										// no type implicitly uses our `any` type
									})),
								],
								attemptToConvertTypes: false,
								convertFieldsToString: true,
							},
							options: {},
						},
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.2,
						position: executeWorkflowPosition,
						name: executeWorkflowNodeName,
					},
				],
				{
					...CANVAS_HISTORY_OPTIONS,
					position: executeWorkflowPosition,
					forcePosition: true,
				},
			)
		)[0];

		await nextTick();
		if (end) {
			const endId = subGraph.find((x) => x.name === end)?.id;
			if (endId)
				canvasOperations.replaceNodeConnections(endId, executeWorkflowNode.id, {
					...CANVAS_HISTORY_OPTIONS,
					replaceInputs: false,
				});
		}
		await nextTick();

		if (start) {
			const startId = subGraph.find((x) => x.name === start)?.id;
			if (startId)
				canvasOperations.replaceNodeConnections(startId, executeWorkflowNode.id, {
					...CANVAS_HISTORY_OPTIONS,
					replaceOutputs: false,
				});
		}

		for (const node of subGraph) {
			await nextTick();
			canvasOperations.deleteNode(node.id, CANVAS_HISTORY_OPTIONS);
		}

		for (const node of afterNodes) {
			await nextTick();
			const currentNode = workflowsStore.workflow.nodes.find((x) => x.id === node.id);
			if (isEqual(node, currentNode)) continue;
			canvasOperations.replaceNodeProperties(
				node.id,
				{ ...currentNode },
				{ ...currentNode, parameters: { ...node.parameters } },
				CANVAS_HISTORY_OPTIONS,
			);
		}

		uiStore.stateIsDirty = true;
		historyStore.stopRecordingUndo();

		return true;
	}

	async function extractWorkflow(nodeIds: string[]) {
		const success = tryExtractNodesIntoSubworkflow(nodeIds, workflowsStore.workflow.connections);
		if (success) trackExtractWorkflow(nodeIds.length);
	}

	function trackExtractWorkflow(nodeCount: number) {
		telemetry.track(
			'User converted nodes to sub-workflow',
			{
				node_count: nodeCount,
			},
			{ withPostHog: true },
		);
	}

	return {
		adjacencyList,
		extractWorkflow,
		getExtractableSelection,
		tryExtractNodesIntoSubworkflow,
		extractNodesIntoSubworkflow,
	};
}
