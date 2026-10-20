import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { tmpdir } from 'node:os';

import { CredentialsService } from '@/credentials/credentials.service';
import { AiGatewayBrowserUseService } from '@/services/ai-gateway-browser-use.service';

import {
	createBrowserCredential,
	createInMemorySecretsBuffer,
	type BrowserDomainGate,
} from './browser.helpers';
import { CloudBrowserLocalMcpServer } from './cloud-browser-local-mcp-server';
import type { CloudBrowserSessionProvider } from './cloud-browser-session-provider';

/** Creates the cloud browser for a background job. Each job gets its own server. */
@Service()
export class InstanceAiCloudBrowserService {
	private readonly logger: Logger;

	private readonly serversByJobId = new Map<
		string,
		{ userId: string; server: CloudBrowserLocalMcpServer }
	>();

	constructor(
		logger: Logger,
		private readonly aiGatewayBrowserUseService: AiGatewayBrowserUseService,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/**
	 * Whether this instance can get browser sessions. For now, only cloud instances with the
	 * AI Gateway enabled can get browser sessions. Local instances cannot.
	 */
	isAvailable(): boolean {
		return this.aiGatewayBrowserUseService.isGatewayBrowserUseEnabled();
	}

	/**
	 * Returns the job's server, and creates it on first use. `domainGate` holds the sites the user
	 * approved and the admin's permissions. Each call replaces the gate of the job's server, so
	 * the newest permissions apply.
	 */
	async createServer(
		userId: string,
		threadId: string,
		jobId: string,
		domainGate: BrowserDomainGate,
	): Promise<CloudBrowserLocalMcpServer> {
		const { createBrowserTools } = await import('@n8n/mcp-browser');

		const existing = this.serversByJobId.get(jobId);
		if (existing) {
			if (existing.userId !== userId) {
				throw new UnexpectedError('Cloud browser job belongs to another user', {
					extra: { jobId },
				});
			}
			existing.server.setDomainGate(domainGate);
			return existing.server;
		}

		const server = new CloudBrowserLocalMcpServer({
			scope: { userId, threadId, jobId },
			sessionProvider: this.getSessionProvider(jobId),
			createToolkit: (connectUrl) =>
				createBrowserTools({ mode: 'direct_cdp' }, { cdpEndpoint: connectUrl }),
			toolContext: {
				// No tool the cloud browser shows reads `dir`. Before you show a tool that reads
				// or writes files, give each user a folder of their own, as the extension browser does.
				dir: tmpdir(),
				// One buffer per job, so a job never sees secrets captured by another.
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
		this.serversByJobId.set(jobId, { userId, server });
		return server;
	}

	findServer(jobId: string): CloudBrowserLocalMcpServer | undefined {
		return this.serversByJobId.get(jobId)?.server;
	}

	/** Ends the job's browser and forgets its server. Called when the job ends. */
	async release(jobId: string): Promise<void> {
		const entry = this.serversByJobId.get(jobId);
		if (!entry) return;
		this.serversByJobId.delete(jobId);
		await entry.server.release();
	}

	/** Ends every job's browser, so no session outlives the instance. */
	@OnShutdown()
	async shutdown(): Promise<void> {
		const entries = [...this.serversByJobId.values()];
		this.serversByJobId.clear();
		await Promise.allSettled(entries.map(async ({ server }) => await server.release()));
	}

	private getSessionProvider(jobId: string): CloudBrowserSessionProvider {
		if (this.aiGatewayBrowserUseService.isGatewayBrowserUseEnabled()) {
			return this.buildGatewaySessionProvider();
		}
		throw new UnexpectedError('Cloud browser use is not enabled', { extra: { jobId } });
	}

	private buildGatewaySessionProvider(): CloudBrowserSessionProvider {
		return {
			createSession: async ({ userId, threadId, jobId }) =>
				await this.aiGatewayBrowserUseService.createSession({
					userId,
					attribution: { instanceAiThreadId: threadId, instanceAiJobId: jobId },
				}),
			releaseSession: async ({ userId, threadId, jobId }, sessionId) =>
				await this.aiGatewayBrowserUseService.releaseSession({
					userId,
					attribution: { instanceAiThreadId: threadId, instanceAiJobId: jobId },
					sessionId,
				}),
		};
	}
}
