import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { Aa as require_isEqual, Cr as require_uniq, Oa as v4, Xo as useRouter } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, Hp as sanitizeConnections, Jg as useUIStore, Od as useWorkflowsStore, Qc as useCanvasOperations, bx as WORKFLOW_EXTRACTION_NAME_MODAL_KEY, dC as useToast, eA as EXECUTE_WORKFLOW_NODE_TYPE, fC as VIEWS, gd as UpdateNodeGroupCommand, hC as useTelemetry, hO as extractReferencesInNodeExpressions, jN as useI18n, jk as NodeConnectionTypes, ol as useCanvasNodeGroupTelemetry, pd as useHistoryStore, rg as PUSH_NODES_OFFSET, sl as deleteGroupWithHistory, tA as EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, uf as useNodeTypesStore, ul as useSelectionValidation, wk as nodeAcceptsInputType, xg as checkExhaustive } from "./app-D5flEmb-.js";
//#region src/app/composables/useWorkflowExtraction.ts
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var import_uniq = /* @__PURE__ */ __toESM(require_uniq(), 1);
var CANVAS_HISTORY_OPTIONS = {
	trackBulk: false,
	trackHistory: true
};
function useWorkflowExtraction() {
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
	const { expandSelectionWithSubNodes, isSelectionExtractable, isSubworkflowConversionDisabled } = useSelectionValidation();
	function showError(message) {
		toast.showMessage({
			type: "error",
			message,
			title: i18n.baseText("workflowExtraction.error.failure"),
			duration: 15e3
		});
	}
	function extractableErrorResultToMessage(result) {
		switch (result.errorCode) {
			case "Input Edge To Non-Root Node": return i18n.baseText("workflowExtraction.error.selectionGraph.inputEdgeToNonRoot", { interpolate: { node: result.node } });
			case "Output Edge From Non-Leaf Node": return i18n.baseText("workflowExtraction.error.selectionGraph.outputEdgeFromNonLeaf", { interpolate: { node: result.node } });
			case "Multiple Input Nodes": return i18n.baseText("workflowExtraction.error.selectionGraph.multipleInputNodes", { interpolate: { nodes: [...result.nodes].map((x) => `'${x}'`).join(", ") } });
			case "Multiple Output Nodes": return i18n.baseText("workflowExtraction.error.selectionGraph.multipleOutputNodes", { interpolate: { nodes: [...result.nodes].map((x) => `'${x}'`).join(", ") } });
			case "No Continuous Path From Root To Leaf In Selection": return i18n.baseText("workflowExtraction.error.selectionGraph.noContinuousPathFromRootToLeaf", { interpolate: {
				start: result.start,
				end: result.end
			} });
		}
	}
	function makeExecuteWorkflowNode(workflowId, name, position, variables) {
		const variableEntries = [...variables.entries()];
		const variableNames = [...variables.keys()];
		return {
			parameters: {
				workflowId: {
					__rl: true,
					value: workflowId,
					mode: "list"
				},
				workflowInputs: {
					mappingMode: "defineBelow",
					value: Object.fromEntries(variableEntries.map(([k, v]) => [k, `={{ ${v} }}`])),
					matchingColumns: variableNames,
					schema: variableNames.map((x) => ({
						id: x,
						displayName: x,
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						removed: false
					})),
					attemptToConvertTypes: false,
					convertFieldsToString: true
				},
				options: {}
			},
			type: EXECUTE_WORKFLOW_NODE_TYPE,
			typeVersion: 1.4,
			position,
			name
		};
	}
	/**
	* Copies the parent workflow's groups that should survive extraction into the
	* new sub-workflow. A group is carried over only when every one of its members
	* is extracted (a partial subset may no longer form a valid group) AND the
	* selection contains at least one node outside the group. The whole-group-only
	* case is intentionally excluded: the nodes become the sub-workflow itself and
	* the parent group is dissolved separately (ADO-5580). A fresh id is minted so
	* the copy never collides with the group still present in the parent.
	*/
	function computeSubworkflowNodeGroups(extractedNodes) {
		const extractedIds = new Set(extractedNodes.map((node) => node.id));
		const groups = [];
		for (const group of workflowDocumentStore.value.allGroups) {
			if (!group.nodeIds.every((id) => extractedIds.has(id))) continue;
			if (!(extractedIds.size > group.nodeIds.length)) continue;
			groups.push({
				id: window.crypto.randomUUID(),
				name: group.name,
				nodeIds: [...group.nodeIds],
				...group.description ? { description: group.description } : {}
			});
		}
		return groups;
	}
	function makeSubworkflow(newWorkflowName, { start, end }, nodes, connections, selectionVariables, selectionChildrenVariables, startNodeName, returnNodeName) {
		const newConnections = Object.fromEntries(Object.entries(connections).filter(([k]) => nodes.some((x) => x.name === k)));
		if (end) delete newConnections[end];
		const startNodeTarget = nodes.find((x) => x.name === start);
		const firstNode = startNodeTarget ?? nodes.sort((a, b) => a.position[1] - b.position[1])[0];
		const startNodePosition = [firstNode.position[0] - PUSH_NODES_OFFSET, firstNode.position[1]];
		const endNodeTarget = nodes.find((x) => x.name === end);
		const lastNode = endNodeTarget ?? nodes.sort((a, b) => b.position[1] - a.position[1])[0];
		const endNodePosition = [lastNode.position[0] + PUSH_NODES_OFFSET, lastNode.position[1]];
		const shouldInsertReturnNode = selectionChildrenVariables.size > 0;
		const firstNodeType = nodeTypesStore.getNodeType(firstNode.type, firstNode.typeVersion);
		const startNodeConnection = startNodeTarget !== void 0 || firstNodeType && nodeAcceptsInputType(firstNodeType, "main") ? { [startNodeName]: { main: [[{
			node: firstNode.name,
			type: "main",
			index: 0
		}]] } } : {};
		const endNodeConnection = endNodeTarget && shouldInsertReturnNode ? { [endNodeTarget.name]: { main: [[{
			node: returnNodeName,
			type: "main",
			index: 0
		}]] } } : {};
		const returnNode = shouldInsertReturnNode ? [{
			parameters: {
				assignments: { assignments: [...selectionChildrenVariables.entries().map((x) => ({
					id: v4(),
					name: x[0],
					value: `={{ ${x[1]} }}`,
					type: "string"
				}))] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: endNodePosition,
			id: v4(),
			name: returnNodeName
		}] : [];
		const triggerParameters = selectionVariables.size === 0 ? { inputSource: "passthrough" } : { workflowInputs: { values: [...selectionVariables.keys().map((k) => ({
			name: k,
			type: "any"
		}))] } };
		const triggerNode = {
			id: v4(),
			typeVersion: 1.1,
			name: startNodeName,
			type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
			position: startNodePosition,
			parameters: triggerParameters
		};
		const result = {
			name: newWorkflowName,
			nodes: [
				...nodes,
				...returnNode,
				triggerNode
			],
			connections: {
				...newConnections,
				...startNodeConnection,
				...endNodeConnection
			},
			settings: { executionOrder: "v1" },
			projectId: workflowDocumentStore.value.homeProject?.id,
			parentFolderId: workflowDocumentStore.value.parentFolder?.id ?? void 0,
			nodeGroups: computeSubworkflowNodeGroups(nodes)
		};
		result.connections = sanitizeConnections(result.connections, result.nodes?.map((x) => x.name));
		return result;
	}
	function computeAveragePosition(nodes) {
		const summedUp = nodes.reduce((acc, v) => [
			acc[0] + v.position[0],
			acc[1] + v.position[1],
			acc[2] + 1
		], [
			0,
			0,
			0
		]);
		return [summedUp[0] / summedUp[2], summedUp[1] / summedUp[2]];
	}
	function getNonMainConnectionTargets(nodeName, connections) {
		const nodeConnections = connections[nodeName];
		if (!nodeConnections) return [];
		const targets = [];
		for (const [type, connectionsByOutputIndex] of Object.entries(nodeConnections)) {
			if (type === NodeConnectionTypes.Main) continue;
			for (const outputConnections of connectionsByOutputIndex) for (const connection of outputConnections ?? []) targets.push(connection.node);
		}
		return targets;
	}
	function getNodesToRemoveFromParent(extractedNodes, connections) {
		const extractedNodeNames = new Set(extractedNodes.map((node) => node.name));
		const nonMainTargetsByNodeName = new Map(extractedNodes.map((node) => [node.name, getNonMainConnectionTargets(node.name, connections)]));
		const subNodeNames = new Set([...nonMainTargetsByNodeName.entries()].filter(([, targets]) => targets.some((target) => extractedNodeNames.has(target))).map(([nodeName]) => nodeName));
		const preservedNodeNames = new Set([...subNodeNames].filter((nodeName) => (nonMainTargetsByNodeName.get(nodeName) ?? []).some((target) => !extractedNodeNames.has(target))));
		let didAddPreservedNode = true;
		while (didAddPreservedNode) {
			didAddPreservedNode = false;
			for (const nodeName of subNodeNames) {
				if (preservedNodeNames.has(nodeName)) continue;
				if (!(nonMainTargetsByNodeName.get(nodeName) ?? []).some((target) => preservedNodeNames.has(target))) continue;
				preservedNodeNames.add(nodeName);
				didAddPreservedNode = true;
			}
		}
		return extractedNodes.filter((node) => !preservedNodeNames.has(node.name));
	}
	async function tryCreateWorkflow(workflowData) {
		try {
			const createdWorkflow = await workflowsStore.createNewWorkflow(workflowData);
			try {
				await workflowsStore.publishWorkflow(createdWorkflow.id, { versionId: createdWorkflow.versionId });
			} catch (activationError) {
				console.error("Failed to activate extracted sub-workflow:", activationError);
			}
			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId: createdWorkflow.id }
			});
			toast.showMessage({
				title: i18n.baseText("workflowExtraction.success.title"),
				message: i18n.baseText("workflowExtraction.success.message", { interpolate: { url: href } }),
				type: "success",
				duration: 1e4
			});
			return createdWorkflow;
		} catch (e) {
			toast.showError(e, i18n.baseText("workflowExtraction.error.subworkflowCreationFailed"));
			return null;
		}
	}
	async function replaceParentSelectionWithSubworkflowNode(executeWorkflowNodeData, startId, endId, nodesToRemoveFromParent, rewrittenDownstreamNodes) {
		historyStore.startRecordingUndo();
		uiStore.resetLastInteractedWith();
		const executeWorkflowNode = (await canvasOperations.addNodes([executeWorkflowNodeData], CANVAS_HISTORY_OPTIONS))[0];
		addReplacementNodeToCanvasGroup(nodesToRemoveFromParent.map((node) => node.id), executeWorkflowNode.id);
		if (endId) canvasOperations.replaceNodeConnections(endId, executeWorkflowNode.id, {
			...CANVAS_HISTORY_OPTIONS,
			replaceInputs: false,
			validateNodeGroups: false
		});
		if (startId) canvasOperations.replaceNodeConnections(startId, executeWorkflowNode.id, {
			...CANVAS_HISTORY_OPTIONS,
			replaceOutputs: false,
			validateNodeGroups: false
		});
		canvasOperations.deleteNodes(nodesToRemoveFromParent.map((x) => x.id), CANVAS_HISTORY_OPTIONS);
		for (const node of rewrittenDownstreamNodes) {
			const currentNode = workflowDocumentStore.value.allNodes.find((x) => x.id === node.id);
			if ((0, import_isEqual.default)(node, currentNode)) continue;
			canvasOperations.replaceNodeParameters(node.id, { ...currentNode?.parameters }, { ...node.parameters }, CANVAS_HISTORY_OPTIONS);
		}
		uiStore.markStateDirty();
		historyStore.stopRecordingUndo();
	}
	function addReplacementNodeToCanvasGroup(removableNodeIds, replacementNodeId) {
		const affectedGroupIds = (0, import_uniq.default)(removableNodeIds.map((nodeId) => workflowDocumentStore.value.getGroupForNode(nodeId)?.id).filter((id) => id !== void 0));
		if (affectedGroupIds.length !== 1) return;
		const groupId = affectedGroupIds[0];
		const groupBeforeReplacements = workflowDocumentStore.value.getGroupById(groupId);
		if (!groupBeforeReplacements) return;
		if (groupBeforeReplacements.nodeIds.filter((id) => !removableNodeIds.includes(id)).length === 0) {
			deleteGroupWithHistory(groupBeforeReplacements, workflowDocumentStore.value, historyStore);
			groupTelemetry.trackUngrouped(groupBeforeReplacements, "sub-workflow-extraction");
			return;
		}
		workflowDocumentStore.value.addNodesToGroup(groupId, [replacementNodeId]);
		const groupAfterReplacements = workflowDocumentStore.value.getGroupById(groupId);
		if (groupAfterReplacements) historyStore.pushCommandToUndo(new UpdateNodeGroupCommand({
			...groupBeforeReplacements,
			nodeIds: [...groupBeforeReplacements.nodeIds]
		}, {
			...groupAfterReplacements,
			nodeIds: [...groupAfterReplacements.nodeIds]
		}, Date.now()));
	}
	function tryExtractNodesIntoSubworkflow(nodeIds) {
		const expandedNodeIds = expandSelectionWithSubNodes(nodeIds);
		const deprecatedNodes = workflowDocumentStore.value.getNodesByIds(expandedNodeIds).filter(nodeTypesStore.isNodeDeprecated);
		if (deprecatedNodes.length > 0) {
			showError(i18n.baseText("workflowExtraction.error.deprecatedSelected", { interpolate: { nodes: deprecatedNodes.map(({ name }) => `'${name}'`).join(", ") } }));
			return false;
		}
		const result = isSelectionExtractable(expandedNodeIds);
		if (!result.valid) {
			switch (result.reason) {
				case "trigger-selected":
					showError(i18n.baseText("workflowExtraction.error.triggerSelected", { interpolate: { nodes: result.triggers.map((name) => `'${name}'`).join(", ") } }));
					break;
				case "invalid-subgraph":
					showError(i18n.baseText("workflowExtraction.error.selectionGraph.listHeader", { interpolate: { body: result.errors.map(extractableErrorResultToMessage).map((x) => `- ${x}`).join("<br>") } }));
					break;
				case "multiple-input-branches":
					showError(i18n.baseText("workflowExtraction.error.inputNodeHasMultipleInputBranches", { interpolate: { node: result.node } }));
					break;
				case "multiple-output-branches":
					showError(i18n.baseText("workflowExtraction.error.outputNodeHasMultipleOutputBranches", { interpolate: { node: result.node } }));
					break;
				default: checkExhaustive(result);
			}
			return false;
		}
		uiStore.openModalWithData({
			name: WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
			data: {
				subGraph: result.subGraph,
				selection: result.subGraphData
			}
		});
		return true;
	}
	async function doExtractNodesIntoSubworkflow(extractionBoundary, extractedNodes, newWorkflowName) {
		const { start, end } = extractionBoundary;
		const allNodeNames = workflowDocumentStore.value.allNodes.map((x) => x.name) ?? [];
		let startNodeName = "Start";
		const extractedNodeNames = extractedNodes.map((x) => x.name);
		const nodesToRemoveFromParent = getNodesToRemoveFromParent(extractedNodes, workflowDocumentStore.value.connectionsBySourceNode);
		const removedParentNodeNames = nodesToRemoveFromParent.map((node) => node.name);
		while (extractedNodeNames.includes(startNodeName)) startNodeName += "_1";
		let returnNodeName = "Return";
		while (extractedNodeNames.includes(returnNodeName)) returnNodeName += "_1";
		const directAfterEndNodeNames = end ? workflowDocumentStore.value.getChildNodes(end, "main", 1).map((x) => workflowDocumentStore.value.getNodeByName(x)?.name).filter((x) => x !== void 0) ?? [] : [];
		const allAfterEndNodes = end ? workflowDocumentStore.value.getChildNodes(end, "ALL").map((x) => workflowDocumentStore.value.getNodeByName(x) ?? null).filter((x) => x !== null) ?? [] : [];
		const { nodes, variables } = extractReferencesInNodeExpressions(extractedNodes, allNodeNames, startNodeName, start ? [start] : void 0);
		let executeWorkflowNodeName = `Call ${newWorkflowName}`;
		while (allNodeNames.includes(executeWorkflowNodeName)) executeWorkflowNodeName += "_1";
		const { nodes: afterNodes, variables: afterVariables } = extractReferencesInNodeExpressions(allAfterEndNodes, allAfterEndNodes.map((x) => x.name).concat(removedParentNodeNames), executeWorkflowNodeName, directAfterEndNodeNames);
		const createdWorkflow = await tryCreateWorkflow(makeSubworkflow(newWorkflowName, extractionBoundary, nodes, workflowDocumentStore.value?.connectionsBySourceNode, variables, afterVariables, startNodeName, returnNodeName));
		if (createdWorkflow === null) return false;
		const executeWorkflowPosition = computeAveragePosition(nodesToRemoveFromParent.length > 0 ? nodesToRemoveFromParent : extractedNodes);
		await replaceParentSelectionWithSubworkflowNode(makeExecuteWorkflowNode(createdWorkflow.id, executeWorkflowNodeName, executeWorkflowPosition, variables), nodesToRemoveFromParent.find((x) => x.name === start)?.id, nodesToRemoveFromParent.find((x) => x.name === end)?.id, nodesToRemoveFromParent, afterNodes);
		return true;
	}
	function trackStartExtractWorkflow(nodeCount, success) {
		telemetry.track("User started nodes to sub-workflow extraction", {
			node_count: nodeCount,
			success
		});
	}
	function trackExtractWorkflow(nodeCount, success) {
		telemetry.track("User extracted nodes to sub-workflow", {
			node_count: nodeCount,
			success
		});
	}
	/**
	* This mutates the current workflow and creates a new one.
	* Intended to be called from @WorkflowExtractionNameModal spawned
	* by @tryExtractNodesIntoSubworkflow
	*/
	async function extractNodesIntoSubworkflow(extractionBoundary, extractedNodes, newWorkflowName) {
		const success = await doExtractNodesIntoSubworkflow(extractionBoundary, extractedNodes, newWorkflowName);
		trackExtractWorkflow(extractedNodes.length, success);
	}
	/**
	* This starts the extraction process by checking whether the selection is extractable
	* and spawning a pop up asking for a sub-workflow name.
	* If confirmed, the modal calls @extractNodesIntoSubworkflow to handle the actual mutation
	*
	* @param nodeIds the ids to be extracted from the current workflow into a sub-workflow
	*/
	function extractWorkflow(nodeIds) {
		if (nodeIds.length === 0 || isSubworkflowConversionDisabled()) return;
		const success = tryExtractNodesIntoSubworkflow(nodeIds);
		trackStartExtractWorkflow(nodeIds.length, success);
	}
	return {
		extractWorkflow,
		tryExtractNodesIntoSubworkflow,
		extractNodesIntoSubworkflow
	};
}
//#endregion
export { useWorkflowExtraction as t };
