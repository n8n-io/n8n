import { CODEX_AI_CATEGORY, CODEX_AI_SUBCATEGORIES } from '@n8n/constants';
import type { NodeCreatorOpenSource } from '@/Interface';
import { DATA_TABLE_NODE_TYPE, DATA_TABLE_TOOL_NODE_TYPE } from './nodeTypes';

export const TEMPLATE_CATEGORY_AI = 'categories/ai';

export const NODE_CREATOR_OPEN_SOURCES: Record<
	Uppercase<NodeCreatorOpenSource>,
	NodeCreatorOpenSource
> = {
	NO_TRIGGER_EXECUTION_TOOLTIP: 'no_trigger_execution_tooltip',
	PLUS_ENDPOINT: 'plus_endpoint',
	ADD_INPUT_ENDPOINT: 'add_input_endpoint',
	TRIGGER_PLACEHOLDER_BUTTON: 'trigger_placeholder_button',
	ADD_NODE_BUTTON: 'add_node_button',
	NODE_SHORTCUT: 'node_shortcut',
	NODE_CONNECTION_ACTION: 'node_connection_action',
	REPLACE_NODE_ACTION: 'replace_node_action',
	NODE_CONNECTION_DROP: 'node_connection_drop',
	NOTICE_ERROR_MESSAGE: 'notice_error_message',
	CONTEXT_MENU: 'context_menu',
	ADD_EVALUATION_NODE_BUTTON: 'add_evaluation_node_button',
	TEMPLATES_CALLOUT: 'templates_callout',
	INSTANCE_AI: 'instance_ai',
	'': '',
};

export function isNodeCreatorOpenFromConnection(source: NodeCreatorOpenSource) {
	return [
		NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
		NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
		NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
	].includes(source);
}

export const CORE_NODES_CATEGORY = 'Core Nodes';
export const HUMAN_IN_THE_LOOP_CATEGORY = 'HITL';
export const CUSTOM_NODES_CATEGORY = 'Custom Nodes';
export const DEFAULT_SUBCATEGORY = '*';
export const AI_OTHERS_NODE_CREATOR_VIEW = 'AI Other';
export const AI_NODE_CREATOR_VIEW = 'AI';
export const REGULAR_NODE_CREATOR_VIEW = 'Regular';
export const TRIGGER_NODE_CREATOR_VIEW = 'Trigger';
export const ADD_EMPTY_GROUP_NODE_CREATOR_ITEM = 'add-empty-group';
export const OTHER_TRIGGER_NODES_SUBCATEGORY = 'Other Trigger Nodes';
export const TRANSFORM_DATA_SUBCATEGORY = 'Data Transformation';
export const FILES_SUBCATEGORY = 'Files';
export const FLOWS_CONTROL_SUBCATEGORY = 'Flow';
export const AI_SUBCATEGORY = CODEX_AI_CATEGORY;
export const HELPERS_SUBCATEGORY = 'Helpers';
export const HITL_SUBCATEGORY = CODEX_AI_SUBCATEGORIES.HUMAN_IN_THE_LOOP;
export const AI_CATEGORY_AGENTS = CODEX_AI_SUBCATEGORIES.AGENTS;
export const AI_CATEGORY_CHAINS = CODEX_AI_SUBCATEGORIES.CHAINS;
export const AI_CATEGORY_LANGUAGE_MODELS = CODEX_AI_SUBCATEGORIES.LANGUAGE_MODELS;
export const AI_CATEGORY_MEMORY = CODEX_AI_SUBCATEGORIES.MEMORY;
export const AI_CATEGORY_OUTPUTPARSER = CODEX_AI_SUBCATEGORIES.OUTPUT_PARSERS;
export const AI_CATEGORY_TOOLS = CODEX_AI_SUBCATEGORIES.TOOLS;
export const AI_CATEGORY_VECTOR_STORES = CODEX_AI_SUBCATEGORIES.VECTOR_STORES;
export const AI_CATEGORY_RETRIEVERS = CODEX_AI_SUBCATEGORIES.RETRIEVERS;
export const AI_CATEGORY_EMBEDDING = CODEX_AI_SUBCATEGORIES.EMBEDDINGS;
export const AI_CATEGORY_DOCUMENT_LOADERS = CODEX_AI_SUBCATEGORIES.DOCUMENT_LOADERS;
export const AI_CATEGORY_TEXT_SPLITTERS = CODEX_AI_SUBCATEGORIES.TEXT_SPLITTERS;
export const AI_CATEGORY_OTHER_TOOLS = CODEX_AI_SUBCATEGORIES.OTHER_TOOLS;
export const AI_CATEGORY_ROOT_NODES = CODEX_AI_SUBCATEGORIES.ROOT_NODES;
export const AI_CATEGORY_MCP_NODES = CODEX_AI_SUBCATEGORIES.MODEL_CONTEXT_PROTOCOL;
export const AI_CATEGORY_HUMAN_IN_THE_LOOP = CODEX_AI_SUBCATEGORIES.HUMAN_IN_THE_LOOP;
export const AI_EVALUATION = CODEX_AI_SUBCATEGORIES.EVALUATION;
export const AI_UNCATEGORIZED_CATEGORY = CODEX_AI_SUBCATEGORIES.MISCELLANEOUS;
export const AI_CODE_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolCode';
export const AI_WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolWorkflow';
export const AI_SECTION_RECOMMENDED_TOOLS = 'Recommended Tools';
export const REQUEST_NODE_FORM_URL = 'https://n8n-community.typeform.com/to/K1fBVTZ3';
export const SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY = 'config_suggest_service_form_url';

export const RECOMMENDED_NODES: string[] = [DATA_TABLE_NODE_TYPE, DATA_TABLE_TOOL_NODE_TYPE];
export const BETA_NODES: string[] = ['@n8n/n8n-nodes-langchain.microsoftAgent365Trigger'];

export const NEW_TOOL_CATEGORIES: string[] = [AI_CATEGORY_MCP_NODES];
