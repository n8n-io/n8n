import { computed } from 'vue';

import { declareCapability } from '../declareCapability';
import type { McpServerAssistantHandoff } from '../types/capability';

/** Call during component setup so the shell can capture its router context. */
export const createMcpServerAssistantHandoff = declareCapability<() => McpServerAssistantHandoff>(
	'create-mcp-server-assistant-handoff',
	{
		fallback: () => ({
			available: computed(() => false),
			openServer: async () => false,
		}),
	},
);
