import {
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	OTHER_TRIGGER_NODES_SUBCATEGORY,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	TRANSFORM_DATA_SUBCATEGORY,
	FILES_SUBCATEGORY,
	FLOWS_CONTROL_SUBCATEGORY,
	HELPERS_SUBCATEGORY,
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
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
} from '@/constants';
import { useI18n } from '@/composables';
import type { SimplifiedNodeType } from '@/Interface';
import { NodeConnectionType } from '@/Interface';

export interface NodeViewItem {
	key: string;
	type: string;
	properties: {
		name?: string;
		title: string;
		icon: string;
		iconProps?: {
			color?: string;
		};
		connectionType?: NodeConnectionType;
		panelClass?: string;
		group?: string[];
		description?: string;
		forceIncludeNodes?: string[];
	};
	category?: string | string[];
}

interface NodeView {
	value: string;
	title: string;
	subtitle?: string;
	items: NodeViewItem[];
}

export function AIView(_nodes: SimplifiedNodeType[]): NodeView {
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

	return {
		value: AI_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.aiPanel.aiNodes'),
		subtitle: i18n.baseText('nodeCreator.aiPanel.selectAiNode'),
		items: [
			{
				key: MANUAL_CHAT_TRIGGER_NODE_TYPE,
				type: 'node',
				properties: {
					group: [],
					name: MANUAL_CHAT_TRIGGER_NODE_TYPE,
					displayName: 'Manual Chat Trigger',
					description: 'Runs the flow on new manual chat message',
					icon: 'fa:comments',
				},
			},
			{
				key: AI_CATEGORY_AGENTS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_AGENTS,
					icon: 'robot',
					...getAISubcategoryProperties(NodeConnectionType.Agent),
				},
			},
			{
				key: AI_CATEGORY_CHAINS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_CHAINS,
					icon: 'link',
					...getAISubcategoryProperties(NodeConnectionType.Chain),
				},
			},
			{
				key: AI_CATEGORY_DOCUMENT_LOADERS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_DOCUMENT_LOADERS,
					icon: 'file-import',
					...getAISubcategoryProperties(NodeConnectionType.Document),
				},
			},
			{
				key: AI_CATEGORY_LANGUAGE_MODELS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_LANGUAGE_MODELS,
					icon: 'language',
					...getAISubcategoryProperties(NodeConnectionType.LanguageModel),
				},
			},
			{
				key: AI_CATEGORY_MEMORY,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_MEMORY,
					icon: 'brain',
					...getAISubcategoryProperties(NodeConnectionType.Memory),
				},
			},
			{
				key: AI_CATEGORY_OUTPUTPARSER,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_OUTPUTPARSER,
					icon: 'list',
					...getAISubcategoryProperties(NodeConnectionType.OutputParser),
				},
			},
			{
				key: AI_CATEGORY_RETRIEVERS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_RETRIEVERS,
					icon: 'search',
					...getAISubcategoryProperties(NodeConnectionType.VectorRetriever),
				},
			},
			{
				key: AI_CATEGORY_TEXT_SPLITTERS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_TEXT_SPLITTERS,
					icon: 'remove-format',
					...getAISubcategoryProperties(NodeConnectionType.TextSplitter),
				},
			},
			{
				key: AI_CATEGORY_TOOLS,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_TOOLS,
					icon: 'tools',
					...getAISubcategoryProperties(NodeConnectionType.Tool),
				},
			},
			{
				key: AI_CATEGORY_VECTOR_STORES,
				type: 'subcategory',
				properties: {
					title: AI_CATEGORY_VECTOR_STORES,
					icon: 'project-diagram',
					...getAISubcategoryProperties(NodeConnectionType.VectorStore),
				},
			},
		],
	};
}

export function TriggerView(nodes: SimplifiedNodeType[]) {
	const i18n = useI18n();

	const view: NodeView = {
		value: TRIGGER_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.triggerHelperPanel.selectATrigger'),
		subtitle: i18n.baseText('nodeCreator.triggerHelperPanel.selectATriggerDescription'),
		items: [
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
						icon: 'webhook',
						fileBuffer: '/static/webhook-icon.svg',
					},
				},
			},
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

	const hasAINodes = (nodes ?? []).some((node) => node.codex?.categories?.includes(AI_SUBCATEGORY));
	if (hasAINodes)
		view.items.push({
			key: AI_NODE_CREATOR_VIEW,
			type: 'view',
			properties: {
				title: i18n.baseText('nodeCreator.aiPanel.langchainAiNodes'),
				icon: 'robot',
				description: i18n.baseText('nodeCreator.aiPanel.nodesForAi'),
			},
		});

	return view;
}

export function RegularView(nodes: SimplifiedNodeType[]) {
	const i18n = useI18n();

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
				},
			},
			{
				type: 'subcategory',
				key: TRANSFORM_DATA_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: TRANSFORM_DATA_SUBCATEGORY,
					icon: 'pen',
				},
			},
			{
				type: 'subcategory',
				key: HELPERS_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: HELPERS_SUBCATEGORY,
					icon: 'toolbox',
				},
			},
			{
				type: 'subcategory',
				key: FLOWS_CONTROL_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: FLOWS_CONTROL_SUBCATEGORY,
					icon: 'code-branch',
				},
			},
			{
				type: 'subcategory',
				key: FILES_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: FILES_SUBCATEGORY,
					icon: 'file-alt',
				},
			},
			{
				key: TRIGGER_NODE_CREATOR_VIEW,
				type: 'view',
				properties: {
					title: i18n.baseText('nodeCreator.triggerHelperPanel.addAnotherTrigger'),
					icon: 'bolt',
					description: i18n.baseText('nodeCreator.triggerHelperPanel.addAnotherTriggerDescription'),
				},
			},
		],
	};

	const hasAINodes = (nodes ?? []).some((node) => node.codex?.categories?.includes(AI_SUBCATEGORY));
	if (hasAINodes)
		view.items.push({
			key: AI_NODE_CREATOR_VIEW,
			type: 'view',
			properties: {
				title: i18n.baseText('nodeCreator.aiPanel.langchainAiNodes'),
				icon: 'robot',
				description: i18n.baseText('nodeCreator.aiPanel.nodesForAi'),
			},
		});

	return view;
}
