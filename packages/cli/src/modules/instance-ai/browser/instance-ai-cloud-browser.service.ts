import {
	INSTANCE_AI_CLOUD_BROWSER_FLAG,
	type InstanceAiCloudBrowserLiveViewResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { tmpdir } from 'node:os';

import { CredentialsService } from '@/credentials/credentials.service';
import { PostHogClient } from '@/posthog';
import { AiGatewayBrowserUseService } from '@/services/ai-gateway-browser-use.service';

import {
	createBrowserCredential,
	createInMemorySecretsBuffer,
	type BrowserDomainGate,
} from './browser.helpers';
import { CloudBrowserLocalMcpServer } from './cloud-browser-local-mcp-server';
import type { CloudBrowserSessionProvider } from './cloud-browser-session-provider';

/** Creates the cloud browser for a background task. Each task gets its own server. */
@Service()
export class InstanceAiCloudBrowserService {
	private readonly logger: Logger;

	private readonly serversByTaskId = new Map<
		string,
		{ userId: string; threadId: string; server: CloudBrowserLocalMcpServer }
	>();

	constructor(
		logger: Logger,
		private readonly aiGatewayBrowserUseService: AiGatewayBrowserUseService,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
		private readonly postHogClient: PostHogClient,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/**
	 * Whether the cloud browser is available to this instance. The admin setting decides whether
	 * it is used. Checks the following:
	 * - AI gateway browser use is enabled
	 * - the PostHog rollout flag is on for the instance
	 */
	async isAvailable(): Promise<boolean> {
		if (!this.aiGatewayBrowserUseService.isGatewayBrowserUseEnabled()) return false;

		const featureFlag = await this.postHogClient.getFeatureFlagForInstance(
			INSTANCE_AI_CLOUD_BROWSER_FLAG,
		);
		return featureFlag === true;
	}

	/**
	 * Returns the task's server, and creates it on first use. `domainGate` holds the sites the user
	 * approved and the admin's permissions. Each call replaces the gate of the task's server, so
	 * the newest permissions apply.
	 */
	async createServer(
		userId: string,
		threadId: string,
		taskId: string,
		domainGate: BrowserDomainGate,
	): Promise<CloudBrowserLocalMcpServer> {
		const isAvailable = await this.isAvailable();
		if (!isAvailable) throw new UserError('The cloud browser is not available on this instance');

		const { createBrowserTools } = await import('@n8n/mcp-browser');

		const existing = this.serversByTaskId.get(taskId);
		if (existing) {
			if (existing.userId !== userId) {
				throw new UnexpectedError('Cloud browser task belongs to another user', {
					extra: { taskId },
				});
			}
			existing.server.setDomainGate(domainGate);
			return existing.server;
		}

		const server = new CloudBrowserLocalMcpServer({
			scope: { userId, threadId, taskId },
			sessionProvider: this.getSessionProvider(taskId),
			createToolkit: (connectUrl) =>
				createBrowserTools({ mode: 'remote' }, { cdpEndpoint: connectUrl }),
			toolContext: {
				// No tool the cloud browser shows reads `dir`. Before you show a tool that reads
				// or writes files, give each user a folder of their own, as the extension browser does.
				dir: tmpdir(),
				// One buffer per task, so a task never sees secrets captured by another.
				secretsBuffer: createInMemorySecretsBuffer(),
				createCredential: async (payload) =>
					await createBrowserCredential(
						this.userRepository,
						this.credentialsService,
						userId,
						payload,
					),
			},
			domainGate,
			logger: this.logger,
		});
		this.serversByTaskId.set(taskId, { userId, threadId, server });
		return server;
	}

	findServer(taskId: string): CloudBrowserLocalMcpServer | undefined {
		return this.serversByTaskId.get(taskId)?.server;
	}

	/**
	 * The live view of the task's browser, for its owner only. A task that another user or thread
	 * owns reads as not found, so the response does not tell whether it exists.
	 */
	async getLiveView(
		userId: string,
		threadId: string,
		taskId: string,
	): Promise<InstanceAiCloudBrowserLiveViewResponse> {
		const entry = this.serversByTaskId.get(taskId);
		if (entry?.userId !== userId || entry.threadId !== threadId) return { status: 'not-found' };
		return await entry.server.getLiveView();
	}

	/** Ends the task's browser and forgets its server. Called when the task ends. */
	async release(taskId: string): Promise<void> {
		const entry = this.serversByTaskId.get(taskId);
		if (!entry) return;
		this.serversByTaskId.delete(taskId);
		await entry.server.release();
	}

	/** Ends every task's browser, so no session outlives the instance. */
	@OnShutdown()
	async shutdown(): Promise<void> {
		const entries = [...this.serversByTaskId.values()];
		this.serversByTaskId.clear();
		await Promise.allSettled(entries.map(async ({ server }) => await server.release()));
	}

	private getSessionProvider(taskId: string): CloudBrowserSessionProvider {
		if (this.aiGatewayBrowserUseService.isGatewayBrowserUseEnabled()) {
			return this.buildGatewaySessionProvider();
		}
		throw new UnexpectedError('Cloud browser use is not enabled', { extra: { taskId } });
	}

	private buildGatewaySessionProvider(): CloudBrowserSessionProvider {
		return {
			createSession: async ({ userId, threadId, taskId }) =>
				await this.aiGatewayBrowserUseService.createSession({
					userId,
					attribution: { instanceAiThreadId: threadId, instanceAiTaskId: taskId },
				}),
			releaseSession: async ({ userId, threadId, taskId }, sessionId) =>
				await this.aiGatewayBrowserUseService.releaseSession({
					userId,
					attribution: { instanceAiThreadId: threadId, instanceAiTaskId: taskId },
					sessionId,
				}),
			getSessionLiveViewUrl: async ({ userId, threadId, taskId }, sessionId, targetId) => {
				const { debuggerFullscreenUrl, pages } = await this.aiGatewayBrowserUseService.getLiveView({
					userId,
					attribution: { instanceAiThreadId: threadId, instanceAiTaskId: taskId },
					sessionId,
				});
				if (!targetId) return debuggerFullscreenUrl;
				const page = pages.find(({ id }) => id === targetId);
				if (!page) {
					this.logger.warn(
						'Cloud browser window not found in its live view, showing the first tab',
						{
							taskId,
							tabCount: pages.length,
						},
					);
				}
				return page?.debuggerFullscreenUrl ?? debuggerFullscreenUrl;
			},
		};
	}
}
