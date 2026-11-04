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
import { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { ICredentialDataDecryptedObject, McpRegistryConnection } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { OauthService } from '@/oauth/oauth.service';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';
import type { AuthFetchDomainPolicy } from '@/utils/auth-fetch';

import { createMcpAuthFetch } from './mcp-auth-fetch';
import { findUsableMcpCredential } from './mcp-credential-access';
import {
	findAiGatewayCredentialType,
	getConfiguredEndpointUrl,
	isSupportedMcpRegistryCredentialType,
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
	toAgentMcpTransport,
} from './mcp-registry-connection';
import { McpRegistryService } from './registry/mcp-registry.service';

const discoveryTimeoutMs = 10_000;

type ResolvedCredential = {
	credential: CredentialsEntity;
	data: ICredentialDataDecryptedObject;
	projectId: string;
};

type PreparedDiscovery = {
	clientConfig: {
		name: string;
		url: string;
		transport: 'sse' | 'streamableHttp';
		fetch: CustomFetch;
	};
	responseConnection: McpRegistryDiscoveredConnection;
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

function toTool(tool: BuiltTool, serverName: string): McpRegistryDiscoveredTool {
	const name = tool.mcpToolName ?? stripServerPrefix(tool.name, serverName);
	return {
		name,
		...(tool.description ? { description: tool.description } : {}),
		category: classifyMcpTool({ name, annotations: tool.mcpAnnotations }),
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

async function listToolsWithinDeadline(
	client: McpClient,
	timeoutMs: number,
): Promise<Awaited<ReturnType<McpClient['listTools']>>> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(
			() => reject(new Error(`MCP discovery timed out after ${timeoutMs}ms`)),
			timeoutMs,
		);
	});

	try {
		return await Promise.race([client.listTools(), timeout]);
	} finally {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
	}
}

@Service()
export class McpConnectionDiscoveryService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly registryService: McpRegistryService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialTypes: CredentialTypes,
		private readonly oauthService: OauthService,
		private readonly outboundHttp: OutboundHttp,
		private readonly aiGatewayService: AiGatewayService,
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
			if (error instanceof NotFoundError) throw error;
			this.logger.warn('Failed to prepare MCP discovery', {
				errorType: ensureError(error).name,
			});
			return disconnected('authentication');
		}

		let failureReason: McpRegistryDiscoveryFailureReason = 'unknown';
		let receivedResponse = false;
		const classifiedFetch: CustomFetch = async (input, init) => {
			try {
				const response = await prepared.clientConfig.fetch(input, init);
				receivedResponse = true;
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
			const tools = (await listToolsWithinDeadline(client, discoveryTimeoutMs)).map((tool) =>
				toTool(tool, prepared.clientConfig.name),
			);
			if (client.getConnectionFailures().length > 0) return disconnected(failureReason);
			return {
				status: 'connected',
				connection: prepared.responseConnection,
				tools,
			};
		} catch (error) {
			if (failureReason === 'unknown' && !receivedResponse) failureReason = 'server_unavailable';
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
		if (server?.status !== 'active') {
			throw new NotFoundError('MCP registry server not found');
		}
		const connection = resolveMcpRegistryConnection(server);
		if (!connection) throw new BadRequestError('MCP registry server has no supported connection');
		if ('aiGateway' in source) {
			return await this.prepareAiGatewaySource(user, source.slug, connection);
		}

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
		};
	}

	/** Gateway credits have no stored credential: mint one for the request user. */
	private async prepareAiGatewaySource(
		user: User,
		slug: string,
		connection: McpRegistryConnection,
	): Promise<PreparedDiscovery> {
		const credentialType = findAiGatewayCredentialType(connection);
		if (!credentialType) {
			throw new BadRequestError('MCP registry server does not offer Gateway credits');
		}
		const credentialData = await this.aiGatewayService.getSyntheticCredential({
			credentialType,
			userId: user.id,
		});
		const prepared = prepareMcpRegistryConnection({ connection, credentialType, credentialData });
		if (!prepared.ok) throw new BadRequestError('Credential cannot connect to this MCP server');

		return {
			clientConfig: {
				name: safeServerName(slug),
				url: prepared.value.endpointUrl,
				transport: toAgentMcpTransport(prepared.value.transport),
				fetch: createMcpAuthFetch({
					authentication: credentialType,
					baseFetch: createAiMcpFetch(this.outboundHttp),
					credentialData,
					initialHeaders: prepared.value.headers,
					oauthService: this.oauthService,
					projectId: null,
					allowedDomains: { mode: 'domains', domains: prepared.value.allowedDomains },
				}),
			},
			responseConnection: {
				url: getConfiguredEndpointUrl(connection),
				transport: toAgentMcpTransport(connection.transport),
				// An agent entry stores Gateway credits as 'none', with no credential id.
				authentication: 'none',
				metadata: { nodeTypeName: connection.nodeTypeName },
			},
		};
	}

	private async resolveCredential(user: User, credentialId: string): Promise<ResolvedCredential> {
		const credential = await findUsableMcpCredential(
			this.credentialsFinderService,
			credentialId,
			user,
		);
		if (!credential) {
			throw new NotFoundError('Credential not found or not accessible');
		}

		const projectId =
			credential.shared?.find((share) => share.role === 'credential:owner')?.projectId ??
			credential.shared?.[0]?.projectId;
		if (!projectId) throw new BadRequestError('Credential has no owning project');

		const { getBase } = await import('@/workflow-execute-additional-data.js');
		const additionalData = await getBase({ projectId, userId: user.id });
		const data = await this.credentialsHelper.getDecrypted(
			additionalData,
			{ id: credential.id, name: credential.name },
			credential.type,
			'internal',
		);
		if (!isObjectLiteral(data) || Object.keys(data).length === 0) {
			throw new BadRequestError('Credential could not be resolved');
		}
		return { credential, data, projectId };
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
