// The module's public entry for consumers. The shell imports the descriptor from
// `./mcp.module` instead, so the boot chunk does not pull in the store and the
// components below.
export { useMCPStore } from './mcp.store';
export { useMcp } from './composables/useMcp';
export type { ToggleWorkflowsMcpAccessResponse } from './mcp.api';
export { MCP_DOCS_PAGE_URL, MCP_SCOPE_GROUPS, MCP_SETTINGS_VIEW } from './mcp.constants';
export { getClientBrand } from './clients.utils';
export { default as McpAccessToggle } from './components/McpAccessToggle.vue';
export { default as McpClientLogoCards } from './components/McpClientLogoCards.vue';
