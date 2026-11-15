// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { declareCapability } from '../declareCapability';
import type { Component } from 'vue';

export interface McpDiscoverySettings {
	connectHint: Component;
	overrides():
		| {
				description: string;
				docsLeadingText: string;
				clientTitle: string;
				clientDescription: string;
				connectVariant: 'solid' | 'outline';
		  }
		| undefined;
}

/** Optional experiment settings supplied by the shell. No provider means no treatment. */
export const mcpDiscoverySettings =
	declareCapability<McpDiscoverySettings>('mcp-discovery-settings');
// EOF Experiment cleanup
