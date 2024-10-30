import type { Ref } from 'vue';
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
import { useToast } from '@/composables/useToast';
import type { INodeUi } from '@/Interface';
import type { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export function useChatTrigger({ router }: { router: ReturnType<typeof useRouter> }) {
	const chatTriggerName = ref<string | null>(null);
	const connectedNode = ref<INode | null>(null);
	const node = ref<INode | null>(null);
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowHelpers = useWorkflowHelpers({ router });
	// const { showError } = useToast();

	const chatTriggerNode = computed(() =>
		chatTriggerName.value ? workflowsStore.getNodeByName(chatTriggerName.value) : undefined,
	);

	const allowFileUploads = computed(() => {
		console.log('🚀 ~ allowFileUploads ~ chatTrigger.value:', chatTriggerNode.value);
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
		console.log('Set connected node');
		const triggerNode = chatTriggerNode.value;

		if (!triggerNode) {
			// showError(new Error('Chat Trigger Node could not be found!'), 'Trigger Node not found');
			return;
		}

		const chatNode = workflowsStore.getNodes().find((storeNode: INodeUi): boolean => {
			if (storeNode.type === CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE) return false;
			const nodeType = nodeTypesStore.getNodeType(storeNode.type, storeNode.typeVersion);
			if (!nodeType) return false;

			const isAgent = nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_AGENTS);
			const isChain = nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_CHAINS);

			let isCustomChainOrAgent = false;
			if (nodeType.name === AI_CODE_NODE_TYPE) {
				const inputs = NodeHelpers.getNodeInputs(workflow, storeNode, nodeType);
				const inputTypes = NodeHelpers.getConnectionTypes(inputs);

				const outputs = NodeHelpers.getNodeOutputs(workflow, storeNode, nodeType);
				const outputTypes = NodeHelpers.getConnectionTypes(outputs);

				if (
					inputTypes.includes(NodeConnectionType.AiLanguageModel) &&
					inputTypes.includes(NodeConnectionType.Main) &&
					outputTypes.includes(NodeConnectionType.Main)
				) {
					isCustomChainOrAgent = true;
				}
			}

			if (!isAgent && !isChain && !isCustomChainOrAgent) return false;

			const parentNodes = workflow.getParentNodes(storeNode.name);
			const isChatChild = parentNodes.some((parentNodeName) => parentNodeName === triggerNode.name);

			return Boolean(isChatChild && (isAgent || isChain || isCustomChainOrAgent));
		});

		console.log('🚀 ~ setConnectedNode ~ chatNode:', chatNode);
		if (!chatNode) {
			return;
		}

		connectedNode.value = chatNode;
	}

	/** Sets the node that contains metadata */
	function setLogsSourceNode() {
		const triggerNode = chatTriggerNode.value;
		if (!triggerNode) {
			return;
		}

		const workflow = workflowHelpers.getCurrentWorkflow();
		const childNodes = workflow.getChildNodes(triggerNode.name);

		for (const childNode of childNodes) {
			// Look for the first connected node with metadata
			// TODO: Allow later users to change that in the UI
			const resultData = workflowsStore.getWorkflowResultDataByNodeName(childNode);

			if (!resultData && !Array.isArray(resultData)) {
				continue;
			}

			if (resultData[resultData.length - 1].metadata) {
				node.value = workflowsStore.getNodeByName(childNode);
				break;
			}
		}
	}

	return {
		connectedNode,
		node,
		allowFileUploads,
		allowedFilesMimeTypes,
		chatTriggerNode,
		setChatTriggerNode,
		setConnectedNode,
		setLogsSourceNode,
	};
}
