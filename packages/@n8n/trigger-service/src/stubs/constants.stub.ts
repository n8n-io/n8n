/**
 * Stub constants for trigger-service
 */

export const TEST_WEBHOOK_TIMEOUT = 120000; // 2 minutes
export const TEST_WEBHOOK_TIMEOUT_BUFFER = 10000; // 10 seconds
export const AUTH_COOKIE_NAME = 'n8n-auth';
export const MCP_TRIGGER_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpTrigger';

export const STARTING_NODES = [
	'@n8n/n8n-nodes-langchain.manualChatTrigger',
	'n8n-nodes-base.start',
	'n8n-nodes-base.manualTrigger',
];

export const WORKFLOW_REACTIVATE_INITIAL_TIMEOUT = 1000; // 1 second
export const WORKFLOW_REACTIVATE_MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day
