import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	buildAdjacencyList,
	parseExtractableSubgraphSelection,
	extractReferencesInNodeExpressions,
	type IConnections,
	type INode,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	deepCopy,
} from 'n8n-workflow';
import { computed, nextTick } from 'vue';
import { useToast } from './useToast';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useHistoryStore } from '@/stores/history.store';
import { useCanvasOperations } from './useCanvasOperations';

import type { IWorkflowDataCreate, IWorkflowDb } from '@/Interface';
import { PUSH_NODES_OFFSET } from '@/utils/nodeViewUtils';
import { useUIStore } from '@/stores/ui.store';

export const SUBWORKFLOW_TRIGGER_ID = 'c155762a-8fe7-4141-a639-df2372f30060';
const EXECUTE_WORKFLOW_NODE_ID = 'e531785e-a493-4401-a6df-5da262cb4442';
const CANVAS_HISTORY_OPTIONS = {
	trackBulk: false,
	trackHistory: false,
};

export function useWorkflowExtraction() {
	const uiStore = useUIStore();
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
		const subGraph = nodeIds
			.map(workflowsStore.getNodeById)
			.filter((x) => x !== undefined && x !== null);
		if (subGraph.some((x) => x.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)) {
			return false;
		}

		const allNodeNames = workflowsStore.workflow.nodes.map((x) => x.name);

		const selectionResult = getExtractableSelection(new Set(subGraph.map((x) => x.name)));
		if (Array.isArray(selectionResult)) return false;

		const { start, end } = selectionResult;
		const startIndex = workflowsStore.workflow.nodes.findIndex((x) => x.name === start);
		const endIndex = workflowsStore.workflow.nodes.findIndex((x) => x.name === end);
		const currentWorkflow = workflowsStore.getCurrentWorkflow();
		const beforeStartNodes = start
			? currentWorkflow
					.getParentNodes(start, 'main', 1)
					.map((x) => currentWorkflow.getNode(x))
					.filter((x) => x !== null)
			: [];
		const afterEndNodes = end
			? currentWorkflow
					.getChildNodes(end, 'main', 1)
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

		const newConnections = Object.fromEntries(
			Object.entries(connections).filter(([k]) => nodes.some((x) => x.name === k)),
		);
		if (end) {
			newConnections[end] = {};
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
					type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
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

			window.open(href, '_blank');
			// window.open(href);
		} catch (e) {
			toast.showError(e, 'Sub-workflow Extraction failed');
			return false;
		}
		historyStore.startRecordingUndo();

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
					? [startAvg[0] + PUSH_NODES_OFFSET, startAvg[1]]
					: afterEndNodes.length
						? [endAvg[0] - PUSH_NODES_OFFSET, endAvg[0]]
						: avgPosition(nodes);

		// const executeWorkflowNode = (
		// 	await canvasOperations.addNodes(
		// 		[
		// 			{
		// 				parameters: {
		// 					workflowId: {
		// 						__rl: true,
		// 						value: createdWorkflow.id,
		// 						mode: 'list',
		// 					},
		// 					workflowInputs: {
		// 						mappingMode: 'defineBelow',
		// 						value: Object.fromEntries(variables.entries().map(([k, v]) => [k, `={{ ${v} }}`])),
		// 						matchingColumns: [...variables.keys()],
		// 						schema: [
		// 							...variables.keys().map((x) => ({
		// 								id: x,
		// 								displayName: x,
		// 								required: false,
		// 								defaultMatch: false,
		// 								display: true,
		// 								canBeUsedToMatch: true,
		// 								removed: false,
		// 								// no type implicitly uses our `any` type
		// 							})),
		// 						],
		// 						attemptToConvertTypes: false,
		// 						convertFieldsToString: true,
		// 					},
		// 					options: {},
		// 				},
		// 				type: 'n8n-nodes-base.executeWorkflow',
		// 				typeVersion: 1.2,
		// 				position: executeWorkflowPosition,
		// 				id: EXECUTE_WORKFLOW_NODE_ID,
		// 				name: executeWorkflowNodeName,
		// 			},
		// 		],
		// 		CANVAS_HISTORY_OPTIONS,
		// 	)
		// )[0];

		workflowsStore.addNode({
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
		});

		if (start) {
			for (const beforeStartNode of beforeStartNodes) {
				for (const nodeConnection of Object.values(connections[beforeStartNode.name] ?? {})) {
					for (const nodeInputConnections of nodeConnection) {
						if (!nodeInputConnections) continue;

						for (const connection of Object.values(nodeInputConnections ?? {})) {
							if (connection.node === start) {
								connection.node = executeWorkflowNodeName;
								uiStore.stateIsDirty = true;
							}
						}
					}
				}
			}
		}
		await nextTick();
		if (end) {
			debugger;
			connections[executeWorkflowNodeName] = Object.fromEntries(
				Object.entries(connections[end]).map(([k, v]) =>
					k === end ? [executeWorkflowNodeName, { ...v }] : [k, { ...v }],
				),
			);
			delete connections[end];
			uiStore.stateIsDirty = true;
		}
		await nextTick();

		for (const [id, name] of subGraph.map((x) => [x.id, x.name])) {
			workflowsStore.removeNodeById(id);
			await nextTick();
		}
		workflowsStore.updateCachedWorkflow();
		uiStore.stateIsDirty = true;
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
