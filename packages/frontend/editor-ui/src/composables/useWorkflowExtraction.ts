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
import { VIEWS } from '@/constants';
import { useHistoryStore } from '@/stores/history.store';
import { useCanvasOperations } from './useCanvasOperations';

import type { IWorkflowDataCreate, IWorkflowDb } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { PUSH_NODES_OFFSET } from '@/utils/nodeViewUtils';
import { useUIStore } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

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

	const adjacencyList = computed(() => buildAdjacencyList(workflowsStore.workflow.connections));

	function showError(message: string) {
		toast.showMessage({
			type: 'error',
			message,
			title: i18n.baseText('workflowExtraction.error.failure'),
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
					interpolate: { node: [...result.nodes].map((x) => `'${x}'`).join(', ') },
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
					interpolate: { body: selection.map(extractableErrorResultToMessage).join('\n') },
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

	async function tryExtractNodesIntoSubworkflow(
		nodeIds: string[],
		connections: IConnections,
	): Promise<boolean> {
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

		const allNodeNames = workflowsStore.workflow.nodes.map((x) => x.name);

		const selectionResult = getExtractableSelection(new Set(subGraph.map((x) => x.name)));

		if (!checkExtractableSelectionValidity(selectionResult)) return false;

		const { start, end } = selectionResult;
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

		let startNodeName = 'Start';
		while (allNodeNames.includes(startNodeName)) startNodeName += '_1';
		debugger;
		const { nodes, variables } = extractReferencesInNodeExpressions(
			subGraph,
			allNodeNames,
			startNodeName,
			start,
		);
		const newWorkflowName = 'My Sub-workflow';

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

			window.open(href, '_blank');
			// window.open(href);
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
		const startAvg = avgPosition(beforeStartNodes);

		const endAvg = avgPosition(afterEndNodes);

		const executeWorkflowPosition: [number, number] =
			subGraph.length === 1
				? subGraph[0].position
				: beforeStartNodes.length && afterEndNodes.length
					? [
							startAvg[0] + (endAvg[0] - startAvg[0]) / 2,
							startAvg[1] + (endAvg[1] - startAvg[1]) / 2,
						]
					: beforeStartNodes.length
						? [startAvg[0] + PUSH_NODES_OFFSET, startAvg[1]]
						: afterEndNodes.length
							? [endAvg[0] - PUSH_NODES_OFFSET, endAvg[0]]
							: avgPosition(nodes);

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

		for (const id of nodeIds) {
			await nextTick();
			canvasOperations.deleteNode(id, CANVAS_HISTORY_OPTIONS);
		}
		uiStore.stateIsDirty = true;
		historyStore.stopRecordingUndo();

		return false;
	}

	async function extractWorkflow(nodeIds: string[]) {
		const success = tryExtractNodesIntoSubworkflow(nodeIds, workflowsStore.workflow.connections);
		// should we auto open or post the link in a notification instead?
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
