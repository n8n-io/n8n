import type {
	InstanceAiBrowserCreateLinkResponse,
	InstanceAiBrowserStatusResponse,
	ToolCategory,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	BrowserConnection,
	CDPRelayServer,
	CreateCredentialPayload,
	SecretsBuffer,
	ToolContext,
} from '@n8n/mcp-browser';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { timingSafeEqual } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CredentialsService } from '@/credentials/credentials.service';
import { Push } from '@/push';
import { UrlService } from '@/services/url.service';

import { BrowserLocalMcpServer } from './browser-local-mcp-server';
import {
	BROWSER_USE_WS_NAMESPACE,
	CDP_TOKEN_HEADER,
	type BrowserUseUpgradeRequest,
} from './browser-use-ws.constants';

const CONNECT_TOKEN_TTL_MS = 5 * 60 * 1000;

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

interface BrowserSession {
	userId: string;
	sessionId: string;
	relay: CDPRelayServer;
	relayAuthToken: string;
	cdpToken: string;
	tokenCreatedAt: number;
	hasConnectedOnce: boolean;
	connected: boolean;
	connectedAt: Date | null;
	connection: BrowserConnection;
	mcpServer: BrowserLocalMcpServer;
}

@Service()
export class InstanceAiBrowserSessionService {
	private readonly sessions = new Map<string, BrowserSession>();

	private readonly sessionsBySessionId = new Map<string, BrowserSession>();

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly urlService: UrlService,
		private readonly push: Push,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async createLink(userId: string): Promise<InstanceAiBrowserCreateLinkResponse> {
		const session = this.sessions.get(userId) ?? (await this.createSession(userId));

		session.relayAuthToken = `bu_${nanoid(32)}`;
		session.tokenCreatedAt = Date.now();

		const { buildExtensionConnectUrl } = await import('@n8n/mcp-browser');
		const relayEndpoint = this.buildExtensionEndpoint(session);
		const connectUrl = buildExtensionConnectUrl(relayEndpoint);
		const expiresAt = new Date(session.tokenCreatedAt + CONNECT_TOKEN_TTL_MS);

		return {
			connectUrl,
			expiresAt: expiresAt.toISOString(),
			ttlSeconds: Math.ceil(CONNECT_TOKEN_TTL_MS / 1000),
		};
	}

	getStatus(userId: string): InstanceAiBrowserStatusResponse {
		const session = this.sessions.get(userId);
		return {
			connected: session?.connected ?? false,
			connectedAt: session?.connectedAt?.toISOString() ?? null,
			toolCategories: this.getToolCategories(userId),
		};
	}

	async disconnect(userId: string): Promise<void> {
		const session = this.sessions.get(userId);
		if (!session) return;
		this.sessions.delete(userId);
		this.sessionsBySessionId.delete(session.sessionId);
		await this.teardownSession(session);
		this.pushState(userId);
	}

	findMcpServer(userId: string): BrowserLocalMcpServer | undefined {
		const session = this.sessions.get(userId);
		return session?.connected ? session.mcpServer : undefined;
	}

	isConnected(userId: string): boolean {
		return this.sessions.get(userId)?.connected ?? false;
	}

	handleExtensionUpgrade(req: BrowserUseUpgradeRequest): void {
		const session = this.sessionsBySessionId.get(req.params.sessionId);
		const token = typeof req.query.token === 'string' ? req.query.token : null;
		if (!session || !this.isExtensionTokenValid(session, token)) {
			req.ws.close(4003, 'Invalid auth token');
			return;
		}
		session.relay.attachExtension(req.ws);
	}

	handleCdpUpgrade(req: BrowserUseUpgradeRequest): void {
		const session = this.sessionsBySessionId.get(req.params.sessionId);
		const header = req.headers[CDP_TOKEN_HEADER];
		const token = typeof header === 'string' ? header : null;
		if (
			!session ||
			!LOOPBACK_ADDRESSES.has(req.socket.remoteAddress ?? '') ||
			!this.tokensMatch(session.cdpToken, token)
		) {
			req.ws.close(4003, 'Invalid auth token');
			return;
		}
		session.relay.attachController(req.ws);
	}

	async shutdown(): Promise<void> {
		const sessions = [...this.sessions.values()];
		this.sessions.clear();
		this.sessionsBySessionId.clear();
		for (const session of sessions) {
			await this.teardownSession(session);
		}
	}

	private async createSession(userId: string): Promise<BrowserSession> {
		const { CDPRelayServer, createBrowserTools } = await import('@n8n/mcp-browser');

		const sessionId = nanoid();
		const cdpToken = `cdp_${nanoid(32)}`;

		const relay = new CDPRelayServer({ noServer: true });
		relay.onExtensionConnect = () => this.handleExtensionConnected(userId);
		relay.onExtensionDisconnect = () => this.handleExtensionDisconnected(userId);

		const toolkit = createBrowserTools(
			{ mode: 'remote' },
			{
				relay,
				cdpEndpoint: this.buildCdpEndpoint(sessionId),
				cdpConnectHeaders: { [CDP_TOKEN_HEADER]: cdpToken },
			},
		);
		const workDir = join(tmpdir(), 'n8n-instance-ai-browser', userId);
		await mkdir(workDir, { recursive: true });
		const toolContext: ToolContext = {
			dir: workDir,
			secretsBuffer: createInMemorySecretsBuffer(),
			createCredential: async (payload: CreateCredentialPayload) =>
				await this.createCredential(userId, payload),
		};

		const session: BrowserSession = {
			userId,
			sessionId,
			relay,
			relayAuthToken: `bu_${nanoid(32)}`,
			cdpToken,
			tokenCreatedAt: Date.now(),
			hasConnectedOnce: false,
			connected: false,
			connectedAt: null,
			connection: toolkit.connection,
			mcpServer: new BrowserLocalMcpServer(toolkit, toolContext, this.logger),
		};
		this.sessions.set(userId, session);
		this.sessionsBySessionId.set(sessionId, session);
		return session;
	}

	private async teardownSession(session: BrowserSession): Promise<void> {
		try {
			await session.connection.shutdown();
		} catch (error) {
			this.logger.warn('Failed to shut down browser connection', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
		session.relay.stop();
		session.connected = false;
		session.connectedAt = null;
	}

	private handleExtensionConnected(userId: string): void {
		const session = this.sessions.get(userId);
		if (!session) {
			return;
		}

		session.connected = true;
		session.connectedAt = new Date();
		session.hasConnectedOnce = true;
		void session.mcpServer.callTool({
			name: 'browser_connect',
			arguments: {},
		});
		this.logger.info('Browser Use extension connected', { userId });
		this.pushState(userId);
	}

	private handleExtensionDisconnected(userId: string): void {
		const session = this.sessions.get(userId);
		if (!session) {
			return;
		}

		session.connected = false;
		session.connectedAt = null;
		this.logger.info('Browser Use extension disconnected', { userId });
		this.pushState(userId);
	}

	private pushState(userId: string): void {
		const session = this.sessions.get(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiBrowserStateChanged',
				data: {
					connected: session?.connected ?? false,
					connectedAt: session?.connectedAt?.toISOString() ?? null,
					toolCategories: this.getToolCategories(userId),
				},
			},
			[userId],
		);
	}

	private getToolCategories(userId: string): ToolCategory[] {
		const session = this.sessions.get(userId);
		return session?.connected ? [{ name: 'browser', enabled: true }] : [];
	}

	private isExtensionTokenValid(session: BrowserSession, token: string | null): boolean {
		if (!this.tokensMatch(session.relayAuthToken, token)) {
			return false;
		}

		if (!session.hasConnectedOnce) {
			return Date.now() - session.tokenCreatedAt <= CONNECT_TOKEN_TTL_MS;
		}

		return true;
	}

	private tokensMatch(expected: string, actual: string | null): boolean {
		if (!actual) {
			return false;
		}
		const expectedBuffer = Buffer.from(expected);
		const actualBuffer = Buffer.from(actual);
		return (
			expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
		);
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

	private buildExtensionEndpoint(session: BrowserSession): string {
		const token = encodeURIComponent(session.relayAuthToken);
		return `${this.getPublicWsBaseUrl()}${BROWSER_USE_WS_NAMESPACE}/extension/${session.sessionId}?token=${token}`;
	}

	private buildCdpEndpoint(sessionId: string): string {
		return `ws://127.0.0.1:${this.globalConfig.port}${BROWSER_USE_WS_NAMESPACE}/cdp/${sessionId}`;
	}

	private getPublicWsBaseUrl(): string {
		const base = new URL(this.urlService.getInstanceBaseUrl());
		const scheme = base.protocol === 'https:' ? 'wss' : 'ws';
		return `${scheme}://${base.host}`;
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
