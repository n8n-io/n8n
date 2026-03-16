import type { Config as BrowserConfig } from '@n8n/mcp-browser';

import { logger } from '../../logger';
import type { ToolDefinition, ToolModule } from '../types';

export interface BrowserModuleConfig {
	headless?: boolean;
	defaultBrowser?: string;
	viewport?: { width: number; height: number };
	sessionTtlMs?: number;
	maxConcurrentSessions?: number;
}

function toBrowserConfig(config: BrowserModuleConfig): Partial<BrowserConfig> {
	const browserConfig: Partial<BrowserConfig> = {
		headless: config.headless ?? false,
	};
	if (config.defaultBrowser) {
		browserConfig.defaultBrowser = config.defaultBrowser as BrowserConfig['defaultBrowser'];
	}
	if (config.viewport) {
		browserConfig.viewport = config.viewport;
	}
	if (config.sessionTtlMs) {
		browserConfig.sessionTtlMs = config.sessionTtlMs;
	}
	if (config.maxConcurrentSessions) {
		browserConfig.maxConcurrentSessions = config.maxConcurrentSessions;
	}
	return browserConfig;
}

/**
 * ToolModule that exposes @n8n/mcp-browser tools through the gateway.
 *
 * Use `BrowserModule.create()` to construct — it dynamically imports
 * `@n8n/mcp-browser` and initialises the SessionManager and tools.
 */
export class BrowserModule implements ToolModule {
	private sessionManager: { shutdown(): Promise<void> };

	definitions: ToolDefinition[];

	private constructor(
		definitions: ToolDefinition[],
		sessionManager: { shutdown(): Promise<void> },
	) {
		this.definitions = definitions;
		this.sessionManager = sessionManager;
	}

	/**
	 * Create a BrowserModule if `@n8n/mcp-browser` is available.
	 * Returns `null` when the package cannot be imported.
	 */
	static async create(config: BrowserModuleConfig = {}): Promise<BrowserModule | null> {
		try {
			const { createBrowserTools } = await import('@n8n/mcp-browser');
			const { tools, sessionManager } = createBrowserTools(toBrowserConfig(config));
			return new BrowserModule(tools, sessionManager);
		} catch {
			logger.info('Browser module not supported', { reason: '@n8n/mcp-browser not available' });
			return null;
		}
	}

	isSupported() {
		return true;
	}

	/** Shut down the SessionManager and close all browser sessions. */
	async shutdown(): Promise<void> {
		await this.sessionManager.shutdown();
	}
}
