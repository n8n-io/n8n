import { ref, computed } from 'vue';
import {
	CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE,
	NodeConnectionType,
	NodeHelpers,
	type INode,
	type INodeParameters,
	type INodeType,
} from 'n8n-workflow';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_CHAINS,
	AI_CODE_NODE_TYPE,
	AI_SUBCATEGORY,
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
} from '@/constants';
import type { INodeUi } from '@/Interface';
import type { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export function useChatTrigger({ router }: { router: ReturnType<typeof useRouter> }) {
	const chatTriggerName = ref<string | null>(null);
	const connectedNode = ref<INode | null>(null);
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowHelpers = useWorkflowHelpers({ router });

	const chatTriggerNode = computed(() =>
		chatTriggerName.value ? workflowsStore.getNodeByName(chatTriggerName.value) : null,
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
		const triggerNode = workflowHelpers
			.getCurrentWorkflow()
			.queryNodes((nodeType: INodeType) =>
				[CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(nodeType.description.name),
			);

		if (!triggerNode.length) {
			return;
		}
		chatTriggerName.value = triggerNode[0].name;
	}

	/** Sets the connected node after finding the trigger */
	function setConnectedNode() {
		const workflow = workflowHelpers.getCurrentWorkflow();
		const triggerNode = chatTriggerNode.value;

		if (!triggerNode) {
			return;
		}

		const chatChildren = workflow.getChildNodes(triggerNode.name);

		const chatRootNode = chatChildren
			.reverse()
			.map((nodeName: string) => workflowsStore.getNodeByName(nodeName))
			.filter((n): n is INodeUi => n !== null)
			// Reverse the nodes to match the last node logs first
			.reverse()
			.find((storeNode: INodeUi): boolean => {
				// Skip summarization nodes
				if (storeNode.type === CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE) return false;
				const nodeType = nodeTypesStore.getNodeType(storeNode.type, storeNode.typeVersion);

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
					const inputs = NodeHelpers.getNodeInputs(workflow, storeNode, nodeType);
					const inputTypes = NodeHelpers.getConnectionTypes(inputs);

					const outputs = NodeHelpers.getNodeOutputs(workflow, storeNode, nodeType);
					const outputTypes = NodeHelpers.getConnectionTypes(outputs);

					// Validate if node has required AI connection types
					if (
						inputTypes.includes(NodeConnectionType.AiLanguageModel) &&
						inputTypes.includes(NodeConnectionType.Main) &&
						outputTypes.includes(NodeConnectionType.Main)
					) {
						isCustomChainOrAgent = true;
					}
				}

				// Skip if node is not an AI component
				if (!isAgent && !isChain && !isCustomChainOrAgent) return false;

				// Check if this node is connected to the trigger node
				const parentNodes = workflow.getParentNodes(storeNode.name);
				const isChatChild = parentNodes.some(
					(parentNodeName) => parentNodeName === triggerNode.name,
				);

				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				const resut = Boolean(isChatChild && (isAgent || isChain || isCustomChainOrAgent));
				return resut;
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
