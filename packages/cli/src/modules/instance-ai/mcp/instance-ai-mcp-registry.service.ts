import { proxyFetch } from '@n8n/ai-utilities';
import { isObjectLiteral, Logger } from '@n8n/backend-common';
import {
	ClientOAuth2,
	type ClientOAuth2TokenData,
	type OAuth2AuthenticationMethod,
} from '@n8n/client-oauth2';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { McpServerConfig } from '@n8n/instance-ai';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryRemote } from '@/modules/mcp-registry/registry/mcp-registry.types';

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
}

function readString(data: Record<string, unknown>, key: string): string | undefined {
	const value = data[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readTokenValue(
	tokenData: Record<string, unknown>,
	camelCaseKey: string,
	snakeCaseKey: string,
): string | undefined {
	return readString(tokenData, camelCaseKey) ?? readString(tokenData, snakeCaseKey);
}

function readAccessToken(tokenData: Record<string, unknown>): string | undefined {
	return readTokenValue(tokenData, 'accessToken', 'access_token');
}

function readRefreshToken(tokenData: Record<string, unknown>): string | undefined {
	return readTokenValue(tokenData, 'refreshToken', 'refresh_token');
}

function readOAuthTokenData(data: ICredentialDataDecryptedObject): Record<string, unknown> | null {
	const tokenData = data.oauthTokenData;
	return isObjectLiteral(tokenData) ? tokenData : null;
}

function toClientOAuth2TokenData(
	data: ICredentialDataDecryptedObject,
): ClientOAuth2TokenData | null {
	const tokenData = readOAuthTokenData(data);
	if (!tokenData) {
		return null;
	}

	const normalizedTokenData: ClientOAuth2TokenData = {
		access_token: '',
		refresh_token: '',
	};

	for (const [key, value] of Object.entries(tokenData)) {
		if (typeof value === 'string') {
			normalizedTokenData[key] = value;
		}
	}

	const accessToken = readAccessToken(tokenData);
	if (accessToken) {
		normalizedTokenData.access_token = accessToken;
	}

	const refreshToken = readRefreshToken(tokenData);
	if (refreshToken) {
		normalizedTokenData.refresh_token = refreshToken;
	}

	if (!normalizedTokenData.access_token) {
		return null;
	}

	return normalizedTokenData;
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

function createOAuth2Client(data: Record<string, unknown>): ClientOAuth2 | null {
	const clientId = readString(data, 'clientId');
	const accessTokenUrl = readString(data, 'accessTokenUrl');
	if (!clientId || !accessTokenUrl) {
		return null;
	}

	const scope = readString(data, 'scope');
	const scopes = scope
		?.split(' ')
		.map((s) => s.trim())
		.filter(Boolean);

	const authenticationValue = readString(data, 'authentication');
	const authentication: OAuth2AuthenticationMethod | undefined =
		authenticationValue === 'body' || authenticationValue === 'header'
			? authenticationValue
			: undefined;

	let additionalBodyProperties: Record<string, unknown> | undefined;
	const rawAdditionalBodyProperties = readString(data, 'additionalBodyProperties');
	if (rawAdditionalBodyProperties) {
		try {
			const parsed = JSON.parse(rawAdditionalBodyProperties) as unknown;
			if (isObjectLiteral(parsed)) {
				additionalBodyProperties = parsed;
			}
		} catch {
			// Ignore malformed JSON
		}
	}

	return new ClientOAuth2({
		clientId,
		clientSecret: readString(data, 'clientSecret'),
		accessTokenUri: accessTokenUrl,
		scopes: scopes && scopes.length > 0 ? scopes : undefined,
		ignoreSSLIssues: data.ignoreSSLIssues === true,
		authentication,
		...(additionalBodyProperties ? { additionalBodyProperties } : {}),
	});
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
		private readonly credentialsHelper: CredentialsHelper,
	) {
		this.logger = logger.scoped('instance-ai');
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

				serverConfig.fetch = this.createCustomFetch(oauth2FetchContext, user);
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

		return {
			credentialId: config.credentialId,
			accessToken,
		};
	}

	private createCustomFetch(oauth2Config: OAuth2FetchContext, user: User): typeof fetch {
		let accessToken = oauth2Config.accessToken;

		return async (input: RequestInfo | URL, init?: RequestInit) => {
			const initialHeaders = new Headers(init?.headers);
			initialHeaders.set('Authorization', `Bearer ${accessToken}`);

			const response = await proxyFetch(input, { ...init, headers: initialHeaders });
			if (response.status !== 401) {
				return response;
			}

			const refreshedAccessToken = await this.refreshAccessToken(oauth2Config.credentialId, user);
			if (!refreshedAccessToken) {
				return response;
			}

			accessToken = refreshedAccessToken;
			const retryHeaders = new Headers(init?.headers);
			retryHeaders.set('Authorization', `Bearer ${accessToken}`);

			return await proxyFetch(input, { ...init, headers: retryHeaders });
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

	private async refreshAccessToken(credentialId: string, user: User): Promise<string | null> {
		const credentialWithData = await this.getCredentialWithData(credentialId, user);
		if (!credentialWithData) {
			return null;
		}

		const { credential, data } = credentialWithData;
		const oauthTokenData = toClientOAuth2TokenData(data);
		if (!oauthTokenData) {
			return null;
		}

		const oAuthClient = createOAuth2Client(data);
		if (!oAuthClient) {
			return null;
		}

		const grantType = readString(data, 'grantType');
		const token = oAuthClient.createToken(oauthTokenData);
		let refreshedTokenData: ClientOAuth2TokenData;
		try {
			if (grantType === 'clientCredentials') {
				refreshedTokenData = (await token.client.credentials.getToken()).data;
			} else {
				refreshedTokenData = (await token.refresh()).data;
			}
		} catch {
			return null;
		}

		const refreshedAccessToken = readAccessToken(refreshedTokenData);
		if (!refreshedAccessToken) {
			return null;
		}

		await this.credentialsHelper.updateCredentials(
			{ id: credential.id, name: credential.name },
			credential.type,
			{ ...data, oauthTokenData: refreshedTokenData },
		);
		return refreshedAccessToken;
	}
}
