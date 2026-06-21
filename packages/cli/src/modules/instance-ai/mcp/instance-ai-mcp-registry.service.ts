import { isObjectLiteral, Logger } from '@n8n/backend-common';
import type { InstanceAiMcpUpdateConnectionRequestDto } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { McpServerConfig } from '@n8n/instance-ai';
import { QueryFailedError } from '@n8n/typeorm';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type {
	McpRegistryRemote,
	McpRegistryServer,
} from '@/modules/mcp-registry/registry/mcp-registry.types';
import { OauthService } from '@/oauth/oauth.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';
import { createAuthFetch } from '@/utils/auth-fetch';

import type {
	InstanceAiMcpRegistryConnection,
	InstanceAiMcpToolFilter,
} from '../entities/instance-ai-mcp-registry-connection.entity';
import { InstanceAiMcpRegistryConnectionRepository } from '../repositories/instance-ai-mcp-registry-connection.repository';

type Transport = 'sse' | 'streamableHttp';

interface ResolvedRegistryServer {
	serverSlug: string;
	credentialId: string;
	authType: string;
	endpointUrl: string;
	transport: Transport;
}

interface OAuth2FetchContext {
	credentialId: string;
	accessToken: string;
	projectId: string;
}

function readString(data: Record<string, unknown>, key: string): string | undefined {
	const value = data[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readAccessToken(tokenData: Record<string, unknown>): string | undefined {
	return readString(tokenData, 'accessToken') ?? readString(tokenData, 'access_token');
}

function readOAuthTokenData(data: ICredentialDataDecryptedObject): Record<string, unknown> | null {
	const tokenData = data.oauthTokenData;
	return isObjectLiteral(tokenData) ? tokenData : null;
}

function getPreferredRemote(remotes: McpRegistryRemote[]): {
	transport: Transport;
	endpointUrl: string;
} | null {
	const streamable = remotes.find((remote) => remote.type === 'streamable-http');
	if (streamable?.url) {
		return { transport: 'streamableHttp', endpointUrl: streamable.url };
	}

	const sse = remotes.find((remote) => remote.type === 'sse');
	if (sse?.url) {
		return { transport: 'sse', endpointUrl: sse.url };
	}

	return null;
}

const MCP_REGISTRY_SERVER_PREFIX = 'mcp_';
const MAX_MCP_SERVER_NAME_LENGTH = 24;

function buildServerName(serverSlug: string, sequence: number): string {
	const safeSlug = serverSlug.replace(/[^A-Za-z0-9_-]/g, '_');
	const baseName = `${MCP_REGISTRY_SERVER_PREFIX}${safeSlug}`;
	if (sequence <= 1) {
		return baseName.slice(0, MAX_MCP_SERVER_NAME_LENGTH);
	}

	const suffix = `_${sequence}`;
	const maxBaseLength = Math.max(0, MAX_MCP_SERVER_NAME_LENGTH - suffix.length);
	return `${baseName.slice(0, maxBaseLength)}${suffix}`;
}

function normalizeTools(tools: string[] | undefined): string[] {
	if (!tools) {
		return [];
	}

	return [...new Set(tools.filter((tool) => tool.length > 0))];
}

function resolveToolFilter(
	payload: InstanceAiMcpUpdateConnectionRequestDto,
	current: InstanceAiMcpToolFilter | null,
): InstanceAiMcpToolFilter | null {
	if (payload.inclusionMode === undefined) {
		return current;
	}

	if (payload.inclusionMode === 'all') {
		return null;
	}

	if (payload.inclusionMode === 'selected') {
		return { mode: 'allow', tools: normalizeTools(payload.selectedTools) };
	}

	return { mode: 'exclude', tools: normalizeTools(payload.excludedTools) };
}

@Service()
export class InstanceAiMcpRegistryService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly connectionRepository: InstanceAiMcpRegistryConnectionRepository,
		private readonly mcpRegistryService: McpRegistryService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly oauthService: OauthService,
		private readonly eventService: EventService,
		private readonly outboundHttp: OutboundHttp,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async listConnectionsForUser(user: User): Promise<InstanceAiMcpRegistryConnection[]> {
		return await this.connectionRepository.findBy({ userId: user.id });
	}

	async createConnection(
		user: User,
		input: { serverSlug: string; credentialId: string },
	): Promise<{
		connection: InstanceAiMcpRegistryConnection;
		credential: CredentialsEntity;
		server: McpRegistryServer;
	}> {
		const server = await this.mcpRegistryService.get(input.serverSlug);
		if (!server) {
			throw new NotFoundError(`Unknown MCP registry server: ${input.serverSlug}`);
		}

		// v1 invariant: at most one connection per (user, serverSlug). To switch
		// credentials the user must disconnect first (the FE orchestrates this
		// as a two-step swap). The DB unique index is currently looser; this
		// request-layer check is the canonical enforcement.
		const existing = await this.connectionRepository.findOneBy({
			userId: user.id,
			serverSlug: input.serverSlug,
		});
		if (existing) {
			throw new ConflictError(
				'This MCP server is already connected. Disconnect first to use a different credential.',
			);
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			input.credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			throw new NotFoundError('Credential not found or not accessible');
		}

		const entity = this.connectionRepository.create({
			id: randomUUID(),
			userId: user.id,
			serverSlug: input.serverSlug,
			credentialId: input.credentialId,
		});

		try {
			const connection = await this.connectionRepository.save(entity);
			this.eventService.emit('instance-ai-mcp-registry-connection-created', {
				userId: user.id,
				serverSlug: input.serverSlug,
			});
			return { connection, credential, server };
		} catch (error) {
			if (isUniqueConstraintViolation(error)) {
				throw new ConflictError(
					'A connection for this MCP server with this credential already exists',
				);
			}
			throw error;
		}
	}

	async deleteConnection(user: User, id: string): Promise<void> {
		const connection = await this.connectionRepository.findOneBy({ id, userId: user.id });
		if (!connection) {
			throw new NotFoundError('MCP registry connection not found');
		}

		await this.connectionRepository.delete({ id });
		this.eventService.emit('instance-ai-mcp-registry-connection-deleted', {
			userId: user.id,
			serverSlug: connection.serverSlug,
		});
	}

	async updateConnection(
		user: User,
		id: string,
		payload: InstanceAiMcpUpdateConnectionRequestDto,
	): Promise<InstanceAiMcpRegistryConnection> {
		const connection = await this.connectionRepository.findOneBy({ id, userId: user.id });
		if (!connection) {
			throw new NotFoundError('MCP registry connection not found');
		}

		if (payload.credentialId) {
			await this.swapCredential(user, connection, payload.credentialId);
		}

		connection.toolFilter = resolveToolFilter(payload, connection.toolFilter);
		return await this.connectionRepository.save(connection);
	}

	async getRegistryMcpServers(user: User): Promise<McpServerConfig[]> {
		const connections = await this.connectionRepository.findBy({ userId: user.id });
		if (connections.length === 0) {
			return [];
		}

		const sortedConnections = connections.sort((left, right) => left.id.localeCompare(right.id));
		const slugs = [...new Set(sortedConnections.map((connection) => connection.serverSlug))];
		const servers = await this.mcpRegistryService.getBySlugs(slugs);
		const serverBySlug = new Map(servers.map((server) => [server.slug, server]));
		const slugCounts = new Map<string, number>();

		// One proxy-aware transport shared across all resolved MCP connections.
		const aiProxyFetch = createAiProxyFetch(this.outboundHttp);

		const resolved: McpServerConfig[] = [];
		for (const connection of sortedConnections) {
			const server = serverBySlug.get(connection.serverSlug);
			if (!server) {
				this.logger.warn('Skipping MCP registry connection with missing server slug', {
					connectionId: connection.id,
					serverSlug: connection.serverSlug,
					userId: user.id,
				});
				continue;
			}

			const resolvedServer = this.resolveRegistryServer(
				connection.id,
				connection.serverSlug,
				connection.credentialId,
				server.authType,
				server.remotes,
			);
			if (!resolvedServer) {
				continue;
			}

			const nextCount = (slugCounts.get(resolvedServer.serverSlug) ?? 0) + 1;
			slugCounts.set(resolvedServer.serverSlug, nextCount);
			const serverConfig: McpServerConfig = {
				name: buildServerName(resolvedServer.serverSlug, nextCount),
				url: resolvedServer.endpointUrl,
				transport: resolvedServer.transport,
				cacheKey: `registry-connection:${connection.id}`,
				toolFilter: connection.toolFilter ?? undefined,
			};

			if (resolvedServer.authType === 'oauth2') {
				const oauth2FetchContext = await this.buildOAuth2FetchContext(
					resolvedServer,
					user,
					connection.id,
				);
				if (!oauth2FetchContext) {
					continue;
				}

				serverConfig.fetch = createAuthFetch({
					baseFetch: aiProxyFetch,
					initialHeaders: { Authorization: `Bearer ${oauth2FetchContext.accessToken}` },
					onUnauthorized: async () => {
						if (!oauth2FetchContext.projectId) {
							return null;
						}

						return await this.oauthService.refreshOAuth2CredentialById(
							oauth2FetchContext.credentialId,
							oauth2FetchContext.projectId,
						);
					},
				});
			}

			resolved.push(serverConfig);
		}

		return resolved;
	}

	private resolveRegistryServer(
		connectionId: string,
		serverSlug: string,
		credentialId: string,
		authType: string,
		remotes: McpRegistryRemote[],
	): ResolvedRegistryServer | null {
		const remote = getPreferredRemote(remotes);
		if (!remote) {
			this.logger.warn('Skipping MCP registry connection without supported remote transport', {
				connectionId,
				serverSlug,
				credentialId,
			});
			return null;
		}

		return {
			serverSlug,
			credentialId,
			authType,
			endpointUrl: remote.endpointUrl,
			transport: remote.transport,
		};
	}

	private async buildOAuth2FetchContext(
		config: ResolvedRegistryServer,
		user: User,
		connectionId: string,
	): Promise<OAuth2FetchContext | null> {
		const credentialWithData = await this.getCredentialWithData(config.credentialId, user);
		if (!credentialWithData) {
			this.logger.warn('Skipping MCP registry connection with inaccessible credential', {
				connectionId,
				serverSlug: config.serverSlug,
				credentialId: config.credentialId,
				userId: user.id,
			});
			return null;
		}

		const tokenData = readOAuthTokenData(credentialWithData.data);
		if (!tokenData) {
			this.logger.warn('Skipping MCP registry connection without OAuth2 token data', {
				connectionId,
				serverSlug: config.serverSlug,
				credentialId: config.credentialId,
			});
			return null;
		}

		const accessToken = readAccessToken(tokenData);
		if (!accessToken) {
			this.logger.warn('Skipping MCP registry connection without access token', {
				connectionId,
				serverSlug: config.serverSlug,
				credentialId: config.credentialId,
			});
			return null;
		}

		const projectId = credentialWithData.credential.shared?.[0]?.projectId ?? null;
		if (!projectId) {
			this.logger.warn('Skipping OAuth2 token refresh for credential without project sharing', {
				connectionId,
				serverSlug: config.serverSlug,
				credentialId: config.credentialId,
			});
		}

		return {
			credentialId: config.credentialId,
			accessToken,
			projectId,
		};
	}

	private async getCredentialWithData(
		credentialId: string,
		user: User,
	): Promise<{ credential: CredentialsEntity; data: ICredentialDataDecryptedObject } | null> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			return null;
		}

		const data = await this.credentialsService.decrypt(credential, true);
		if (!isObjectLiteral(data) || Object.keys(data).length === 0) {
			return null;
		}

		return { credential, data };
	}

	private async swapCredential(
		user: User,
		connection: InstanceAiMcpRegistryConnection,
		newCredentialId: string,
	) {
		const currentCredential = await this.credentialsFinderService.findCredentialForUser(
			connection.credentialId,
			user,
			['credential:read'],
		);
		if (!currentCredential) {
			throw new NotFoundError('Credential not found or not accessible');
		}

		const newCredential = await this.credentialsFinderService.findCredentialForUser(
			newCredentialId,
			user,
			['credential:read'],
		);
		if (!newCredential) {
			throw new NotFoundError('Credential not found or not accessible');
		}

		if (currentCredential.type !== newCredential.type) {
			throw new ConflictError('Cannot change credential to a different type');
		}

		connection.credentialId = newCredentialId;
	}
}

function isUniqueConstraintViolation(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) return false;
	const driverError = error.driverError as { code?: string };
	const code = driverError?.code;
	return code === '23505' || code === 'SQLITE_CONSTRAINT_UNIQUE';
}
