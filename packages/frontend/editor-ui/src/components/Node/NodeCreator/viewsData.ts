import {
	AI_TRANSFORM_NODE_TYPE,
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	OTHER_TRIGGER_NODES_SUBCATEGORY,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	TRANSFORM_DATA_SUBCATEGORY,
	FLOWS_CONTROL_SUBCATEGORY,
	TRIGGER_NODE_CREATOR_VIEW,
	EMAIL_IMAP_NODE_TYPE,
	DEFAULT_SUBCATEGORY,
	AI_NODE_CREATOR_VIEW,
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_CHAINS,
	AI_CATEGORY_DOCUMENT_LOADERS,
	AI_CATEGORY_LANGUAGE_MODELS,
	AI_CATEGORY_MEMORY,
	AI_CATEGORY_OUTPUTPARSER,
	AI_CATEGORY_RETRIEVERS,
	AI_CATEGORY_TEXT_SPLITTERS,
	AI_CATEGORY_TOOLS,
	AI_CATEGORY_VECTOR_STORES,
	AI_SUBCATEGORY,
	AI_CATEGORY_EMBEDDING,
	AI_OTHERS_NODE_CREATOR_VIEW,
	AI_UNCATEGORIZED_CATEGORY,
	CONVERT_TO_FILE_NODE_TYPE,
	EXTRACT_FROM_FILE_NODE_TYPE,
	SET_NODE_TYPE,
	CODE_NODE_TYPE,
	DATETIME_NODE_TYPE,
	FILTER_NODE_TYPE,
	REMOVE_DUPLICATES_NODE_TYPE,
	SPLIT_OUT_NODE_TYPE,
	LIMIT_NODE_TYPE,
	SUMMARIZE_NODE_TYPE,
	AGGREGATE_NODE_TYPE,
	MERGE_NODE_TYPE,
	HTML_NODE_TYPE,
	MARKDOWN_NODE_TYPE,
	XML_NODE_TYPE,
	CRYPTO_NODE_TYPE,
	IF_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	HELPERS_SUBCATEGORY,
	HITL_SUBCATEGORY,
	RSS_READ_NODE_TYPE,
	EMAIL_SEND_NODE_TYPE,
	EDIT_IMAGE_NODE_TYPE,
	COMPRESSION_NODE_TYPE,
	AI_CODE_TOOL_LANGCHAIN_NODE_TYPE,
	AI_WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	HUMAN_IN_THE_LOOP_CATEGORY,
} from '@/constants';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { SimplifiedNodeType } from '@/Interface';
import type { INodeTypeDescription, NodeConnectionType, Themed } from 'n8n-workflow';
import { EVALUATION_TRIGGER_NODE_TYPE, NodeConnectionTypes } from 'n8n-workflow';
import { useTemplatesStore } from '@/stores/templates.store';
import type { BaseTextKey } from '@n8n/i18n';
import camelCase from 'lodash/camelCase';
import { useSettingsStore } from '@/stores/settings.store';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
export interface NodeViewItemSection {
	key: string;
	title: string;
	items: string[];
}

export interface NodeViewItem {
	key: string;
	type: string;
	properties: {
		name?: string;
		title?: string;
		icon?: Themed<string>;
		iconProps?: {
			color?: string;
		};
		info?: string;
		url?: string;
		connectionType?: NodeConnectionType;
		panelClass?: string;
		group?: string[];
		sections?: NodeViewItemSection[];
		description?: string;
		displayName?: string;
		tag?: {
			type: string;
			text: string;
		};
		forceIncludeNodes?: string[];
		iconData?: { type: 'file'; fileBuffer: string } | { type: 'icon'; icon: string };
	};
	category?: string | string[];
}

interface NodeView {
	value: string;
	title: string;
	info?: string;
	subtitle?: string;
	items: NodeViewItem[];
}

function getNodeView(node: INodeTypeDescription) {
	return {
		key: node.name,
		type: 'node',
		properties: {
			group: [],
			name: node.name,
			displayName: node.displayName,
			title: node.displayName,
			description: node.description,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			icon: node.icon!,
			iconUrl: node.iconUrl,
		},
	};
}

function getAiNodesBySubcategory(nodes: INodeTypeDescription[], subcategory: string) {
	return nodes
		.filter(
			(node) => !node.hidden && node.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(subcategory),
		)
		.map(getNodeView)
		.sort((a, b) => a.properties.displayName.localeCompare(b.properties.displayName));
}

function getEvaluationNode(
	nodeTypesStore: ReturnType<typeof useNodeTypesStore>,
	isEvaluationVariantEnabled: boolean,
) {
	const evaluationNodeStore = nodeTypesStore.getNodeType('n8n-nodes-base.evaluation');

	if (!isEvaluationVariantEnabled || !evaluationNodeStore) {
		return [];
	}

	const evaluationNode = getNodeView(evaluationNodeStore);

	return [
		{
			...evaluationNode,
			properties: {
				...evaluationNode.properties,
				defaults: {
					name: 'Evaluation',
					color: '#c3c9d5',
				},
			},
		},
	];
}

export function AIView(_nodes: SimplifiedNodeType[]): NodeView {
	const i18n = useI18n();
	const nodeTypesStore = useNodeTypesStore();
	const templatesStore = useTemplatesStore();
	const evaluationStore = useEvaluationStore();
	const isEvaluationEnabled = evaluationStore.isEvaluationEnabled;

	const evaluationNode = getEvaluationNode(nodeTypesStore, isEvaluationEnabled);

	const chainNodes = getAiNodesBySubcategory(nodeTypesStore.allLatestNodeTypes, AI_CATEGORY_CHAINS);
	const agentNodes = getAiNodesBySubcategory(nodeTypesStore.allLatestNodeTypes, AI_CATEGORY_AGENTS);

	const websiteCategoryURLParams = templatesStore.websiteTemplateRepositoryParameters;
	websiteCategoryURLParams.append('utm_user_role', 'AdvancedAI');
	const websiteCategoryURL =
		templatesStore.constructTemplateRepositoryURL(websiteCategoryURLParams);

	const askAiEnabled = useSettingsStore().isAskAiEnabled;
	const aiTransformNode = nodeTypesStore.getNodeType(AI_TRANSFORM_NODE_TYPE);
	const transformNode = askAiEnabled && aiTransformNode ? [getNodeView(aiTransformNode)] : [];

	return {
		value: AI_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.aiPanel.aiNodes'),
		subtitle: i18n.baseText('nodeCreator.aiPanel.selectAiNode'),
		items: [
			{
				key: 'ai_templates_root',
				type: 'link',
				properties: {
					title: i18n.baseText('nodeCreator.aiPanel.linkItem.title'),
					icon: 'box-open',
					description: i18n.baseText('nodeCreator.aiPanel.linkItem.description'),
					name: 'ai_templates_root',
					url: websiteCategoryURL,
					tag: {
						type: 'info',
						text: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerTag'),
					},
				},
			},
			...agentNodes,
			...chainNodes,
			...transformNode,
			...evaluationNode,
			{
				key: AI_OTHERS_NODE_CREATOR_VIEW,
				type: 'view',
				properties: {
					title: i18n.baseText('nodeCreator.aiPanel.aiOtherNodes'),
					icon: 'robot',
					description: i18n.baseText('nodeCreator.aiPanel.aiOtherNodesDescription'),
				},
			},
		],
	};
}

export function AINodesView(_nodes: SimplifiedNodeType[]): NodeView {
	const i18n = useI18n();

	function getAISubcategoryProperties(nodeConnectionType: NodeConnectionType) {
		return {
			connectionType: nodeConnectionType,
			iconProps: {
				color: `var(--node-type-${nodeConnectionType}-color)`,
			},
			panelClass: `nodes-list-panel-${nodeConnectionType}`,
		};
	}

	function getSubcategoryInfo(subcategory: string) {
		const localeKey = `nodeCreator.subcategoryInfos.${camelCase(subcategory)}` as BaseTextKey;

		const info = i18n.baseText(localeKey);

		// Return undefined if the locale key is not found
		if (info === localeKey) return undefined;

		return info;
	}

	return {
		value: AI_OTHERS_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.aiPanel.aiOtherNodes'),
		subtitle: i18n.baseText('nodeCreator.aiPanel.selectAiNode'),
		items: [
			{
				key: AI_CATEGORY_DOCUMENT_LOADERS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_DOCUMENT_LOADERS,
					info: getSubcategoryInfo(AI_CATEGORY_DOCUMENT_LOADERS),
					icon: 'file-input',
					...getAISubcategoryProperties(NodeConnectionTypes.AiDocument),
				},
			},
			{
				key: AI_CATEGORY_LANGUAGE_MODELS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_LANGUAGE_MODELS,
					info: getSubcategoryInfo(AI_CATEGORY_LANGUAGE_MODELS),
					icon: 'language',
					...getAISubcategoryProperties(NodeConnectionTypes.AiLanguageModel),
				},
			},
			{
				key: AI_CATEGORY_MEMORY,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_MEMORY,
					info: getSubcategoryInfo(AI_CATEGORY_MEMORY),
					icon: 'brain',
					...getAISubcategoryProperties(NodeConnectionTypes.AiMemory),
				},
			},
			{
				key: AI_CATEGORY_OUTPUTPARSER,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_OUTPUTPARSER,
					info: getSubcategoryInfo(AI_CATEGORY_OUTPUTPARSER),
					icon: 'list',
					...getAISubcategoryProperties(NodeConnectionTypes.AiOutputParser),
				},
			},
			{
				key: AI_CATEGORY_RETRIEVERS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_RETRIEVERS,
					info: getSubcategoryInfo(AI_CATEGORY_RETRIEVERS),
					icon: 'search',
					...getAISubcategoryProperties(NodeConnectionTypes.AiRetriever),
				},
			},
			{
				key: AI_CATEGORY_TEXT_SPLITTERS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_TEXT_SPLITTERS,
					info: getSubcategoryInfo(AI_CATEGORY_TEXT_SPLITTERS),
					icon: 'grip-lines-vertical',
					...getAISubcategoryProperties(NodeConnectionTypes.AiTextSplitter),
				},
			},
			{
				type: 'subcategory',
				key: AI_CATEGORY_TOOLS,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: AI_CATEGORY_TOOLS,
					info: getSubcategoryInfo(AI_CATEGORY_TOOLS),
					icon: 'tools',
					...getAISubcategoryProperties(NodeConnectionTypes.AiTool),
					sections: [
						{
							key: 'popular',
							title: i18n.baseText('nodeCreator.sectionNames.popular'),
							items: [AI_WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE, AI_CODE_TOOL_LANGCHAIN_NODE_TYPE],
						},
					],
				},
			},
			{
				key: AI_CATEGORY_EMBEDDING,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_EMBEDDING,
					info: getSubcategoryInfo(AI_CATEGORY_EMBEDDING),
					icon: 'vector-square',
					...getAISubcategoryProperties(NodeConnectionTypes.AiEmbedding),
				},
			},
			{
				key: AI_CATEGORY_VECTOR_STORES,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_VECTOR_STORES,
					info: getSubcategoryInfo(AI_CATEGORY_VECTOR_STORES),
					icon: 'waypoints',
					...getAISubcategoryProperties(NodeConnectionTypes.AiVectorStore),
				},
			},
			{
				key: AI_UNCATEGORIZED_CATEGORY,
				type: 'subcategory',
				properties: {
					title: AI_UNCATEGORIZED_CATEGORY,
					icon: 'code',
				},
			},
		],
	};
}

export function TriggerView() {
	const i18n = useI18n();
	const evaluationStore = useEvaluationStore();
	const isEvaluationEnabled = evaluationStore.isEvaluationEnabled;

	const evaluationTriggerNode = isEvaluationEnabled
		? {
				key: EVALUATION_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: EVALUATION_TRIGGER_NODE_TYPE,
					displayName: 'When running evaluation',
					description: 'Run a dataset through your workflow to test performance',
					icon: 'fa:check-double',
					defaults: {
						name: 'Evaluation',
						color: '#c3c9d5',
					},
				},
			}
		: null;

	const view: NodeView = {
		value: TRIGGER_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.triggerHelperPanel.selectATrigger'),
		subtitle: i18n.baseText('nodeCreator.triggerHelperPanel.selectATriggerDescription'),
		items: [
			{
				key: MANUAL_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: MANUAL_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerDescription'),
					icon: 'fa:mouse-pointer',
				},
			},
			{
				key: DEFAULT_SUBCATEGORY,
				type: 'subcategory',
				properties: {
					forceIncludeNodes: [WEBHOOK_NODE_TYPE, EMAIL_IMAP_NODE_TYPE],
					title: 'App Trigger Nodes',
					icon: 'satellite-dish',
				},
			},
			{
				key: SCHEDULE_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: SCHEDULE_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDescription'),
					icon: 'fa:clock',
				},
			},
			{
				key: WEBHOOK_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: WEBHOOK_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDescription'),
					iconData: {
						type: 'file',
						fileBuffer: '/static/webhook-icon.svg',
					},
				},
			},
			{
				key: FORM_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: FORM_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.formTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.formTriggerDescription'),
					iconData: {
						type: 'file',
						fileBuffer: '/static/form-grey.svg',
					},
				},
			},
			{
				key: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDescription'),
					icon: 'fa:sign-out-alt',
				},
			},
			{
				key: CHAT_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: CHAT_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.chatTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.chatTriggerDescription'),
					icon: 'fa:comments',
				},
			},
			...(evaluationTriggerNode ? [evaluationTriggerNode] : []),
			{
				type: 'subcategory',
				key: OTHER_TRIGGER_NODES_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: OTHER_TRIGGER_NODES_SUBCATEGORY,
					icon: 'folder-open',
				},
			},
		],
	};

	return view;
}

export function RegularView(nodes: SimplifiedNodeType[]) {
	const i18n = useI18n();

	const popularItemsSubcategory = [
		SET_NODE_TYPE,
		CODE_NODE_TYPE,
		DATETIME_NODE_TYPE,
		AI_TRANSFORM_NODE_TYPE,
	];

	const getSendAndWaitNodes = (nodes: SimplifiedNodeType[]) => {
		return (nodes ?? [])
			.filter((node) => node.codex?.categories?.includes(HUMAN_IN_THE_LOOP_CATEGORY))
			.map((node) => node.name);
	};

	const view: NodeView = {
		value: REGULAR_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.triggerHelperPanel.whatHappensNext'),
		items: [
			{
				key: DEFAULT_SUBCATEGORY,
				type: 'subcategory',
				properties: {
					title: 'App Regular Nodes',
					icon: 'globe',
					forceIncludeNodes: [RSS_READ_NODE_TYPE, EMAIL_SEND_NODE_TYPE],
				},
			},
			{
				type: 'subcategory',
				key: TRANSFORM_DATA_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: TRANSFORM_DATA_SUBCATEGORY,
					icon: 'pen',
					sections: [
						{
							key: 'popular',
							title: i18n.baseText('nodeCreator.sectionNames.popular'),
							items: popularItemsSubcategory,
						},
						{
							key: 'addOrRemove',
							title: i18n.baseText('nodeCreator.sectionNames.transform.addOrRemove'),
							items: [
								FILTER_NODE_TYPE,
								REMOVE_DUPLICATES_NODE_TYPE,
								SPLIT_OUT_NODE_TYPE,
								LIMIT_NODE_TYPE,
							],
						},
						{
							key: 'combine',
							title: i18n.baseText('nodeCreator.sectionNames.transform.combine'),
							items: [SUMMARIZE_NODE_TYPE, AGGREGATE_NODE_TYPE, MERGE_NODE_TYPE],
						},
						{
							key: 'convert',
							title: i18n.baseText('nodeCreator.sectionNames.transform.convert'),
							items: [
								HTML_NODE_TYPE,
								MARKDOWN_NODE_TYPE,
								XML_NODE_TYPE,
								CRYPTO_NODE_TYPE,
								EXTRACT_FROM_FILE_NODE_TYPE,
								CONVERT_TO_FILE_NODE_TYPE,
								COMPRESSION_NODE_TYPE,
								EDIT_IMAGE_NODE_TYPE,
							],
						},
					],
				},
			},
			{
				type: 'subcategory',
				key: FLOWS_CONTROL_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: FLOWS_CONTROL_SUBCATEGORY,
					icon: 'git-branch',
					sections: [
						{
							key: 'popular',
							title: i18n.baseText('nodeCreator.sectionNames.popular'),
							items: [FILTER_NODE_TYPE, IF_NODE_TYPE, SPLIT_IN_BATCHES_NODE_TYPE, MERGE_NODE_TYPE],
						},
					],
				},
			},
			{
				type: 'subcategory',
				key: HELPERS_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: HELPERS_SUBCATEGORY,
					icon: 'toolbox',
					sections: [
						{
							key: 'popular',
							title: i18n.baseText('nodeCreator.sectionNames.popular'),
							items: [HTTP_REQUEST_NODE_TYPE, WEBHOOK_NODE_TYPE, CODE_NODE_TYPE],
						},
					],
				},
			},
			// To add node to this subcategory:
			// - add "HITL" to the "categories" property of the node's codex
			// - add "HITL": ["Human in the Loop"] to the "subcategories" property of the node's codex
			// node has to have the "sendAndWait" operation, if a new operation needs to be included here:
			// - update getHumanInTheLoopActions in packages/frontend/editor-ui/src/components/Node/NodeCreator/Modes/NodesMode.vue
			{
				type: 'subcategory',
				key: HITL_SUBCATEGORY,
				category: HUMAN_IN_THE_LOOP_CATEGORY,
				properties: {
					title: HITL_SUBCATEGORY,
					icon: 'user-check',
					sections: [
						{
							key: 'sendAndWait',
							title: i18n.baseText('nodeCreator.sectionNames.sendAndWait'),
							items: getSendAndWaitNodes(nodes),
						},
					],
				},
			},
		],
	};

	const hasAINodes = (nodes ?? []).some((node) => node.codex?.categories?.includes(AI_SUBCATEGORY));
	if (hasAINodes)
		view.items.unshift({
			key: AI_NODE_CREATOR_VIEW,
			type: 'view',
			properties: {
				title: i18n.baseText('nodeCreator.aiPanel.langchainAiNodes'),
				icon: 'robot',
				description: i18n.baseText('nodeCreator.aiPanel.nodesForAi'),
				borderless: true,
			},
		} as NodeViewItem);

	view.items.push({
		key: TRIGGER_NODE_CREATOR_VIEW,
		type: 'view',
		properties: {
			title: i18n.baseText('nodeCreator.triggerHelperPanel.addAnotherTrigger'),
			icon: 'bolt-filled',
			description: i18n.baseText('nodeCreator.triggerHelperPanel.addAnotherTriggerDescription'),
		},
	});

	return view;
}
