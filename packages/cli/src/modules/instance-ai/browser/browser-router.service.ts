import type { McpTool } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { BrowserUsePreference } from 'n8n-workflow';
import { tmpdir } from 'node:os';

import { BrowserLocalMcpServer } from './browser-local-mcp-server';
import {
	BrowserRouterLocalMcpServer,
	type BrowserBackend,
} from './browser-router-local-mcp-server';
import { CloudBrowserService } from './cloud-browser.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';

/** Decides which browser server each run gets, and creates its router. */
@Service()
export class BrowserRouterService {
	private browserTools?: Promise<McpTool[]>;

	/** Browser picked "for this chat", by thread. Kept in memory, so a restart asks again. */
	private readonly chatPreferences = new Map<string, BrowserUsePreference>();

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly cloudBrowserService: CloudBrowserService,
		private readonly settingsService: InstanceAiSettingsService,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/**
	 * The browser server for a run: the extension's server, a router over the cloud
	 * browser (and the extension, when the user hasn't picked one), or nothing.
	 */
	async resolveForRun({
		user,
		threadId,
		runId,
		extensionServer,
		cloudBrowserEnabled,
	}: {
		user: User;
		threadId: string;
		runId: string;
		extensionServer: BrowserLocalMcpServer | undefined;
		cloudBrowserEnabled: boolean;
	}): Promise<BrowserLocalMcpServer | BrowserRouterLocalMcpServer | undefined> {
		if (!cloudBrowserEnabled) return extensionServer;

		const cloud: BrowserBackend = {
			kind: 'cloud',
			start: async () => await this.cloudBrowserService.startSession(user.id, runId, threadId),
			end: async () => await this.cloudBrowserService.endSession(runId),
		};
		// A run's agent can be rebuilt (e.g. on resume), so keep any session it already opened.
		const activeServer = this.cloudBrowserService.getSessionServer(runId);
		if (!extensionServer || activeServer) {
			return new BrowserRouterLocalMcpServer(await this.getBrowserTools(), [cloud], {
				activeServer,
			});
		}

		const preference =
			this.chatPreferences.get(threadId) ?? this.settingsService.getBrowserUsePreference(user);
		if (preference === 'local') return extensionServer;
		if (preference === 'cloud') {
			return new BrowserRouterLocalMcpServer(await this.getBrowserTools(), [cloud]);
		}

		const local: BrowserBackend = {
			kind: 'local',
			start: async () => extensionServer,
			end: async () => {},
		};
		return new BrowserRouterLocalMcpServer(await this.getBrowserTools(), [local, cloud], {
			onChoice: async (kind, scope) => {
				if (scope === 'chat') {
					this.chatPreferences.set(threadId, kind);
					return;
				}
				await this.settingsService.updateUserPreferences(user, { browserUsePreference: kind });
			},
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
