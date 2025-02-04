const { NODE_ENV } = process.env;
export const inProduction = NODE_ENV === 'production';
export const inDevelopment = !NODE_ENV || NODE_ENV === 'development';

export const CUSTOM_EXTENSION_ENV = 'N8N_CUSTOM_EXTENSIONS';
export const PLACEHOLDER_EMPTY_EXECUTION_ID = '__UNKNOWN__';
export const PLACEHOLDER_EMPTY_WORKFLOW_ID = '__EMPTY__';
export const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';
export const HTTP_REQUEST_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolHttpRequest';

export const RESTRICT_FILE_ACCESS_TO = 'N8N_RESTRICT_FILE_ACCESS_TO';
export const BLOCK_FILE_ACCESS_TO_N8N_FILES = 'N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES';
export const CONFIG_FILES = 'N8N_CONFIG_FILES';
export const BINARY_DATA_STORAGE_PATH = 'N8N_BINARY_DATA_STORAGE_PATH';
export const UM_EMAIL_TEMPLATES_INVITE = 'N8N_UM_EMAIL_TEMPLATES_INVITE';
export const UM_EMAIL_TEMPLATES_PWRESET = 'N8N_UM_EMAIL_TEMPLATES_PWRESET';
