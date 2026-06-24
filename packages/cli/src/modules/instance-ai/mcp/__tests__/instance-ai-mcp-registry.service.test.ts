import type { Logger } from '@n8n/backend-common';
import type {
	CustomFetch,
	HttpTransport,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import type { CredentialsEntity, User } from '@n8n/db';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';
import type { OauthService } from '@/oauth/oauth.service';

import type { InstanceAiMcpRegistryConnectionRepository } from '../../repositories/instance-ai-mcp-registry-connection.repository';
import { InstanceAiMcpRegistryService } from '../instance-ai-mcp-registry.service';
import type { InstanceAiMcpRegistryConnection } from '../../entities/instance-ai-mcp-registry-connection.entity';

const proxyFetchMock = jest.fn();
const proxyFetch = ((...args: unknown[]) => proxyFetchMock(...args)) as unknown as CustomFetch;

jest.mock('@n8n/ai-utilities', () => ({
	proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

function makeRegistryServer(
	slug: string,
	overrides: Partial<McpRegistryServer> = {},
): McpRegistryServer {
	return {
		name: `com.test/${slug}`,
		slug,
		title: slug,
		description: `${slug} description`,
		tagline: `${slug} tagline`,
		version: '1.0.0',
		updatedAt: '2026-05-01T00:00:00.000Z',
		icons: [],
		authType: 'oauth2',
		remotes: [{ type: 'streamable-http', url: `https://${slug}.example.com/mcp` }],
		tools: [],
		isOfficial: true,
		origin: 'registry',
		status: 'active',
		...overrides,
	};
}

describe('InstanceAiMcpRegistryService', () => {
	const user = { id: 'user-1' } as User;
	const credential = {
		id: 'cred-1',
		name: 'MCP OAuth2',
		type: 'mcpOAuth2Api',
		shared: [{ role: 'credential:owner', projectId: 'project-1' }],
	} as CredentialsEntity;

	const oauthCredentialData = {
		clientId: 'client-id',
		clientSecret: 'client-secret',
		accessTokenUrl: 'https://auth.example.com/token',
		oauthTokenData: {
			access_token: 'stale-token',
			refresh_token: 'refresh-token',
		},
	};

	function createService() {
		const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
		const connectionRepository = mock<InstanceAiMcpRegistryConnectionRepository>();
		const mcpRegistryService = mock<McpRegistryService>();
		const credentialsFinderService = mock<CredentialsFinderService>();
		const credentialsService = mock<CredentialsService>();
		const oauthService = mock<OauthService>();
		const eventService = mock<EventService>();
		const transport = mock<HttpTransport>();
		transport.asCustomFetch.mockReturnValue(proxyFetch);
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.transport.mockReturnValue(transport);

		const service = new InstanceAiMcpRegistryService(
			logger,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
			oauthService,
			eventService,
			outboundHttp,
			mock<SsrfProtectionConfig>({ enabled: true }),
			mock<SsrfProtectionService>(),
		);

		return {
			service,
			logger,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
			oauthService,
			eventService,
			outboundHttp,
		};
	}

	beforeEach(() => {
		jest.clearAllMocks();
		proxyFetchMock.mockReset();
	});

	it('returns empty list when the user has no registry connections', async () => {
		const { service, connectionRepository, mcpRegistryService } = createService();
		connectionRepository.findBy.mockResolvedValue([]);

		const result = await service.getRegistryMcpServers(user);

		expect(result).toEqual([]);
		expect(mcpRegistryService.getBySlugs).not.toHaveBeenCalled();
	});

	it('resolves servers with deterministic names and preferred transport', async () => {
		const {
			service,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
		} = createService();
		const credentialsById: Record<string, CredentialsEntity> = {
			'cred-1': { id: 'cred-1', name: 'MCP OAuth2 #1', type: 'mcpOAuth2Api' } as CredentialsEntity,
			'cred-2': { id: 'cred-2', name: 'MCP OAuth2 #2', type: 'mcpOAuth2Api' } as CredentialsEntity,
			'cred-3': { id: 'cred-3', name: 'MCP OAuth2 #3', type: 'mcpOAuth2Api' } as CredentialsEntity,
		};
		connectionRepository.findBy.mockResolvedValue([
			{ id: '2', userId: user.id, serverSlug: 'linear', credentialId: 'cred-2' },
			{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: 'cred-1' },
			{ id: '3', userId: user.id, serverSlug: 'notion', credentialId: 'cred-3' },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([
			makeRegistryServer('linear', {
				remotes: [
					{ type: 'sse', url: 'https://linear.example.com/sse' },
					{ type: 'streamable-http', url: 'https://linear.example.com/mcp' },
				],
			}),
			makeRegistryServer('notion', {
				remotes: [{ type: 'sse', url: 'https://notion.example.com/sse' }],
			}),
		]);
		credentialsFinderService.findCredentialForUser.mockImplementation(async (credentialId) => {
			return credentialsById[credentialId] ?? null;
		});
		credentialsService.decrypt.mockResolvedValue(oauthCredentialData);

		const result = await service.getRegistryMcpServers(user);

		expect(result).toHaveLength(3);
		expect(result[0]).toEqual(
			expect.objectContaining({
				name: 'mcp_linear',
				url: 'https://linear.example.com/mcp',
				transport: 'streamableHttp',
				cacheKey: 'registry-connection:1',
				fetch: expect.any(Function),
			}),
		);
		expect(result[1]).toEqual(
			expect.objectContaining({
				name: 'mcp_linear_2',
				url: 'https://linear.example.com/mcp',
				transport: 'streamableHttp',
				cacheKey: 'registry-connection:2',
				fetch: expect.any(Function),
			}),
		);
		expect(result[2]).toEqual(
			expect.objectContaining({
				name: 'mcp_notion',
				url: 'https://notion.example.com/sse',
				transport: 'sse',
				cacheKey: 'registry-connection:3',
				fetch: expect.any(Function),
			}),
		);
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith('cred-1', user, [
			'credential:read',
		]);
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith('cred-2', user, [
			'credential:read',
		]);
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith('cred-3', user, [
			'credential:read',
		]);
	});

	it('builds MCP fetch with OutboundHttp default SSRF protection enabled', async () => {
		const {
			service,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
			outboundHttp,
		} = createService();
		connectionRepository.findBy.mockResolvedValue([
			{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue(oauthCredentialData);

		await service.getRegistryMcpServers(user);

		expect(outboundHttp.transport).toHaveBeenCalledWith(
			expect.not.objectContaining({ ssrf: 'disabled' }),
		);
	});

	it('skips connections with missing server slugs or unsupported remotes', async () => {
		const { service, connectionRepository, mcpRegistryService, logger } = createService();
		connectionRepository.findBy.mockResolvedValue([
			{ id: '1', userId: user.id, serverSlug: 'missing', credentialId: credential.id },
			{ id: '2', userId: user.id, serverSlug: 'bad-remote', credentialId: credential.id },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([
			makeRegistryServer('bad-remote', { remotes: [] }),
		]);

		const result = await service.getRegistryMcpServers(user);

		expect(result).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipping MCP registry connection with missing server slug',
			expect.objectContaining({ connectionId: '1', serverSlug: 'missing', userId: user.id }),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipping MCP registry connection without supported remote transport',
			expect.objectContaining({ connectionId: '2', serverSlug: 'bad-remote' }),
		);
	});

	it('does not attach custom fetch for non-oauth servers', async () => {
		const {
			service,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
		} = createService();
		connectionRepository.findBy.mockResolvedValue([
			{ id: '1', userId: user.id, serverSlug: 'public-server', credentialId: credential.id },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([
			makeRegistryServer('public-server', {
				// currently only oauth2 is supported
				// so we need to cast it to test this behavior
				authType: 'none' as unknown as 'oauth2',
			}),
		]);

		const [server] = await service.getRegistryMcpServers(user);

		expect(server).toEqual(
			expect.objectContaining({
				name: 'mcp_public-server',
				url: 'https://public-server.example.com/mcp',
				transport: 'streamableHttp',
				cacheKey: 'registry-connection:1',
			}),
		);
		expect(server.fetch).toBeUndefined();
		expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});

	it('adds auth header and retries once with refreshed OAuth token after 401', async () => {
		const {
			service,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
			oauthService,
		} = createService();
		connectionRepository.findBy.mockResolvedValue([
			{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue(oauthCredentialData);
		proxyFetchMock
			.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
			.mockResolvedValueOnce(new Response('ok', { status: 200 }));
		oauthService.refreshOAuth2CredentialById.mockResolvedValue({
			Authorization: 'Bearer fresh-token',
		});

		const [server] = await service.getRegistryMcpServers(user);
		const response = await server.fetch?.('https://linear.example.com/mcp');

		expect(response?.status).toBe(200);
		expect(proxyFetchMock).toHaveBeenCalledTimes(2);
		const [, firstInit] = proxyFetchMock.mock.calls[0] as [unknown, RequestInit];
		const [, secondInit] = proxyFetchMock.mock.calls[1] as [unknown, RequestInit];
		expect(new Headers(firstInit.headers).get('Authorization')).toBe('Bearer stale-token');
		expect(new Headers(secondInit.headers).get('Authorization')).toBe('Bearer fresh-token');
		expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith(
			credential.id,
			'project-1',
		);
	});

	it('returns original 401 response when token refresh fails', async () => {
		const {
			service,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
			oauthService,
		} = createService();
		connectionRepository.findBy.mockResolvedValue([
			{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue(oauthCredentialData);
		oauthService.refreshOAuth2CredentialById.mockResolvedValue(null);

		proxyFetchMock.mockResolvedValue(new Response('unauthorized', { status: 401 }));

		const [server] = await service.getRegistryMcpServers(user);
		const response = await server.fetch?.('https://linear.example.com/mcp');

		expect(response?.status).toBe(401);
		expect(proxyFetchMock).toHaveBeenCalledTimes(1);
		expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith(
			credential.id,
			'project-1',
		);
	});

	describe('credential domain restrictions', () => {
		it('returns a fetch that blocks when credential mode is "none" (block all)', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				credentialsService,
			} = createService();
			connectionRepository.findBy.mockResolvedValue([
				{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
			] as InstanceAiMcpRegistryConnection[]);
			mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue({
				...oauthCredentialData,
				allowedHttpRequestDomains: 'none',
			});

			const result = await service.getRegistryMcpServers(user);

			expect(result).toHaveLength(1);
			await expect(result[0].fetch?.('https://linear.example.com/mcp')).rejects.toThrow();
			expect(proxyFetchMock).not.toHaveBeenCalled();
		});

		it('returns a fetch that blocks when endpoint URL is not in the credential allowlist', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				credentialsService,
			} = createService();
			connectionRepository.findBy.mockResolvedValue([
				{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
			] as InstanceAiMcpRegistryConnection[]);
			mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue({
				...oauthCredentialData,
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'other-host.test',
			});

			const result = await service.getRegistryMcpServers(user);

			expect(result).toHaveLength(1);
			await expect(result[0].fetch?.('https://linear.example.com/mcp')).rejects.toThrow();
			expect(proxyFetchMock).not.toHaveBeenCalled();
		});

		it('allows connection when endpoint URL matches the credential allowlist', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				credentialsService,
			} = createService();
			connectionRepository.findBy.mockResolvedValue([
				{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
			] as InstanceAiMcpRegistryConnection[]);
			mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue({
				...oauthCredentialData,
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'linear.example.com',
			});

			const result = await service.getRegistryMcpServers(user);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					name: 'mcp_linear',
					url: 'https://linear.example.com/mcp',
					fetch: expect.any(Function),
				}),
			);
		});

		it('allows connection when credential mode is "all"', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				credentialsService,
			} = createService();
			connectionRepository.findBy.mockResolvedValue([
				{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
			] as InstanceAiMcpRegistryConnection[]);
			mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue({
				...oauthCredentialData,
				allowedHttpRequestDomains: 'all',
			});

			const result = await service.getRegistryMcpServers(user);

			expect(result).toHaveLength(1);
			expect(result[0].fetch).toBeDefined();
		});
	});

	describe('listConnectionsForUser', () => {
		it('returns rows scoped to the requesting user', async () => {
			const { service, connectionRepository } = createService();
			const rows = [
				{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: 'cred-1' },
			] as InstanceAiMcpRegistryConnection[];
			connectionRepository.findBy.mockResolvedValue(rows);

			const result = await service.listConnectionsForUser(user);

			expect(connectionRepository.findBy).toHaveBeenCalledWith({ userId: user.id });
			expect(result).toBe(rows);
		});
	});

	describe('createConnection', () => {
		it('creates a connection and returns it with the resolved credential and server', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				eventService,
			} = createService();
			const linearServer = makeRegistryServer('linear');
			mcpRegistryService.get.mockResolvedValue(linearServer);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			connectionRepository.create.mockImplementation((entity) => entity as never);
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			const result = await service.createConnection(user, {
				serverSlug: 'linear',
				credentialId: 'cred-1',
			});

			expect(result.connection).toMatchObject({
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
			});
			expect(result.connection.id).toBeDefined();
			expect(result.credential).toBe(credential);
			expect(result.server).toBe(linearServer);
			expect(eventService.emit).toHaveBeenCalledWith(
				'instance-ai-mcp-registry-connection-created',
				{ userId: user.id, serverSlug: 'linear' },
			);
		});

		it('throws NotFoundError when the server slug is unknown', async () => {
			const { service, mcpRegistryService, eventService } = createService();
			mcpRegistryService.get.mockResolvedValue(undefined);

			await expect(
				service.createConnection(user, { serverSlug: 'unknown', credentialId: 'cred-1' }),
			).rejects.toBeInstanceOf(NotFoundError);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the credential is not accessible to the user', async () => {
			const { service, mcpRegistryService, credentialsFinderService, eventService } =
				createService();
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(
				service.createConnection(user, { serverSlug: 'linear', credentialId: 'cred-1' }),
			).rejects.toBeInstanceOf(NotFoundError);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('throws ConflictError when a connection for the (user, server) pair already exists', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				eventService,
			} = createService();
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			connectionRepository.findOneBy.mockResolvedValue({
				id: 'existing',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-other',
			} as InstanceAiMcpRegistryConnection);

			await expect(
				service.createConnection(user, { serverSlug: 'linear', credentialId: 'cred-1' }),
			).rejects.toBeInstanceOf(ConflictError);
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
			expect(connectionRepository.save).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('translates unique-index violations into ConflictError', async () => {
			const { service, connectionRepository, mcpRegistryService, credentialsFinderService } =
				createService();
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			connectionRepository.create.mockImplementation((entity) => entity as never);
			const uniqueErr = new QueryFailedError('insert', [], new Error('uniq'));
			(uniqueErr as unknown as { driverError: { code: string } }).driverError = {
				code: 'SQLITE_CONSTRAINT_UNIQUE',
			};
			connectionRepository.save.mockRejectedValue(uniqueErr);

			await expect(
				service.createConnection(user, { serverSlug: 'linear', credentialId: 'cred-1' }),
			).rejects.toBeInstanceOf(ConflictError);
		});
	});

	describe('deleteConnection', () => {
		it('deletes the row and emits a telemetry event', async () => {
			const { service, connectionRepository, eventService } = createService();
			const row = {
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
			} as InstanceAiMcpRegistryConnection;
			connectionRepository.findOneBy.mockResolvedValue(row);

			await service.deleteConnection(user, 'conn-1');

			expect(connectionRepository.findOneBy).toHaveBeenCalledWith({
				id: 'conn-1',
				userId: user.id,
			});
			expect(connectionRepository.delete).toHaveBeenCalledWith({ id: 'conn-1' });
			expect(eventService.emit).toHaveBeenCalledWith(
				'instance-ai-mcp-registry-connection-deleted',
				{ userId: user.id, serverSlug: 'linear' },
			);
		});

		it('throws NotFoundError when the row does not belong to the user', async () => {
			const { service, connectionRepository, eventService } = createService();
			connectionRepository.findOneBy.mockResolvedValue(null);

			await expect(service.deleteConnection(user, 'conn-1')).rejects.toBeInstanceOf(NotFoundError);
			expect(connectionRepository.delete).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
