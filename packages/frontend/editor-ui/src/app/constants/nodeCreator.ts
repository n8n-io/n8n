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
	TAB: 'tab',
	NODE_CONNECTION_ACTION: 'node_connection_action',
	REPLACE_NODE_ACTION: 'replace_node_action',
	NODE_CONNECTION_DROP: 'node_connection_drop',
	NOTICE_ERROR_MESSAGE: 'notice_error_message',
	CONTEXT_MENU: 'context_menu',
	ADD_EVALUATION_NODE_BUTTON: 'add_evaluation_node_button',
	ADD_EVALUATION_TRIGGER_BUTTON: 'add_evaluation_trigger_button',
	TEMPLATES_CALLOUT: 'templates_callout',
	'': '',
};
export const CORE_NODES_CATEGORY = 'Core Nodes';
export const HUMAN_IN_THE_LOOP_CATEGORY = 'HITL';
export const CUSTOM_NODES_CATEGORY = 'Custom Nodes';
export const DEFAULT_SUBCATEGORY = '*';
export const AI_OTHERS_NODE_CREATOR_VIEW = 'AI Other';
export const AI_NODE_CREATOR_VIEW = 'AI';
export const REGULAR_NODE_CREATOR_VIEW = 'Regular';
export const TRIGGER_NODE_CREATOR_VIEW = 'Trigger';
export const OTHER_TRIGGER_NODES_SUBCATEGORY = 'Other Trigger Nodes';
export const TRANSFORM_DATA_SUBCATEGORY = 'Data Transformation';
export const FILES_SUBCATEGORY = 'Files';
export const FLOWS_CONTROL_SUBCATEGORY = 'Flow';
export const AI_SUBCATEGORY = 'AI';
export const HELPERS_SUBCATEGORY = 'Helpers';
export const HITL_SUBCATEGORY = 'Human in the Loop';
export const AI_CATEGORY_AGENTS = 'Agents';
export const AI_CATEGORY_CHAINS = 'Chains';
export const AI_CATEGORY_LANGUAGE_MODELS = 'Language Models';
export const AI_CATEGORY_MEMORY = 'Memory';
export const AI_CATEGORY_OUTPUTPARSER = 'Output Parsers';
export const AI_CATEGORY_TOOLS = 'Tools';
export const AI_CATEGORY_VECTOR_STORES = 'Vector Stores';
export const AI_CATEGORY_RETRIEVERS = 'Retrievers';
export const AI_CATEGORY_EMBEDDING = 'Embeddings';
export const AI_CATEGORY_DOCUMENT_LOADERS = 'Document Loaders';
export const AI_CATEGORY_TEXT_SPLITTERS = 'Text Splitters';
export const AI_CATEGORY_OTHER_TOOLS = 'Other Tools';
export const AI_CATEGORY_ROOT_NODES = 'Root Nodes';
export const AI_CATEGORY_MCP_NODES = 'Model Context Protocol';
export const AI_EVALUATION = 'Evaluation';
export const AI_UNCATEGORIZED_CATEGORY = 'Miscellaneous';
export const AI_CODE_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolCode';
export const AI_WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolWorkflow';
export const REQUEST_NODE_FORM_URL = 'https://n8n-community.typeform.com/to/K1fBVTZ3';
export const PRE_BUILT_AGENTS_COLLECTION = 'pre-built-agents-collection';

export const RECOMMENDED_NODES: string[] = [DATA_TABLE_NODE_TYPE, DATA_TABLE_TOOL_NODE_TYPE];
export const BETA_NODES: string[] = [];
