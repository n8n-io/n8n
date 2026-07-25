import type { Config as BrowserConfig } from '@n8n/mcp-browser';

import { ModuleActivation, type ToolModule } from '../types';

function toBrowserConfig(defaultBrowser: string): Partial<BrowserConfig> {
	const browserConfig: Partial<BrowserConfig> = { adapter: 'agent-browser' };
	if (defaultBrowser) {
		browserConfig.defaultBrowser = defaultBrowser as BrowserConfig['defaultBrowser'];
	}
	return browserConfig;
}

async function loadMcpBrowser() {
	try {
		return await import('@n8n/mcp-browser');
	} catch {
		return null;
	}
}

export const BrowserModule: ToolModule = {
	name: 'Browser',
	category: 'browser',
	permissionGroup: 'browser',
	async activate({ config }) {
		const mcpBrowser = await loadMcpBrowser();
		if (!mcpBrowser) {
			return ModuleActivation.unsupported('@n8n/mcp-browser is not available');
		}
		if (config.logLevel) {
			mcpBrowser.configureLogger({ level: config.logLevel });
		}
		const { tools, connection } = mcpBrowser.createBrowserTools(
			toBrowserConfig(config.browser.defaultBrowser),
		);
		return ModuleActivation.supported(tools, async () => await connection.shutdown());
	},
};
