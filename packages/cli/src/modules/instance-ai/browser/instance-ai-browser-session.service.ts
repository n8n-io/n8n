import type {
	InstanceAiBrowserCreateLinkResponse,
	InstanceAiBrowserStatusResponse,
	ToolCategory,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { LocalMcpServer } from '@n8n/instance-ai';
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
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CredentialsService } from '@/credentials/credentials.service';
import { Push } from '@/push';
import { UrlService } from '@/services/url.service';

import { BrowserLocalMcpServer } from './browser-local-mcp-server';

const BROWSER_RELAY_PORT = 5680;
const BROWSER_RELAY_BIND_HOST = '0.0.0.0';
const CONNECT_TOKEN_TTL_MS = 5 * 60 * 1000;

interface BrowserSession {
	userId: string;
	relay: CDPRelayServer;
	relayAuthToken: string;
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

	private relayHttpServer: http.Server | null = null;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly urlService: UrlService,
		private readonly push: Push,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async createLink(userId: string): Promise<InstanceAiBrowserCreateLinkResponse> {
		await this.ensureRelayServer();
		const session = this.sessions.get(userId) ?? (await this.createSession(userId));

		session.relayAuthToken = `bu_${nanoid(32)}`;
		session.tokenCreatedAt = Date.now();

		const { buildExtensionConnectUrl } = await import('@n8n/mcp-browser');
		const relayEndpoint = session.relay.extensionEndpoint(
			BROWSER_RELAY_PORT,
			session.relayAuthToken,
		);
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
		await this.teardownSession(session);
		this.pushState(userId);
	}

	findMcpServer(userId: string): LocalMcpServer | undefined {
		const session = this.sessions.get(userId);
		return session?.connected ? session.mcpServer : undefined;
	}

	isConnected(userId: string): boolean {
		return this.sessions.get(userId)?.connected ?? false;
	}

	async shutdown(): Promise<void> {
		const sessions = [...this.sessions.values()];
		this.sessions.clear();
		for (const session of sessions) {
			await this.teardownSession(session);
		}

		if (this.relayHttpServer) {
			const server = this.relayHttpServer;
			this.relayHttpServer = null;
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
	}

	private async createSession(userId: string): Promise<BrowserSession> {
		const { CDPRelayServer, createBrowserTools } = await import('@n8n/mcp-browser');
		const relay = new CDPRelayServer({
			noServer: true,
			port: BROWSER_RELAY_PORT,
			publicWsBaseUrl: this.getPublicWsBaseUrl(),
			validateAuthToken: (token) => this.isTokenValid(userId, token),
		});
		relay.onExtensionConnect = () => this.handleExtensionConnected(userId);
		relay.onExtensionDisconnect = () => this.handleExtensionDisconnected(userId);

		const toolkit = createBrowserTools({ mode: 'remote' }, { relay });
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
			relay,
			relayAuthToken: `bu_${nanoid(32)}`,
			tokenCreatedAt: Date.now(),
			hasConnectedOnce: false,
			connected: false,
			connectedAt: null,
			connection: toolkit.connection,
			mcpServer: new BrowserLocalMcpServer(toolkit, toolContext, this.logger),
		};
		this.sessions.set(userId, session);
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

	private isTokenValid(userId: string, token: string | null): boolean {
		const session = this.sessions.get(userId);
		if (!session || !token) {
			return false;
		}

		const expected = Buffer.from(session.relayAuthToken);
		const actual = Buffer.from(token);
		if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
			return false;
		}

		if (!session.hasConnectedOnce) {
			return Date.now() - session.tokenCreatedAt <= CONNECT_TOKEN_TTL_MS;
		}

		return true;
	}

	private async createCredential(
		userId: string,
		payload: CreateCredentialPayload,
	): Promise<{ credentialId: string }> {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new UnexpectedError('User for browser session not found');
		}

		const credential = await this.credentialsService.createUnmanagedCredential(payload, user);
		return { credentialId: credential.id };
	}

	private async ensureRelayServer(): Promise<void> {
		if (this.relayHttpServer) {
			return;
		}

		const server = http.createServer((_req, res) => {
			res.writeHead(404);
			res.end();
		});

		server.on('upgrade', (req, socket, head) => {
			const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
			for (const session of this.sessions.values()) {
				if (session.relay.matchesPath(pathname)) {
					session.relay.handleUpgrade(req, socket, head);
					return;
				}
			}

			socket.destroy();
		});

		await new Promise<void>((resolve, reject) => {
			const onError = (error: Error) => reject(error);
			server.once('error', onError);
			server.listen(BROWSER_RELAY_PORT, BROWSER_RELAY_BIND_HOST, () => {
				server.off('error', onError);
				resolve();
			});
		}).catch((error: Error) => {
			throw new UnexpectedError(
				`Failed to start Browser Use relay on port ${BROWSER_RELAY_PORT}: ${error.message}`,
			);
		});

		this.relayHttpServer = server;
		this.logger.info(
			`Browser Use relay listening on ${BROWSER_RELAY_BIND_HOST}:${BROWSER_RELAY_PORT}`,
		);
	}

	private getPublicWsBaseUrl(): string {
		const base = new URL(this.urlService.getInstanceBaseUrl());
		const scheme = base.protocol === 'https:' ? 'wss' : 'ws';
		return `${scheme}://${base.hostname}:${BROWSER_RELAY_PORT}`;
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
