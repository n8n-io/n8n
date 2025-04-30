import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	buildAdjacencyList,
	parseExtractableSubgraphSelection,
	extractReferencesInNodeExpressions,
	type IConnections,
	type INode,
} from 'n8n-workflow';
import { computed } from 'vue';
import { useToast } from './useToast';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useHistoryStore } from '@/stores/history.store';
import { useCanvasOperations } from './useCanvasOperations';

import type { IWorkflowDataCreate, IWorkflowDb } from '@/Interface';
import { PUSH_NODES_OFFSET } from '@/utils/nodeViewUtils';

export const SUBWORKFLOW_TRIGGER_ID = 'c155762a-8fe7-4141-a639-df2372f30060';
const EXECUTE_WORKFLOW_NODE_ID = 'e531785e-a493-4401-a6df-5da262cb4442';
const CANVAS_HISTORY_OPTIONS = {
	trackBulk: false,
	trackHistory: true,
};

export function useWorkflowExtraction() {
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();
	const router = useRouter();
	const historyStore = useHistoryStore();
	const canvasOperations = useCanvasOperations({ router });

	const adjacencyList = computed(() => buildAdjacencyList(workflowsStore.workflow.connections));

	// An array indicates a list of errors, preventing extraction
	function getExtractableSelection(nodeNameSet: Set<string>) {
		return parseExtractableSubgraphSelection(nodeNameSet, adjacencyList.value);
	}

	async function tryExtractNodesIntoSubworkflow(
		nodeIds: string[],
		connections: IConnections,
	): Promise<boolean> {
		const subGraph = nodeIds.map(workflowsStore.getNodeById).filter((x) => x !== undefined);

		const allNodeNames = workflowsStore.workflow.nodes.map((x) => x.name);

		const selectionResult = getExtractableSelection(new Set(subGraph.map((x) => x.name)));
		if (Array.isArray(selectionResult)) return false;

		const { start, end } = selectionResult;
		const currentWorkflow = workflowsStore.getCurrentWorkflow();
		const beforeStartNodes = start
			? currentWorkflow
					.getParentNodes(start, undefined, 1)
					.map((x) => currentWorkflow.getNode(x))
					.filter((x) => x !== null)
			: [];
		const afterEndNodes = end
			? currentWorkflow
					.getChildNodes(end, undefined, 1)
					.map((x) => currentWorkflow.getNode(x))
					.filter((x) => x !== null)
			: [];

		// const areBeforeStartAndAfterEndDirectlyConnected =
		// 	beforeStartNode &&
		// 	afterEndNode &&
		// 	workflowsStore.isNodeInOutgoingNodeConnections(beforeStartNode.name, afterEndNode.name, 1);

		let startNodeName = 'Start';
		while (allNodeNames.includes(startNodeName)) startNodeName += '_1';
		const { nodes, variables } = extractReferencesInNodeExpressions(
			subGraph,
			allNodeNames,
			startNodeName,
		);
		const newWorkflowName = 'My Sub-workflow';

		let executeWorkflowNodeName = `Call ${newWorkflowName}`;
		while (allNodeNames.includes(executeWorkflowNodeName)) executeWorkflowNodeName += '_1';

		const newConnections = { ...connections };
		debugger;
		if (start) {
			for (const nodeConnection of Object.values(newConnections[start])) {
				for (const nodeInputConnections of nodeConnection) {
					if (nodeInputConnections) {
						for (const connection of Object.values(nodeInputConnections)) {
							if (connection.node === start) {
								connection.node = executeWorkflowNodeName;
							}
						}
					}
				}
			}
		}

		if (end) {
			newConnections[EXECUTE_WORKFLOW_NODE_ID] = newConnections[end];
			// without this the new workflow ends up not working because empty connection entries
			// prevent it from running
			delete newConnections[end];
		}

		const startNodeTarget =
			nodes.find((x) => x.name === start) ?? nodes.sort((a, b) => a.position[1] - b.position[1])[0];
		const startNodePosition: [number, number] = [
			startNodeTarget.position[0] - PUSH_NODES_OFFSET,
			startNodeTarget.position[1],
		];

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
				} as IConnections)
			: {};

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
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					position: startNodePosition,
					parameters: triggerParameters,
				} as INode,
			],
			connections: {
				...newConnections,
				...startNodeConnection,
			},
			settings: { executionOrder: 'v1' },
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

			// window.open(href, '_blank');
			window.open(href);
		} catch (e) {
			toast.showError(e, 'Sub-workflow Extraction failed');
			return false;
		}

		historyStore.startRecordingUndo();

		for (const [id, name] of subGraph.map((x) => [x.id, x.name])) {
			// renaming here messes up the history
			await canvasOperations.renameNode(name, executeWorkflowNodeName, CANVAS_HISTORY_OPTIONS);
			canvasOperations.deleteNode(id, { connectAdjacent: false, ...CANVAS_HISTORY_OPTIONS });
		}

		const mathy = ([a, b, c]: [number, number, number]): [number, number] => [a / c, b / c];
		const avgPosition = (n: INode[]) =>
			mathy(
				n.reduce<[number, number, number]>(
					(acc, v) => [acc[0] + v.position[0], acc[1] + v.position[1], acc[2] + 1],
					[0, 0, 0],
				),
			);
		const startAvg = avgPosition(beforeStartNodes);

		const endAvg = avgPosition(afterEndNodes);

		const executeWorkflowPosition: [number, number] =
			beforeStartNodes.length && afterEndNodes.length
				? [startAvg[0] + (endAvg[0] - startAvg[0]) / 2, startAvg[1] + (endAvg[1] - startAvg[1]) / 2]
				: beforeStartNodes.length
					? [startAvg[0] + PUSH_NODES_OFFSET * 2, startAvg[1]]
					: afterEndNodes.length
						? [endAvg[0] - PUSH_NODES_OFFSET * 2, endAvg[0]]
						: avgPosition(nodes);

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
					id: EXECUTE_WORKFLOW_NODE_ID,
					name: executeWorkflowNodeName,
				},
			],
			CANVAS_HISTORY_OPTIONS,
		);
		for (const node of beforeStartNodes) {
			canvasOperations.createConnection(
				{
					source: node.id,
					target: EXECUTE_WORKFLOW_NODE_ID,
				},
				CANVAS_HISTORY_OPTIONS,
			);
		}

		for (const node of afterEndNodes) {
			canvasOperations.createConnection(
				{
					source: EXECUTE_WORKFLOW_NODE_ID,
					target: node.id,
				},
				CANVAS_HISTORY_OPTIONS,
			);
		}

		if (beforeStartNodes.length && afterEndNodes.length) {
			// Since we delete the nodes in-between these two may end up automatically connected
			// canvasOperations.deleteConnection({ source: beforeStartNode.id, target: afterEndNode.id });
		}

		historyStore.stopRecordingUndo();

		return false;
	}

	async function extractWorkflow(nodeIds: string[]) {
		const success = tryExtractNodesIntoSubworkflow(nodeIds, workflowsStore.workflow.connections);
		trackExtractWorkflow();
	}

	function trackExtractWorkflow() {
		// telemetry.track(
		// 	'User tidied up canvas',
		// 	{
		// 		source,
		// 		target,
		// 		nodes_count: result.nodes.length,
		// 	},
		// 	{ withPostHog: true },
		// );
	}

	return {
		adjacencyList,
		extractWorkflow,
		getExtractableSelection,
		tryExtractNodesIntoSubworkflow,
	};
}
