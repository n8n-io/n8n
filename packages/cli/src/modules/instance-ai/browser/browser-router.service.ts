import type { McpTool } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { tmpdir } from 'node:os';

import { BrowserLocalMcpServer } from './browser-local-mcp-server';
import { BrowserRouterLocalMcpServer } from './browser-router-local-mcp-server';
import { CloudBrowserService } from './cloud-browser.service';

/** Creates the browser router of each run. */
@Service()
export class BrowserRouterService {
	private browserTools?: Promise<McpTool[]>;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly cloudBrowserService: CloudBrowserService,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async createForRun({
		userId,
		runId,
	}: {
		userId: string;
		runId: string;
	}): Promise<BrowserRouterLocalMcpServer> {
		return new BrowserRouterLocalMcpServer(await this.getBrowserTools(), {
			kind: 'cloud',
			start: async () => await this.cloudBrowserService.startSession(userId, runId),
			end: async () => await this.cloudBrowserService.endSession(runId),
		});
	}

	/** The browser tools are the same for every session, so their schemas are converted once. */
	private async getBrowserTools(): Promise<McpTool[]> {
		this.browserTools ??= this.buildBrowserTools().catch((error: unknown) => {
			this.browserTools = undefined;
			throw error;
		});
		return await this.browserTools;
	}

	private async buildBrowserTools(): Promise<McpTool[]> {
		const { createBrowserTools } = await import('@n8n/mcp-browser');
		// Never connected: it only supplies the tool definitions.
		const toolkit = createBrowserTools({ mode: 'direct-cdp' });
		return new BrowserLocalMcpServer(toolkit, { dir: tmpdir() }, this.logger).getAvailableTools();
	}
}
