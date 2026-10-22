// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import type { McpCallerAuth } from '@n8n/backend-services/auth';

interface McpConnection {
	userId: string;
	clientName?: string;
	caller?: McpCallerAuth;
}

// These internal events do not forward credential identifiers to telemetry.
export interface McpDiscoveryEventMap {
	'experiment-user-first-login': { userId: string; at: number };
	'experiment-assistant-change-saved': { userId: string; at: number };
	'experiment-mcp-client-connected': McpConnection;
	'experiment-mcp-workflow-write-completed': {
		userId: string;
		toolName: string;
		status: 'success' | 'error';
		workflowId?: string;
		structuredContent?: unknown;
	};
}

declare module '@n8n/backend-services' {
	interface EventMap extends McpDiscoveryEventMap {}
}
// EOF Experiment cleanup
