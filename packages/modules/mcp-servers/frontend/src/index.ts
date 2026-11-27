// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { McpServersModule } from './mcp-servers.module';
export { openCreateMcpServerDialog } from './composables/useCreateMcpServerDialog';
