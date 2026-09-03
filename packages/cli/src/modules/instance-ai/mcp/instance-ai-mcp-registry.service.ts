import { type BuiltTool, McpClient } from '@n8n/agents';
import type {
	InstanceAiMcpConnectionFailureReason,
	InstanceAiMcpConnectionToolResponse,
	InstanceAiMcpConnectionToolsResponse,
	InstanceAiMcpUpdateConnectionRequestDto,
} from '@n8n/api-types';
import { isObjectLiteral, Logger } from '@n8n/backend-common';
import type { CustomFetch } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { isUniqueConstraintError, type CredentialsEntity, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { McpServerConfig } from '@n8n/instance-ai';
import type { ICredentialDataDecryptedObject, LiteralMcpRegistryConnection } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import {
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
	toAgentMcpTransport,
} from '@/modules/mcp-registry/mcp-registry-connection';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';
import { OauthService } from '@/oauth/oauth.service';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';
import { createAuthFetch } from '@/utils/auth-fetch';

import type {
	InstanceAiMcpRegistryConnection,
	InstanceAiMcpToolFilter,
} from '../entities/instance-ai-mcp-registry-connection.entity';
import { InstanceAiMcpRegistryConnectionRepository } from '../repositories/instance-ai-mcp-registry-connection.repository';

interface ResolvedRegistryServer {
	serverSlug: string;
	credentialId: string;
	authType: McpRegistryServer['authType'];
	/** Never templated: this path cannot resolve a template, so those are skipped. */
	connection: LiteralMcpRegistryConnection;
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

function stripMcpServerPrefix(toolName: string, serverName: string): string {
	const prefix = `${serverName}_`;
	return toolName.startsWith(prefix) ? toolName.slice(prefix.length) : toolName;
}

function toToolResponse(tool: BuiltTool, serverName: string): InstanceAiMcpConnectionToolResponse {
	const response: InstanceAiMcpConnectionToolResponse = {
		name: tool.mcpToolName ?? stripMcpServerPrefix(tool.name, serverName),
	};
	if (tool.description) response.description = tool.description;
	return response;
}

function disconnectedToolsResponse(
	id: string,
	failureReason: InstanceAiMcpConnectionFailureReason = 'unknown',
): InstanceAiMcpConnectionToolsResponse {
	return { id, status: 'disconnected', tools: [], failureReason };
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
			if (isUniqueConstraintError(error)) {
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

	async listConnectionTools(user: User, id: string): Promise<InstanceAiMcpConnectionToolsResponse> {
		const connection = await this.connectionRepository.findOneBy({ id, userId: user.id });
		if (!connection) {
			throw new NotFoundError('MCP registry connection not found');
		}

		return await this.fetchConnectionTools(user, connection);
	}

	async listAllConnectionTools(user: User): Promise<InstanceAiMcpConnectionToolsResponse[]> {
		const connections = await this.connectionRepository.findBy({ userId: user.id });
		return await Promise.all(
			connections.map(async (connection) => {
				try {
					return await this.fetchConnectionTools(user, connection);
				} catch (error) {
					this.logger.warn('Failed to check MCP connection', {
						connectionId: connection.id,
						serverSlug: connection.serverSlug,
						error,
					});
					return disconnectedToolsResponse(connection.id);
				}
			}),
		);
	}

	private async fetchConnectionTools(
		user: User,
		connection: InstanceAiMcpRegistryConnection,
	): Promise<InstanceAiMcpConnectionToolsResponse> {
		const server = await this.mcpRegistryService.get(connection.serverSlug);
		if (!server) {
			throw new NotFoundError(`Unknown MCP registry server: ${connection.serverSlug}`);
		}

		const resolvedServer = this.resolveRegistryServer(
			connection.id,
			connection.serverSlug,
			connection.credentialId,
			server,
		);
		if (!resolvedServer) return disconnectedToolsResponse(connection.id);

		const aiMcpFetch = createAiMcpFetch(this.outboundHttp);
		const requestFetch = await this.buildRegistryServerFetch(
			resolvedServer,
			user,
			connection.id,
			aiMcpFetch,
		);
		if (!requestFetch) return disconnectedToolsResponse(connection.id, 'authentication');

		let failureReason: InstanceAiMcpConnectionFailureReason = 'unknown';
		const classifiedFetch: CustomFetch = async (input, init) => {
			try {
				const response = await requestFetch(input, init);
				if (response.status === 401 || response.status === 403) {
					failureReason = 'authentication';
				} else if (response.status >= 500) {
					failureReason = 'server_unavailable';
				}
				return response;
			} catch (error) {
				failureReason = 'server_unavailable';
				throw error;
			}
		};

		const serverName = buildServerName(resolvedServer.serverSlug, 1);
		const client = new McpClient([
			{
				name: serverName,
				url: resolvedServer.connection.endpointUrl,
				transport: toAgentMcpTransport(resolvedServer.connection.transport),
				fetch: classifiedFetch,
				connectionTimeoutMs: 10_000,
			},
		]);

		try {
			const tools = (await client.listTools()).map((tool) => toToolResponse(tool, serverName));
			if (client.getConnectionFailures().length > 0) {
				return disconnectedToolsResponse(connection.id, failureReason);
			}
			return { id: connection.id, status: 'connected', tools };
		} finally {
			await client.close().catch((error: unknown) => {
				this.logger.warn('Failed to close MCP client after listing tools', {
					connectionId: connection.id,
					serverSlug: connection.serverSlug,
					error,
				});
			});
		}
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

		// One proxy-aware, SSRF-protected transport shared across all resolved MCP connections.
		const aiMcpFetch = createAiMcpFetch(this.outboundHttp);

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
				server,
			);
			if (!resolvedServer) {
				continue;
			}

			const nextCount = (slugCounts.get(resolvedServer.serverSlug) ?? 0) + 1;
			slugCounts.set(resolvedServer.serverSlug, nextCount);
			const serverConfig: McpServerConfig = {
				name: buildServerName(resolvedServer.serverSlug, nextCount),
				url: resolvedServer.connection.endpointUrl,
				transport: toAgentMcpTransport(resolvedServer.connection.transport),
				cacheKey: `registry-connection:${connection.id}`,
				toolFilter: connection.toolFilter ?? undefined,
				metadata: {
					connectionId: connection.id,
					serverSlug: resolvedServer.serverSlug,
					userId: user.id,
				},
			};

			if (resolvedServer.authType === 'oauth2' || resolvedServer.authType === 'extendsCredential') {
				const requestFetch = await this.buildRegistryServerFetch(
					resolvedServer,
					user,
					connection.id,
					aiMcpFetch,
				);
				if (!requestFetch) {
					continue;
				}
				serverConfig.fetch = requestFetch;
			}

			resolved.push(serverConfig);
		}

		return resolved;
	}

	private resolveRegistryServer(
		connectionId: string,
		serverSlug: string,
		credentialId: string,
		server: McpRegistryServer,
	): ResolvedRegistryServer | null {
		const connection = resolveMcpRegistryConnection(server);
		if (!connection) {
			this.logger.warn('Skipping MCP registry connection without supported remote transport', {
				connectionId,
				serverSlug,
				credentialId,
			});
			return null;
		}

		// This path reads the credential without resolving expressions, so a
		// templated row's URL would stay an unresolved template. Skipping keeps
		// the row out of the picker instead of offering a connection that breaks.
		if (connection.isTemplated) {
			this.logger.warn('Skipping MCP registry connection with a templated server URL', {
				connectionId,
				serverSlug,
				credentialId,
			});
			return null;
		}

		return {
			serverSlug,
			credentialId,
			authType: server.authType,
			connection,
		};
	}

	private async buildRegistryServerFetch(
		config: ResolvedRegistryServer,
		user: User,
		connectionId: string,
		baseFetch: CustomFetch,
	): Promise<CustomFetch | null> {
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

		const prepared = prepareMcpRegistryConnection({
			connection: config.connection,
			credentialData: credentialWithData.data,
		});
		if (!prepared.ok) {
			this.logger.warn('Skipping MCP registry connection with invalid credential', {
				connectionId,
				serverSlug: config.serverSlug,
				credentialId: config.credentialId,
				reason: prepared.error.code,
			});
			return null;
		}

		const projectId = credentialWithData.credential.shared?.[0]?.projectId ?? null;
		return createAuthFetch({
			baseFetch,
			initialHeaders: prepared.value.headers,
			onUnauthorized: async () =>
				projectId
					? await this.oauthService.refreshOAuth2CredentialById(config.credentialId, projectId)
					: null,
			allowedDomains: {
				mode: 'domains',
				domains: prepared.value.allowedDomains,
			},
		});
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
