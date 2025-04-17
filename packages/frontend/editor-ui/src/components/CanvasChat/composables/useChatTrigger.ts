import type { ComputedRef, MaybeRef } from 'vue';
import { ref, computed, unref } from 'vue';
import {
	CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE,
	NodeConnectionTypes,
	NodeHelpers,
} from 'n8n-workflow';
import type { INodeTypeDescription, Workflow, INode, INodeParameters } from 'n8n-workflow';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_CHAINS,
	AI_CODE_NODE_TYPE,
	AI_SUBCATEGORY,
} from '@/constants';
import type { INodeUi } from '@/Interface';
import { isChatNode } from '@/components/CanvasChat/utils';

export interface ChatTriggerDependencies {
	getNodeByName: (name: string) => INodeUi | null;
	getNodeType: (type: string, version: number) => INodeTypeDescription | null;
	canvasNodes: MaybeRef<INodeUi[]>;
	workflow: ComputedRef<Workflow>;
}

export function useChatTrigger({
	getNodeByName,
	getNodeType,
	canvasNodes,
	workflow,
}: ChatTriggerDependencies) {
	const chatTriggerName = ref<string | null>(null);
	const connectedNode = ref<INode | null>(null);

	const chatTriggerNode = computed(() =>
		chatTriggerName.value ? getNodeByName(chatTriggerName.value) : null,
	);

	const allowFileUploads = computed(() => {
		return (
			(chatTriggerNode.value?.parameters?.options as INodeParameters)?.allowFileUploads === true
		);
	});

	const allowedFilesMimeTypes = computed(() => {
		return (
			(
				chatTriggerNode.value?.parameters?.options as INodeParameters
			)?.allowedFilesMimeTypes?.toString() ?? ''
		);
	});

	/** Gets the chat trigger node from the workflow */
	function setChatTriggerNode() {
		const triggerNode = unref(canvasNodes).find(isChatNode);

		if (!triggerNode) {
			return;
		}
		chatTriggerName.value = triggerNode.name;
	}

	/** Sets the connected node after finding the trigger */
	function setConnectedNode() {
		const triggerNode = chatTriggerNode.value;

		if (!triggerNode) {
			return;
		}

		const chatChildren = workflow.value.getChildNodes(triggerNode.name);

		const chatRootNode = chatChildren
			.reverse()
			.map((nodeName: string) => getNodeByName(nodeName))
			.filter((n): n is INodeUi => n !== null)
			// Reverse the nodes to match the last node logs first
			.reverse()
			.find((storeNode: INodeUi): boolean => {
				// Skip summarization nodes
				if (storeNode.type === CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE) return false;
				const nodeType = getNodeType(storeNode.type, storeNode.typeVersion);

				if (!nodeType) return false;

				// Check if node is an AI agent or chain based on its metadata
				const isAgent =
					nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_AGENTS);
				const isChain =
					nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_CHAINS);

				// Handle custom AI Langchain Code nodes that could act as chains or agents
				let isCustomChainOrAgent = false;
				if (nodeType.name === AI_CODE_NODE_TYPE) {
					// Get node connection types for inputs and outputs
					const inputs = NodeHelpers.getNodeInputs(workflow.value, storeNode, nodeType);
					const inputTypes = NodeHelpers.getConnectionTypes(inputs);

					const outputs = NodeHelpers.getNodeOutputs(workflow.value, storeNode, nodeType);
					const outputTypes = NodeHelpers.getConnectionTypes(outputs);

					// Validate if node has required AI connection types
					if (
						inputTypes.includes(NodeConnectionTypes.AiLanguageModel) &&
						inputTypes.includes(NodeConnectionTypes.Main) &&
						outputTypes.includes(NodeConnectionTypes.Main)
					) {
						isCustomChainOrAgent = true;
					}
				}

				// Skip if node is not an AI component
				if (!isAgent && !isChain && !isCustomChainOrAgent) return false;

				// Check if this node is connected to the trigger node
				const parentNodes = workflow.value.getParentNodes(storeNode.name);
				const isChatChild = parentNodes.some(
					(parentNodeName) => parentNodeName === triggerNode.name,
				);

				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				const result = Boolean(isChatChild && (isAgent || isChain || isCustomChainOrAgent));
				return result;
			});
		connectedNode.value = chatRootNode ?? null;
	}

	return {
		allowFileUploads,
		allowedFilesMimeTypes,
		chatTriggerNode,
		connectedNode: computed(() => connectedNode.value),
		setChatTriggerNode,
		setConnectedNode,
	};
}
