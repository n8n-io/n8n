import type { ScopeGroupDefinition } from '@/app/components/scopes/scopes.utils';

export const MCP_ENDPOINT = 'mcp-server/http';
export const MCP_DOCS_PAGE_URL = 'https://docs.n8n.io/advanced-ai/mcp/mcp_tools_reference';

// Display groups for the MCP OAuth consent scope picker, keyed by the
// `resource:` prefix of the scopes in MCP_INSTANCE_SCOPES (@n8n/api-types).
export const MCP_SCOPE_GROUPS: ScopeGroupDefinition[] = [
	{ key: 'workflows', resources: ['workflow', 'tag'] },
	{ key: 'executions', resources: ['execution'] },
	{ key: 'credentials', resources: ['credential'] },
	{ key: 'dataTables', resources: ['dataTable'] },
	{ key: 'projectsAndFolders', resources: ['project'] },
];
export const ELIGIBLE_WORKFLOWS_DOCS_SECTION = 'workflow-eligibility';

export const MCP_SETTINGS_VIEW = 'McpSettings';
export const MCP_STORE = 'mcp';

export const LOADING_INDICATOR_TIMEOUT = 200;
export const MCP_TOOLTIP_DELAY = 100;

export const MCP_CONNECT_POPOVER_WIDTH = 460;

export const MCP_CONNECT_WORKFLOWS_MODAL_KEY = 'mcpConnectWorkflowsModal';
