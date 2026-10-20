import { i18n } from '@n8n/i18n';
import McpConnectHint from './McpConnectHint.vue';
import { useMcpDiscoveryStore } from './mcpDiscovery.store';

export const mcpDiscoverySettings = {
	connectHint: McpConnectHint,
	overrides: () => {
		const discovery = useMcpDiscoveryStore();
		if (!discovery.isTreatment) return undefined;
		return {
			description: i18n.baseText('experiments.mcpDiscovery.settings.mcp.page.description'),
			docsLeadingText: i18n.baseText('settings.mcp.page.docsLeadingText'),
			clientTitle: i18n.baseText('experiments.mcpDiscovery.settings.mcp.yourClient.title'),
			clientDescription: i18n.baseText(
				'experiments.mcpDiscovery.settings.mcp.yourClient.description',
			),
			connectVariant: discovery.state.hasConnectedClaude
				? ('outline' as const)
				: ('solid' as const),
		};
	},
};
