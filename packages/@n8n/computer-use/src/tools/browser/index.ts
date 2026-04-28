import type { Config as BrowserConfig } from '@n8n/mcp-browser';

import { logger, type LogLevel } from '../../logger';
import type { ToolDefinition, ToolModule } from '../types';

export interface BrowserModuleConfig {
	defaultBrowser?: string;
	logLevel?: LogLevel;
}

function toBrowserConfig(config: BrowserModuleConfig): Partial<BrowserConfig> {
	const browserConfig: Partial<BrowserConfig> = {};
	if (config.defaultBrowser) {
		browserConfig.defaultBrowser = config.defaultBrowser as BrowserConfig['defaultBrowser'];
	}
	return browserConfig;
}

/**
 * ToolModule that exposes @n8n/mcp-browser tools through the gateway.
 *
 * Use `BrowserModule.create()` to construct — it dynamically imports
 * `@n8n/mcp-browser` and initialises the BrowserConnection and tools.
 */
export class BrowserModule implements ToolModule {
	private connection: { shutdown(): Promise<void> };

	definitions: ToolDefinition[];

	private constructor(definitions: ToolDefinition[], connection: { shutdown(): Promise<void> }) {
		this.definitions = definitions;
		this.connection = connection;
	}

	/**
	 * Create a BrowserModule if `@n8n/mcp-browser` is available.
	 * Returns `null` when the package cannot be imported.
	 */
	static async create(config: BrowserModuleConfig = {}): Promise<BrowserModule | null> {
		try {
			const { createBrowserTools, configureLogger } = await import('@n8n/mcp-browser');
			if (config.logLevel) {
				configureLogger({ level: config.logLevel });
			}
			const { tools, connection } = createBrowserTools(toBrowserConfig(config));
			return new BrowserModule(tools, connection);
		} catch {
			logger.info('Browser module not supported', { reason: '@n8n/mcp-browser not available' });
			return null;
		}
	}

	isSupported() {
		return true;
	}

	/** Shut down the BrowserConnection and close the browser. */
	async shutdown(): Promise<void> {
		await this.connection.shutdown();
	}
}
