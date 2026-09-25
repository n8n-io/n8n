import { McpClient, type BuiltTool } from '@n8n/agents';
import { classifyMcpTool } from '@n8n/ai-utilities/agent-config';
import type {
	McpRegistryDiscoveredConnection,
	McpRegistryDiscoveredTool,
	McpRegistryDiscoveryFailureReason,
	McpRegistryDiscoveryRequest,
	McpRegistryDiscoveryResponse,
} from '@n8n/api-types';
import { isObjectLiteral, Logger } from '@n8n/backend-common';
import { OutboundHttp, type CustomFetch } from '@n8n/backend-network';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { OauthService } from '@/oauth/oauth.service';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';
import type { AuthFetchDomainPolicy } from '@/utils/auth-fetch';

import { createMcpAuthFetch } from './mcp-auth-fetch';
import {
	getConfiguredEndpointUrl,
	isSupportedMcpRegistryCredentialType,
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
	toAgentMcpTransport,
} from './mcp-registry-connection';
import { McpRegistryService } from './registry/mcp-registry.service';
import type { McpRegistryServer } from './registry/mcp-registry.types';

const discoveryTimeoutMs = 10_000;

type ResolvedCredential = {
	credential: CredentialsEntity;
	data: ICredentialDataDecryptedObject;
	projectId: string | null;
};

type PreparedDiscovery = {
	clientConfig: {
		name: string;
		url: string;
		transport: 'sse' | 'streamableHttp';
		fetch: CustomFetch;
	};
	responseConnection: McpRegistryDiscoveredConnection;
	registryServer: McpRegistryServer;
};

function disconnected(
	failureReason: McpRegistryDiscoveryFailureReason,
): McpRegistryDiscoveryResponse {
	return { status: 'disconnected', failureReason, tools: [] };
}

function stripServerPrefix(toolName: string, serverName: string): string {
	const prefix = `${serverName}_`;
	return toolName.startsWith(prefix) ? toolName.slice(prefix.length) : toolName;
}

function safeServerName(name: string): string {
	const normalized = name.replace(/[^A-Za-z0-9_-]/g, '_');
	return (normalized || 'mcp_server').slice(0, 64);
}

function toTool(
	tool: BuiltTool,
	serverName: string,
	registryServer: McpRegistryServer,
): McpRegistryDiscoveredTool {
	const name = tool.mcpToolName ?? stripServerPrefix(tool.name, serverName);
	const registryTool = registryServer.tools.find((candidate) => candidate.name === name);
	return {
		name,
		...(tool.description ? { description: tool.description } : {}),
		category: classifyMcpTool({ name, annotations: registryTool?.annotations }),
	};
}

function classifyResponseFailure(
	response: Response,
	current: McpRegistryDiscoveryFailureReason,
): McpRegistryDiscoveryFailureReason {
	if (response.status === 401 || response.status === 403) return 'authentication';
	if (response.status >= 500) return 'server_unavailable';
	return current;
}

@Service()
export class McpConnectionDiscoveryService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly registryService: McpRegistryService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialTypes: CredentialTypes,
		private readonly oauthService: OauthService,
		private readonly outboundHttp: OutboundHttp,
	) {
		this.logger = logger.scoped('mcp-registry');
	}

	async discover(
		user: User,
		request: McpRegistryDiscoveryRequest,
	): Promise<McpRegistryDiscoveryResponse> {
		let prepared: PreparedDiscovery;
		try {
			prepared = await this.prepareRegistrySource(user, request);
		} catch (error) {
			if (error instanceof NotFoundError || error instanceof BadRequestError) throw error;
			this.logger.warn('Failed to prepare MCP discovery', {
				errorType: ensureError(error).name,
			});
			return disconnected('authentication');
		}

		let failureReason: McpRegistryDiscoveryFailureReason = 'unknown';
		const classifiedFetch: CustomFetch = async (input, init) => {
			try {
				const response = await prepared.clientConfig.fetch(input, init);
				failureReason = classifyResponseFailure(response, failureReason);
				return response;
			} catch (error) {
				failureReason = 'server_unavailable';
				throw error;
			}
		};
		const client = new McpClient([
			{
				...prepared.clientConfig,
				fetch: classifiedFetch,
				connectionTimeoutMs: discoveryTimeoutMs,
			},
		]);

		try {
			const tools = (await client.listTools()).map((tool) =>
				toTool(tool, prepared.clientConfig.name, prepared.registryServer),
			);
			if (client.getConnectionFailures().length > 0) return disconnected(failureReason);
			return {
				status: 'connected',
				connection: prepared.responseConnection,
				tools,
			};
		} catch (error) {
			this.logger.warn('MCP discovery connection failed', {
				errorType: ensureError(error).name,
			});
			return disconnected(failureReason);
		} finally {
			await client.close().catch((error: unknown) => {
				this.logger.warn('Failed to close MCP discovery client', {
					errorType: ensureError(error).name,
				});
			});
		}
	}

	private async prepareRegistrySource(
		user: User,
		source: McpRegistryDiscoveryRequest,
	): Promise<PreparedDiscovery> {
		const server = await this.registryService.get(source.slug);
		if (!server || server.status !== 'active') {
			throw new NotFoundError('MCP registry server not found');
		}
		const connection = resolveMcpRegistryConnection(server);
		if (!connection) throw new BadRequestError('MCP registry server has no supported connection');

		const resolvedCredential = await this.resolveCredential(user, source.credentialId);
		const { credential, data } = resolvedCredential;
		if (
			!isSupportedMcpRegistryCredentialType(this.credentialTypes, credential.type) ||
			!connection.credentialBindings.some((binding) => binding.credentialType === credential.type)
		) {
			throw new BadRequestError('Credential type is not supported by this MCP server');
		}

		const prepared = prepareMcpRegistryConnection({
			connection,
			credentialType: credential.type,
			credentialData: data,
		});
		if (!prepared.ok) throw new BadRequestError('Credential cannot connect to this MCP server');

		return {
			clientConfig: {
				name: safeServerName(source.slug),
				url: prepared.value.endpointUrl,
				transport: toAgentMcpTransport(prepared.value.transport),
				fetch: this.createCredentialFetch(resolvedCredential, prepared.value.headers, {
					mode: 'domains',
					domains: prepared.value.allowedDomains,
				}),
			},
			responseConnection: {
				url: getConfiguredEndpointUrl(connection),
				transport: toAgentMcpTransport(connection.transport),
				authentication: credential.type,
				credentialId: credential.id,
				metadata: { nodeTypeName: connection.nodeTypeName },
			},
			registryServer: server,
		};
	}

	private async resolveCredential(user: User, credentialId: string): Promise<ResolvedCredential> {
		const readableCredential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!readableCredential) {
			throw new NotFoundError('Credential not found or not accessible');
		}
		if (readableCredential.isResolvable) {
			const connectableCredential = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				user,
				['credential:connect'],
			);
			if (!connectableCredential) {
				throw new NotFoundError('Credential not found or not accessible');
			}
		}

		const data = await this.credentialsService.decrypt(readableCredential, true);
		if (!isObjectLiteral(data) || Object.keys(data).length === 0) {
			throw new BadRequestError('Credential could not be resolved');
		}
		const projectId =
			readableCredential.shared?.find((share) => share.role === 'credential:owner')?.projectId ??
			readableCredential.shared?.[0]?.projectId ??
			null;
		return { credential: readableCredential, data, projectId };
	}

	private createCredentialFetch(
		resolved: ResolvedCredential,
		initialHeaders: Record<string, string>,
		allowedDomains: AuthFetchDomainPolicy | undefined,
	): CustomFetch {
		return createMcpAuthFetch({
			authentication: resolved.credential.type,
			baseFetch: createAiMcpFetch(this.outboundHttp),
			credentialData: resolved.data,
			credentialId: resolved.credential.id,
			initialHeaders,
			oauthService: this.oauthService,
			projectId: resolved.projectId,
			allowedDomains,
		});
	}
}
