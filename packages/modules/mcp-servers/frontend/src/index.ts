// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { McpServersModule } from './mcp-servers.module';
export {
	MCP_SERVER_CONNECTIONS_VIEW,
	MCP_SERVER_VIEW,
	MCP_SERVERS_LIST_VIEW,
	PROJECT_MCP_SERVERS,
} from './mcp-servers.constants';
export { openCreateMcpServerDialog } from './composables/useCreateMcpServerDialog';
export { listMcpServers, listToolCandidates } from './mcp-servers.api';

// Lazy, so the shell's eager import of this entry keeps the view out of the boot chunk.
export const loadMcpServerView = async () => (await import('./views/McpServerView.vue')).default;
