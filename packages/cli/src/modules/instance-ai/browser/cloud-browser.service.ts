import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { orchestratorAgentId } from '@n8n/instance-ai';
import type {
	BrowserConnection,
	CreateCredentialPayload,
	SecretsBuffer,
	ToolContext,
} from '@n8n/mcp-browser';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CredentialsService } from '@/credentials/credentials.service';
import { AiGatewayBrowserbaseService } from '@/services/ai-gateway-browserbase.service';

import { BrowserLocalMcpServer } from './browser-local-mcp-server';
import { InProcessEventBus } from '../event-bus/in-process-event-bus';

/** Creates and releases cloud browser sessions. One implementation per cloud browser vendor. */
export interface CloudBrowserSessionProvider {
	createSession(userId: string): Promise<{ sessionId: string; connectUrl: string }>;
	getLiveViewUrl(userId: string, sessionId: string): Promise<string>;
	releaseSession(userId: string, sessionId: string): Promise<void>;
}

interface CloudBrowserSession {
	userId: string;
	threadId: string;
	sessionId: string;
	connection: BrowserConnection;
	mcpServer: BrowserLocalMcpServer;
}

/**
 * Owns the cloud browser sessions of every run in this process. A run has at
 * most one active session at a time.
 */
@Service()
export class CloudBrowserService {
	private readonly sessionsByRun = new Map<string, CloudBrowserSession>();

	/** Runs whose session is being created, so a parallel start can't open a second one. */
	private readonly startingRuns = new Set<string>();

	private readonly provider: CloudBrowserSessionProvider;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		provider: AiGatewayBrowserbaseService,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
		private readonly eventBus: InProcessEventBus,
	) {
		this.logger = logger.scoped('instance-ai');
		this.provider = provider;
	}

	/** Starts a session for the run and returns the browser server connected to it. */
	async startSession(
		userId: string,
		runId: string,
		threadId: string,
	): Promise<BrowserLocalMcpServer> {
		if (this.sessionsByRun.has(runId) || this.startingRuns.has(runId)) {
			throw new UserError('A browser session is already active. End it before starting a new one.');
		}

		this.startingRuns.add(runId);
		try {
			const workDir = join(tmpdir(), 'n8n-instance-ai-cloud-browser', userId);
			await mkdir(workDir, { recursive: true });

			const { sessionId, connectUrl } = await this.provider.createSession(userId);

			const { createBrowserTools } = await import('@n8n/mcp-browser');
			const toolkit = createBrowserTools({ mode: 'direct-cdp' }, { cdpEndpoint: connectUrl });
			try {
				await toolkit.connection.connect();
			} catch (error) {
				// Release now, otherwise the session stays open (and billed) until it times out.
				await this.provider.releaseSession(userId, sessionId).catch((releaseError: unknown) => {
					this.logger.warn('Failed to release cloud browser session', {
						sessionId,
						error: errorMessage(releaseError),
					});
				});
				throw error;
			}

			const toolContext: ToolContext = {
				dir: workDir,
				secretsBuffer: createInMemorySecretsBuffer(),
				createCredential: async (payload: CreateCredentialPayload) =>
					await this.createCredential(userId, payload),
			};
			const mcpServer = new BrowserLocalMcpServer(toolkit, toolContext, this.logger);
			this.sessionsByRun.set(runId, {
				userId,
				threadId,
				sessionId,
				connection: toolkit.connection,
				mcpServer,
			});
			await this.publishLiveView(userId, runId, threadId, sessionId);
			return mcpServer;
		} finally {
			this.startingRuns.delete(runId);
		}
	}

	getSessionServer(runId: string): BrowserLocalMcpServer | undefined {
		return this.sessionsByRun.get(runId)?.mcpServer;
	}

	/** Disconnects from and releases the run's session, if it has one. */
	async endSession(runId: string): Promise<void> {
		const session = this.sessionsByRun.get(runId);
		if (!session) return;
		this.sessionsByRun.delete(runId);
		this.publishLiveViewUrl(session.threadId, runId, null);

		try {
			await session.connection.shutdown();
		} catch (error) {
			this.logger.warn('Failed to disconnect from cloud browser session', {
				sessionId: session.sessionId,
				error: errorMessage(error),
			});
		}
		await this.provider.releaseSession(session.userId, session.sessionId);
	}

	/** Releases whatever session the run left open. Never throws: runs during run cleanup. */
	async releaseRun(runId: string): Promise<void> {
		try {
			await this.endSession(runId);
		} catch (error) {
			this.logger.warn('Failed to release cloud browser session for run', {
				runId,
				error: errorMessage(error),
			});
		}
	}

	async shutdown(): Promise<void> {
		await Promise.all(
			[...this.sessionsByRun.keys()].map(async (runId) => await this.releaseRun(runId)),
		);
	}

	/** Shows the session's live view in the chat. Without one the session still works. */
	private async publishLiveView(
		userId: string,
		runId: string,
		threadId: string,
		sessionId: string,
	): Promise<void> {
		try {
			const liveViewUrl = await this.provider.getLiveViewUrl(userId, sessionId);
			this.publishLiveViewUrl(threadId, runId, liveViewUrl);
		} catch (error) {
			this.logger.warn('Failed to get cloud browser live view', {
				sessionId,
				error: errorMessage(error),
			});
		}
	}

	private publishLiveViewUrl(threadId: string, runId: string, liveViewUrl: string | null): void {
		this.eventBus.publish(threadId, {
			type: 'browser-live-view',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: { liveViewUrl },
		});
	}

	private async createCredential(
		userId: string,
		payload: CreateCredentialPayload,
	): Promise<{ credentialId: string }> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role'],
		});
		if (!user) {
			throw new UnexpectedError('User for browser session not found');
		}

		const credential = await this.credentialsService.createUnmanagedCredential(payload, user);
		return { credentialId: credential.id };
	}
}

function createInMemorySecretsBuffer(): SecretsBuffer {
	const store = new Map<string, Map<string, string>>();
	return {
		capture(credentialsKey: string, field: string, value: string): void {
			const fields = store.get(credentialsKey) ?? new Map<string, string>();
			fields.set(field, value);
			store.set(credentialsKey, fields);
		},
		getFields(credentialsKey: string): Map<string, string> | undefined {
			return store.get(credentialsKey);
		},
		clear(credentialsKey: string): void {
			store.delete(credentialsKey);
		},
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
