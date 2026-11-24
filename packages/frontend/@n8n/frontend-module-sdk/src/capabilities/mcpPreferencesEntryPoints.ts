import { declareCapability } from '../declareCapability';
import type { McpPreferencesEntryPoints } from '../types/capability';

export const mcpPreferencesEntryPoints = declareCapability<McpPreferencesEntryPoints>(
	'mcp-preferences-entry-points',
);
