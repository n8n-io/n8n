import { $d as init_runtime_core_esm_bundler, Rd as computed } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, Ab as NO_OP_NODE_TYPE, Af as transformNodeType, Cf as isNodeItemRestricted, Eb as MANUAL_TRIGGER_NODE_TYPE, Ef as removePreviewToken, Hb as STICKY_NODE_TYPE, Ib as QA_CHAIN_NODE_TYPE, Jg as useUIStore, Kk as CHAIN_LLM_LANGCHAIN_NODE_TYPE, Ll as useNodeCreatorStore, Mb as OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE, Nb as OPEN_AI_NODE_TYPE, Ob as MESSAGE_AN_AGENT_NODE_TYPE, Rb as SCHEDULE_TRIGGER_NODE_TYPE, Vb as SPLIT_IN_BATCHES_NODE_TYPE, Wb as WEBHOOK_NODE_TYPE, _b as CHAT_TRIGGER_NODE_TYPE, db as isNodeCreatorOpenFromConnection, fb as AGENT_NODE_TYPE, gb as BASIC_CHAIN_NODE_TYPE, jN as useI18n, jb as OPEN_AI_ASSISTANT_NODE_TYPE, jk as NodeConnectionTypes, kf as sortNodeCreateElements, rg as PUSH_NODES_OFFSET, tb as AI_CATEGORY_LANGUAGE_MODELS, ub as TRIGGER_NODE_CREATOR_VIEW, uf as useNodeTypesStore, vd as useExternalHooks, yg as CHANGE_ACTION } from "./app-D5flEmb-.js";
//#region src/features/shared/nodeCreator/composables/useActions.ts
init_runtime_core_esm_bundler();
var useActions = () => {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeCreatorStore = useNodeCreatorStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();
	const i18n = useI18n();
	const actionsCategoryLocales = computed(() => {
		return {
			actions: i18n.baseText("nodeCreator.actionsCategory.actions") ?? "",
			triggers: i18n.baseText("nodeCreator.actionsCategory.triggers") ?? ""
		};
	});
	function getPlaceholderTriggerActions(subcategory) {
		const nodes = [WEBHOOK_NODE_TYPE, SCHEDULE_TRIGGER_NODE_TYPE];
		return nodeCreatorStore.mergedNodes.filter((node) => nodes.some((n) => n === node.name)).map((node) => {
			const transformed = transformNodeType(node, subcategory, "action");
			if (transformed.type === "action") {
				const localeKey = `nodeCreator.actionsPlaceholderNode.${node.name.replace("n8n-nodes-base.", "")}`;
				const overwriteLocale = i18n.baseText(localeKey);
				if (overwriteLocale !== localeKey) transformed.properties.displayName = overwriteLocale;
			}
			return transformed;
		});
	}
	function filterActionsCategory(items, category) {
		return items.filter((item) => item.type === "action" && item.properties.codex.categories.includes(category));
	}
	function injectActionsLabels(items) {
		const extendedActions = sortNodeCreateElements([...items]);
		const labelsSet = /* @__PURE__ */ new Set();
		for (const action of extendedActions) {
			if (action.type !== "action") continue;
			const label = action.properties?.codex?.label;
			labelsSet.add(label);
		}
		if (labelsSet.size <= 1) return extendedActions;
		const firstIndexMap = /* @__PURE__ */ new Map();
		for (let i = 0; i < extendedActions.length; i++) {
			const action = extendedActions[i];
			if (action.type !== "action") continue;
			const label = action.properties?.codex?.label;
			if (!firstIndexMap.has(label)) firstIndexMap.set(label, i);
		}
		let insertedLabels = 0;
		for (const label of labelsSet) {
			const newLabel = {
				uuid: label,
				type: "label",
				key: label,
				subcategory: extendedActions[0].key,
				properties: { key: label }
			};
			const insertIndex = firstIndexMap.get(label);
			if (insertIndex !== void 0) {
				extendedActions.splice(insertIndex + insertedLabels, 0, newLabel);
				insertedLabels++;
			}
		}
		return extendedActions;
	}
	function parseCategoryActions(actions, category, withLabels = true) {
		const filteredActions = filterActionsCategory(actions, category);
		if (withLabels) return injectActionsLabels(filteredActions);
		return filteredActions;
	}
	function getActionData(actionItem) {
		const displayOptions = actionItem.displayOptions;
		const displayConditions = Object.keys(displayOptions?.show ?? {}).reduce((acc, showCondition) => {
			acc[showCondition] = displayOptions?.show?.[showCondition]?.[0];
			return acc;
		}, {});
		return {
			name: actionItem.displayName,
			key: actionItem.name,
			value: {
				...actionItem.values,
				...displayConditions
			}
		};
	}
	function actionDataToNodeTypeSelectedPayload(actionData) {
		const result = {
			type: actionData.key,
			actionName: actionData.name
		};
		if (typeof actionData.value.language === "string") {
			result.parameters = { language: actionData.value.language };
			return result;
		}
		if (typeof actionData.value.resource === "string" || typeof actionData.value.operation === "string") {
			result.parameters = {};
			if (typeof actionData.value.resource === "string") result.parameters.resource = actionData.value.resource;
			if (typeof actionData.value.operation === "string") result.parameters.operation = actionData.value.operation;
		}
		return result;
	}
	function nodeCreateElementToNodeTypeSelectedPayload(actionData) {
		const result = { type: removePreviewToken(actionData.key) };
		if (typeof actionData.resource === "string" || typeof actionData.operation === "string") {
			result.parameters = {};
			if (typeof actionData.resource === "string") result.parameters.resource = actionData.resource;
			if (typeof actionData.operation === "string") result.parameters.operation = actionData.operation;
		}
		return result;
	}
	/**
	* Checks if added nodes contain trigger followed by another node
	* In this case, we should connect the trigger with the following node
	*/
	function shouldConnectWithExistingTrigger(addedNodes) {
		if (addedNodes.length === 2) return useNodeTypesStore().isTriggerNode(addedNodes[0].type);
		return false;
	}
	function shouldPrependManualTrigger(addedNodes) {
		const { selectedView, openSource } = useNodeCreatorStore();
		const hasTrigger = addedNodes.some((node) => useNodeTypesStore().isTriggerNode(node.type));
		const workflowContainsTrigger = workflowDocumentStore.value.workflowTriggerNodes.length > 0;
		const isTriggerPanel = selectedView === TRIGGER_NODE_CREATOR_VIEW;
		const onlyStickyNodes = addedNodes.every((node) => node.type === STICKY_NODE_TYPE);
		return !isNodeCreatorOpenFromConnection(openSource) && !hasTrigger && !workflowContainsTrigger && isTriggerPanel && !onlyStickyNodes;
	}
	function shouldPrependChatTrigger(addedNodes) {
		const COMPATIBLE_CHAT_NODES = [
			QA_CHAIN_NODE_TYPE,
			AGENT_NODE_TYPE,
			MESSAGE_AN_AGENT_NODE_TYPE,
			BASIC_CHAIN_NODE_TYPE,
			OPEN_AI_ASSISTANT_NODE_TYPE,
			OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE
		];
		if (!addedNodes.some((node) => COMPATIBLE_CHAT_NODES.includes(node.type))) return false;
		if (nodeTypesStore.isNodeTypeUnavailable("@n8n/n8n-nodes-langchain.chatTrigger")) return false;
		return workflowDocumentStore.value.allNodes.filter((x) => x.type !== MANUAL_TRIGGER_NODE_TYPE).length === 0;
	}
	function shouldPrependLLMChain(addedNodes) {
		if (workflowDocumentStore.value.aiNodes.length > 0) return false;
		return addedNodes.some((node) => {
			const nodeType = nodeTypesStore.getNodeType(node.type);
			return Object.keys(nodeType?.codex?.subcategories ?? {}).includes(AI_CATEGORY_LANGUAGE_MODELS);
		});
	}
	/**
	* Returns the trigger the node creator was opened from when connecting to
	* an existing node (e.g. dragging a connection out of a trigger's output),
	* or undefined if the creator wasn't opened in that context, the
	* last-interacted-with node isn't a trigger, or a node-replacement is in
	* progress (the "last interacted" node there is the one being removed).
	*/
	function getConnectionTriggerNode() {
		if (nodeCreatorStore.openingContext === "replacement") return void 0;
		const nodeId = uiStore.lastInteractedWithNodeId;
		const node = nodeId ? workflowDocumentStore.value.getNodeById(nodeId) : void 0;
		return node && nodeTypesStore.isTriggerNode(node.type) ? node : void 0;
	}
	function getAddedNodesAndConnections(addedNodes) {
		if (addedNodes.length === 0 || addedNodes.some((node) => isNodeItemRestricted(node.type))) return {
			nodes: [],
			connections: []
		};
		const nodes = [];
		const connections = [];
		const nodeToAutoOpen = addedNodes.find((node) => node.type !== MANUAL_TRIGGER_NODE_TYPE);
		if (nodeToAutoOpen) nodeToAutoOpen.openDetail = true;
		const isConnectingToExistingTrigger = !!getConnectionTriggerNode();
		if (shouldPrependLLMChain(addedNodes) || !isConnectingToExistingTrigger && shouldPrependChatTrigger(addedNodes)) {
			if (shouldPrependLLMChain(addedNodes)) {
				addedNodes.unshift({
					type: CHAIN_LLM_LANGCHAIN_NODE_TYPE,
					isAutoAdd: true
				});
				connections.push({
					from: {
						nodeIndex: 2,
						type: NodeConnectionTypes.AiLanguageModel
					},
					to: { nodeIndex: 1 }
				});
			}
			addedNodes.unshift({
				type: CHAT_TRIGGER_NODE_TYPE,
				isAutoAdd: true
			});
			connections.push({
				from: { nodeIndex: 0 },
				to: { nodeIndex: 1 }
			});
		} else if (shouldPrependManualTrigger(addedNodes)) {
			addedNodes.unshift({
				type: MANUAL_TRIGGER_NODE_TYPE,
				isAutoAdd: true
			});
			connections.push({
				from: { nodeIndex: 0 },
				to: { nodeIndex: 1 }
			});
		} else if (shouldConnectWithExistingTrigger(addedNodes)) connections.push({
			from: { nodeIndex: 0 },
			to: { nodeIndex: 1 }
		});
		addedNodes.forEach((node, index) => {
			if (node.type === "@n8n/n8n-nodes-langchain.openAi.assistant.message") node.type = OPEN_AI_NODE_TYPE;
			nodes.push(node);
			switch (node.type) {
				case SPLIT_IN_BATCHES_NODE_TYPE: {
					const splitInBatchesIndex = index;
					const noOpIndex = splitInBatchesIndex + 1;
					nodes.push({
						type: NO_OP_NODE_TYPE,
						isAutoAdd: true,
						placeholder: true,
						positionOffset: [0, PUSH_NODES_OFFSET],
						name: i18n.baseText("nodeView.replaceMe")
					});
					connections.push({
						from: {
							nodeIndex: splitInBatchesIndex,
							outputIndex: 1
						},
						to: { nodeIndex: noOpIndex }
					}, {
						from: { nodeIndex: noOpIndex },
						to: { nodeIndex: splitInBatchesIndex }
					});
					break;
				}
			}
		});
		const keptIndexes = nodes.flatMap((node, index) => node.isAutoAdd && nodeTypesStore.isNodeTypeUnavailable(node.type) ? [] : [index]);
		return {
			nodes: keptIndexes.map((index) => nodes[index]),
			connections: connections.flatMap(({ from, to }) => {
				const fromIndex = keptIndexes.indexOf(from.nodeIndex);
				const toIndex = keptIndexes.indexOf(to.nodeIndex);
				if (fromIndex === -1 || toIndex === -1) return [];
				return [{
					from: {
						...from,
						nodeIndex: fromIndex
					},
					to: {
						...to,
						nodeIndex: toIndex
					}
				}];
			})
		};
	}
	function setAddedNodeActionParameters(action, telemetry, rootView = "") {
		const { off } = workflowDocumentStore.value.onNodesChange((event) => {
			if (event.action !== CHANGE_ACTION.ADD) return;
			if (!("node" in event.payload) || event.payload.node.type !== action.key) return;
			workflowDocumentStore.value.setLastNodeParameters(action);
			if (telemetry) trackActionSelected(action, telemetry, rootView);
			off();
		});
		return off;
	}
	function trackActionSelected(action, _telemetry, rootView) {
		const payload = {
			node_type: action.key,
			action: action.name,
			source_mode: rootView.toLowerCase(),
			resource: action.value.resource || ""
		};
		useExternalHooks().run("nodeCreateList.addAction", payload);
	}
	return {
		actionsCategoryLocales,
		actionDataToNodeTypeSelectedPayload,
		nodeCreateElementToNodeTypeSelectedPayload,
		getPlaceholderTriggerActions,
		parseCategoryActions,
		getAddedNodesAndConnections,
		getConnectionTriggerNode,
		getActionData,
		setAddedNodeActionParameters,
		shouldPrependChatTrigger
	};
};
//#endregion
export { useActions as t };
