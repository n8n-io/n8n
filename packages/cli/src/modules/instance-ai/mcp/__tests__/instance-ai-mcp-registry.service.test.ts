import type { BuiltTool } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, User } from '@n8n/db';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialTypes } from '@/credential-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';
import type { OauthService } from '@/oauth/oauth.service';

import type { InstanceAiMcpRegistryConnection } from '../../entities/instance-ai-mcp-registry-connection.entity';
import type { InstanceAiMcpRegistryConnectionRepository } from '../../repositories/instance-ai-mcp-registry-connection.repository';
import { InstanceAiMcpRegistryService } from '../instance-ai-mcp-registry.service';

const {
	mcpClientCloseMock,
	mcpClientConstructorMock,
	mcpClientGetConnectionFailuresMock,
	mcpClientListToolsMock,
} = vi.hoisted(() => ({
	mcpClientCloseMock: vi.fn<() => Promise<void>>(),
	mcpClientConstructorMock: vi.fn<(configs: unknown) => void>(),
	mcpClientGetConnectionFailuresMock: vi.fn(),
	mcpClientListToolsMock: vi.fn<() => Promise<BuiltTool[]>>(),
}));

vi.mock('@n8n/agents', () => ({
	McpClient: vi.fn(function (configs: unknown) {
		mcpClientConstructorMock(configs);
		return {
			close: mcpClientCloseMock,
			getConnectionFailures: mcpClientGetConnectionFailuresMock,
			listTools: mcpClientListToolsMock,
		};
	}),
}));

// Stands in for the proxy-aware transport fetch the service builds from its
// injected `OutboundHttp`.
const proxyFetchMock = vi.fn();
const proxyFetch = ((...args: unknown[]) => proxyFetchMock(...args)) as unknown as CustomFetch;

function makeRegistryServer(
	slug: string,
	overrides: Record<string, unknown> = {},
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
		authType: 'usesCredentials',
		usesCredentials: [{ credentialType: 'mcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' }],
		remotes: [{ type: 'streamable-http', url: `https://${slug}.example.com/mcp` }],
		tools: [],
		isOfficial: true,
		origin: 'registry',
		status: 'active',
		...overrides,
	} as McpRegistryServer;
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
		const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
		const connectionRepository = mock<InstanceAiMcpRegistryConnectionRepository>();
		const mcpRegistryService = mock<McpRegistryService>();
		const credentialsFinderService = mock<CredentialsFinderService>();
		const credentialsService = mock<CredentialsService>();
		const credentialTypes = mock<CredentialTypes>();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getParentTypes.mockReturnValue(['mcpOAuth2Api', 'oAuth2Api']);
		credentialTypes.getByName.mockReturnValue({
			name: 'mcpOAuth2Api',
			displayName: 'MCP OAuth2',
			properties: [],
		});
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
			credentialTypes,
			oauthService,
			eventService,
			outboundHttp,
		);

		return {
			service,
			logger,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
			credentialTypes,
			oauthService,
			eventService,
			outboundHttp,
		};
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mcpClientCloseMock.mockReset();
		mcpClientCloseMock.mockResolvedValue(undefined);
		mcpClientConstructorMock.mockReset();
		mcpClientGetConnectionFailuresMock.mockReset();
		mcpClientGetConnectionFailuresMock.mockReturnValue([]);
		mcpClientListToolsMock.mockReset();
		mcpClientListToolsMock.mockResolvedValue([]);
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
			{
				id: '1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
				toolFilter: { mode: 'allow', tools: ['issues'] },
			},
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
				toolFilter: { mode: 'allow', tools: ['issues'] },
				fetch: expect.any(Function),
				metadata: { connectionId: '1', serverSlug: 'linear', userId: user.id },
			}),
		);
		expect(result[1]).toEqual(
			expect.objectContaining({
				name: 'mcp_linear_2',
				url: 'https://linear.example.com/mcp',
				transport: 'streamableHttp',
				cacheKey: 'registry-connection:2',
				toolFilter: undefined,
				fetch: expect.any(Function),
				metadata: { connectionId: '2', serverSlug: 'linear', userId: user.id },
			}),
		);
		expect(result[2]).toEqual(
			expect.objectContaining({
				name: 'mcp_notion',
				url: 'https://notion.example.com/sse',
				transport: 'sse',
				cacheKey: 'registry-connection:3',
				toolFilter: undefined,
				fetch: expect.any(Function),
				metadata: { connectionId: '3', serverSlug: 'notion', userId: user.id },
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
			expect.not.objectContaining({ useDefaultSsrfPolicy: 'unsafe' }),
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

	it('skips servers whose authentication type is not supported', async () => {
		const { service, connectionRepository, mcpRegistryService, credentialsFinderService } =
			createService();
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

		const servers = await service.getRegistryMcpServers(user);

		expect(servers).toEqual([]);
		expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
	});

	it('skips connections whose server URL is a template', async () => {
		// This path decrypts the credential without resolving expressions, so the
		// template would stay unresolved. The row is dropped instead of offered.
		const { service, connectionRepository, mcpRegistryService, logger } = createService();
		connectionRepository.findBy.mockResolvedValue([
			{ id: '3', userId: user.id, serverSlug: 'genie', credentialId: credential.id },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([
			makeRegistryServer('genie', {
				remotes: [
					{ type: 'streamable-http-templated', url: '={{$self["host"]}}/api/2.0/mcp/genie' },
				],
			}),
		]);

		const result = await service.getRegistryMcpServers(user);

		expect(result).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipping MCP registry connection with a templated server URL',
			expect.objectContaining({ connectionId: '3', serverSlug: 'genie' }),
		);
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

	it('rejects non-OAuth credentials', async () => {
		const {
			service,
			logger,
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
			credentialTypes,
		} = createService();
		const apiCredential = {
			...credential,
			type: 'githubApi',
			name: 'GitHub access token',
		} as CredentialsEntity;
		connectionRepository.findBy.mockResolvedValue([
			{ id: '1', userId: user.id, serverSlug: 'github', credentialId: apiCredential.id },
		] as InstanceAiMcpRegistryConnection[]);
		mcpRegistryService.getBySlugs.mockResolvedValue([
			makeRegistryServer('github', {
				usesCredentials: [
					{ credentialType: 'githubApi', name: 'Access Token', value: 'accessToken' },
				],
			}),
		]);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(apiCredential);
		credentialsService.decrypt.mockResolvedValue({ accessToken: 'github-token' });
		credentialTypes.getParentTypes.mockReturnValue([]);
		credentialTypes.getByName.mockReturnValue({
			name: 'githubApi',
			displayName: 'GitHub API',
			properties: [],
		});

		const servers = await service.getRegistryMcpServers(user);

		expect(servers).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipping MCP registry connection with unsupported credential type',
			expect.objectContaining({ credentialType: 'githubApi' }),
		);
		expect(proxyFetchMock).not.toHaveBeenCalled();
	});

	it.each(['authenticate', 'preAuthentication'] as const)(
		'rejects OAuth credentials with a %s hook',
		async (hook) => {
			const {
				service,
				logger,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				credentialsService,
				credentialTypes,
			} = createService();
			connectionRepository.findBy.mockResolvedValue([
				{ id: '1', userId: user.id, serverSlug: 'linear', credentialId: credential.id },
			] as InstanceAiMcpRegistryConnection[]);
			mcpRegistryService.getBySlugs.mockResolvedValue([makeRegistryServer('linear')]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue(oauthCredentialData);
			credentialTypes.getByName.mockReturnValue({
				name: 'mcpOAuth2Api',
				displayName: 'MCP OAuth2',
				properties: [],
				[hook]: vi.fn(),
			});

			const servers = await service.getRegistryMcpServers(user);

			expect(servers).toEqual([]);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping MCP registry connection with unsupported credential type',
				expect.objectContaining({ credentialType: 'mcpOAuth2Api' }),
			);
			expect(proxyFetchMock).not.toHaveBeenCalled();
		},
	);

	describe('credential domain restrictions', () => {
		const syntheticOAuthServer = () =>
			makeRegistryServer('linear', { authType: 'oauth2', usesCredentials: undefined });
		const syntheticCredential = {
			...credential,
			type: 'linearMcpOAuth2Api',
		} as CredentialsEntity;

		it.each([
			['generated', 'none', syntheticOAuthServer(), syntheticCredential, undefined],
			['native', 'none', makeRegistryServer('linear'), credential, undefined],
			['generated', 'domains', syntheticOAuthServer(), syntheticCredential, 'other-host.test'],
			['native', 'domains', makeRegistryServer('linear'), credential, 'other-host.test'],
			['generated', 'all', syntheticOAuthServer(), syntheticCredential, undefined],
		])(
			'pins %s credentials to the registry hostname in %s mode',
			async (_, allowedHttpRequestDomains, server, selectedCredential, allowedDomains) => {
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
				mcpRegistryService.getBySlugs.mockResolvedValue([server]);
				credentialsFinderService.findCredentialForUser.mockResolvedValue(selectedCredential);
				credentialsService.decrypt.mockResolvedValue({
					...oauthCredentialData,
					allowedHttpRequestDomains,
					...(allowedDomains ? { allowedDomains } : {}),
				});
				proxyFetchMock.mockResolvedValue(new Response('ok'));

				const [result] = await service.getRegistryMcpServers(user);

				expect(result.url).toBe('https://linear.example.com/mcp');
				await expect(result.fetch?.('https://linear.example.com/mcp')).resolves.toBeDefined();
				await expect(result.fetch?.('https://other.example.com/mcp')).rejects.toThrow();
				expect(proxyFetchMock).toHaveBeenCalledOnce();
			},
		);
	});

	describe('connection tools', () => {
		function makeConnection(
			overrides: Partial<InstanceAiMcpRegistryConnection> = {},
		): InstanceAiMcpRegistryConnection {
			return {
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: credential.id,
				...overrides,
			} as InstanceAiMcpRegistryConnection;
		}

		function arrangeResolvableConnection({
			connectionRepository,
			mcpRegistryService,
			credentialsFinderService,
			credentialsService,
		}: Pick<
			ReturnType<typeof createService>,
			| 'connectionRepository'
			| 'mcpRegistryService'
			| 'credentialsFinderService'
			| 'credentialsService'
		>) {
			const connection = makeConnection();
			connectionRepository.findOneBy.mockResolvedValue(connection);
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue(oauthCredentialData);

			return connection;
		}

		function getConfiguredFetch(): CustomFetch {
			const [configs] = mcpClientConstructorMock.mock.lastCall ?? [];
			return (configs as Array<{ fetch: CustomFetch }>)[0].fetch;
		}

		it('lists tools with connection-local names and closes the MCP client', async () => {
			const deps = createService();
			const { service, connectionRepository, mcpRegistryService, credentialsFinderService } = deps;
			arrangeResolvableConnection(deps);
			mcpClientListToolsMock.mockResolvedValue([
				{ name: 'mcp_linear_search', description: 'Search Linear issues' },
				{ name: 'mcp_linear_create_issue', description: 'Create a Linear issue' },
				{ name: 'mcp_linear_no_description', description: '' },
			] satisfies BuiltTool[]);

			const result = await service.listConnectionTools(user, 'conn-1');

			expect(connectionRepository.findOneBy).toHaveBeenCalledWith({
				id: 'conn-1',
				userId: user.id,
			});
			expect(mcpRegistryService.get).toHaveBeenCalledWith('linear');
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				credential.id,
				user,
				['credential:read'],
			);
			expect(mcpClientConstructorMock).toHaveBeenCalledWith([
				expect.objectContaining({
					name: 'mcp_linear',
					url: 'https://linear.example.com/mcp',
					transport: 'streamableHttp',
					fetch: expect.any(Function),
					connectionTimeoutMs: 10_000,
				}),
			]);
			expect(result).toEqual({
				id: 'conn-1',
				status: 'connected',
				tools: [
					{ name: 'search', description: 'Search Linear issues' },
					{ name: 'create_issue', description: 'Create a Linear issue' },
					{ name: 'no_description' },
				],
			});
			expect(mcpClientCloseMock).toHaveBeenCalledTimes(1);
		});

		it('returns the original MCP name for collision-suffixed tools', async () => {
			const deps = createService();
			const { service } = deps;
			arrangeResolvableConnection(deps);
			mcpClientListToolsMock.mockResolvedValue([
				{
					name: 'mcp_linear_read_file_12345678',
					description: 'Read a file',
					mcpTool: true,
					mcpServerName: 'mcp_linear',
					mcpToolName: 'read file',
				},
			] satisfies BuiltTool[]);

			const result = await service.listConnectionTools(user, 'conn-1');

			expect(result).toEqual({
				id: 'conn-1',
				status: 'connected',
				tools: [{ name: 'read file', description: 'Read a file' }],
			});
		});

		it('treats a successful empty tool list as connected', async () => {
			const deps = createService();
			arrangeResolvableConnection(deps);

			const result = await deps.service.listConnectionTools(user, 'conn-1');

			expect(result).toEqual({ id: 'conn-1', status: 'connected', tools: [] });
		});

		it('throws NotFoundError when the connection does not belong to the user', async () => {
			const { service, connectionRepository, mcpRegistryService } = createService();
			connectionRepository.findOneBy.mockResolvedValue(null);

			await expect(service.listConnectionTools(user, 'missing')).rejects.toBeInstanceOf(
				NotFoundError,
			);

			expect(connectionRepository.findOneBy).toHaveBeenCalledWith({
				id: 'missing',
				userId: user.id,
			});
			expect(mcpRegistryService.get).not.toHaveBeenCalled();
			expect(mcpClientConstructorMock).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the registry server is missing', async () => {
			const { service, connectionRepository, mcpRegistryService } = createService();
			connectionRepository.findOneBy.mockResolvedValue(makeConnection());
			mcpRegistryService.get.mockResolvedValue(undefined);

			await expect(service.listConnectionTools(user, 'conn-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);

			expect(mcpRegistryService.get).toHaveBeenCalledWith('linear');
			expect(mcpClientConstructorMock).not.toHaveBeenCalled();
		});

		it('returns disconnected when the server has no supported remote transport', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				logger,
			} = createService();
			connectionRepository.findOneBy.mockResolvedValue(makeConnection());
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear', { remotes: [] }));

			const result = await service.listConnectionTools(user, 'conn-1');

			expect(result).toEqual({
				id: 'conn-1',
				status: 'disconnected',
				tools: [],
				failureReason: 'unknown',
			});
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
			expect(mcpClientConstructorMock).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping MCP registry connection without supported remote transport',
				expect.objectContaining({ connectionId: 'conn-1', serverSlug: 'linear' }),
			);
		});

		it('returns disconnected when OAuth credential data is unavailable', async () => {
			const {
				service,
				connectionRepository,
				mcpRegistryService,
				credentialsFinderService,
				logger,
			} = createService();
			connectionRepository.findOneBy.mockResolvedValue(makeConnection());
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			const result = await service.listConnectionTools(user, 'conn-1');

			expect(result).toEqual({
				id: 'conn-1',
				status: 'disconnected',
				tools: [],
				failureReason: 'authentication',
			});
			expect(mcpClientConstructorMock).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping MCP registry connection with inaccessible credential',
				expect.objectContaining({
					connectionId: 'conn-1',
					serverSlug: 'linear',
					credentialId: credential.id,
					userId: user.id,
				}),
			);
		});

		it('returns disconnected when the MCP client records a connection failure', async () => {
			const deps = createService();
			arrangeResolvableConnection(deps);
			mcpClientGetConnectionFailuresMock.mockReturnValue([
				{ server: 'mcp_linear', error: 'Connection timed out' },
			]);

			const result = await deps.service.listConnectionTools(user, 'conn-1');

			expect(result).toEqual({
				id: 'conn-1',
				status: 'disconnected',
				tools: [],
				failureReason: 'unknown',
			});
		});

		it.each([
			[401, 'authentication'],
			[403, 'authentication'],
			[503, 'server_unavailable'],
		] as const)('classifies an HTTP %i connection failure as %s', async (status, failureReason) => {
			const deps = createService();
			arrangeResolvableConnection(deps);
			proxyFetchMock.mockResolvedValue(new Response(null, { status }));
			mcpClientListToolsMock.mockImplementation(async () => {
				await getConfiguredFetch()('https://linear.example.com/mcp');
				return [];
			});
			mcpClientGetConnectionFailuresMock.mockReturnValue([
				{ server: 'mcp_linear', error: 'Connection failed' },
			]);

			const result = await deps.service.listConnectionTools(user, 'conn-1');

			expect(result).toEqual({
				id: 'conn-1',
				status: 'disconnected',
				tools: [],
				failureReason,
			});
		});

		it('classifies a rejected request as server unavailable', async () => {
			const deps = createService();
			arrangeResolvableConnection(deps);
			proxyFetchMock.mockRejectedValue(new Error('Connection refused'));
			mcpClientListToolsMock.mockImplementation(async () => {
				await getConfiguredFetch()('https://linear.example.com/mcp').catch(() => undefined);
				return [];
			});
			mcpClientGetConnectionFailuresMock.mockReturnValue([
				{ server: 'mcp_linear', error: 'Connection failed' },
			]);

			const result = await deps.service.listConnectionTools(user, 'conn-1');

			expect(result).toEqual({
				id: 'conn-1',
				status: 'disconnected',
				tools: [],
				failureReason: 'server_unavailable',
			});
		});

		it('returns statuses for all connections when one check throws', async () => {
			const deps = createService();
			const { connectionRepository, credentialsFinderService, credentialsService, logger } = deps;
			connectionRepository.findBy.mockResolvedValue([
				makeConnection(),
				makeConnection({ id: 'conn-2', serverSlug: 'notion' }),
			]);
			deps.mcpRegistryService.get.mockImplementation(async (slug) => {
				if (slug === 'notion') throw new Error('Registry unavailable');
				return makeRegistryServer(slug);
			});
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue(oauthCredentialData);

			const result = await deps.service.listAllConnectionTools(user);

			expect(result).toEqual([
				{ id: 'conn-1', status: 'connected', tools: [] },
				{
					id: 'conn-2',
					status: 'disconnected',
					tools: [],
					failureReason: 'unknown',
				},
			]);
			expect(logger.warn).toHaveBeenCalledWith('Failed to check MCP connection', {
				connectionId: 'conn-2',
				serverSlug: 'notion',
				error: expect.any(Error),
			});
		});

		it('closes the MCP client when listing tools fails', async () => {
			const deps = createService();
			const { service } = deps;
			arrangeResolvableConnection(deps);
			mcpClientListToolsMock.mockRejectedValue(new Error('list failed'));

			await expect(service.listConnectionTools(user, 'conn-1')).rejects.toThrow('list failed');

			expect(mcpClientCloseMock).toHaveBeenCalledTimes(1);
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

		it('refuses a server whose URL is a template', async () => {
			// This path cannot resolve the template, so the connection would persist
			// and read as connected while `getRegistryMcpServers` skips it.
			const { service, connectionRepository, mcpRegistryService, credentialsFinderService } =
				createService();
			mcpRegistryService.get.mockResolvedValue(
				makeRegistryServer('genie', {
					remotes: [
						{ type: 'streamable-http-templated', url: '={{$self["host"]}}/api/2.0/mcp/genie' },
					],
				}),
			);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);

			await expect(
				service.createConnection(user, { serverSlug: 'genie', credentialId: 'cred-1' }),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(connectionRepository.save).not.toHaveBeenCalled();
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

		it('translates unique-index violations reported under the base SQLite code into ConflictError', async () => {
			const { service, connectionRepository, mcpRegistryService, credentialsFinderService } =
				createService();
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			connectionRepository.create.mockImplementation((entity) => entity as never);
			const uniqueErr = new QueryFailedError(
				'insert',
				[],
				new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: connection.serverSlug'),
			);
			(uniqueErr as unknown as { driverError: { code: string } }).driverError = {
				code: 'SQLITE_CONSTRAINT',
			};
			connectionRepository.save.mockRejectedValue(uniqueErr);

			await expect(
				service.createConnection(user, { serverSlug: 'linear', credentialId: 'cred-1' }),
			).rejects.toBeInstanceOf(ConflictError);
		});
	});

	describe('updateConnection', () => {
		it('updates toolFilter to null when inclusionMode is all', async () => {
			const { service, connectionRepository } = createService();
			const row = {
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
				toolFilter: { mode: 'allow', tools: ['search'] },
			} as InstanceAiMcpRegistryConnection;
			connectionRepository.findOneBy.mockResolvedValue(row);
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			const result = await service.updateConnection(user, 'conn-1', { inclusionMode: 'all' });

			expect(result.toolFilter).toBeNull();
			expect(connectionRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ toolFilter: null }),
			);
		});

		it('maps selected mode to allow filter and normalizes tools', async () => {
			const { service, connectionRepository } = createService();
			const row = {
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
				toolFilter: null,
			} as InstanceAiMcpRegistryConnection;
			connectionRepository.findOneBy.mockResolvedValue(row);
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			const result = await service.updateConnection(user, 'conn-1', {
				inclusionMode: 'selected',
				selectedTools: ['search', '', 'search', 'create'],
			});

			expect(result.toolFilter).toEqual({ mode: 'allow', tools: ['search', 'create'] });
		});

		it('maps except mode to exclude filter', async () => {
			const { service, connectionRepository } = createService();
			const row = {
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
				toolFilter: null,
			} as InstanceAiMcpRegistryConnection;
			connectionRepository.findOneBy.mockResolvedValue(row);
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			const result = await service.updateConnection(user, 'conn-1', {
				inclusionMode: 'except',
				excludedTools: ['delete', 'update'],
			});

			expect(result.toolFilter).toEqual({ mode: 'exclude', tools: ['delete', 'update'] });
		});

		it('keeps the existing filter when inclusionMode is omitted', async () => {
			const { service, connectionRepository } = createService();
			const row = {
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
				toolFilter: { mode: 'exclude', tools: ['delete'] },
			} as InstanceAiMcpRegistryConnection;
			connectionRepository.findOneBy.mockResolvedValue(row);
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			const result = await service.updateConnection(user, 'conn-1', {});

			expect(result.toolFilter).toEqual({ mode: 'exclude', tools: ['delete'] });
		});

		it('throws NotFoundError when the connection does not belong to the user', async () => {
			const { service, connectionRepository } = createService();
			connectionRepository.findOneBy.mockResolvedValue(null);

			await expect(service.updateConnection(user, 'missing', {})).rejects.toBeInstanceOf(
				NotFoundError,
			);
			expect(connectionRepository.save).not.toHaveBeenCalled();
		});

		it('swaps credential when credentialId is provided', async () => {
			const { service, connectionRepository, credentialsFinderService, mcpRegistryService } =
				createService();
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			connectionRepository.findOneBy.mockResolvedValue({
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
			} as InstanceAiMcpRegistryConnection);
			credentialsFinderService.findCredentialForUser.mockImplementation(async (id) => {
				if (id === 'cred-1') return credential;
				return {
					id: 'cred-2',
					name: 'MCP OAuth2 #2',
					type: 'mcpOAuth2Api',
				} as CredentialsEntity;
			});
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			const result = await service.updateConnection(user, 'conn-1', { credentialId: 'cred-2' });

			expect(result.credentialId).toBe('cred-2');
			expect(connectionRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ credentialId: 'cred-2' }),
			);
		});

		it('throws NotFoundError when the new credential is not found', async () => {
			const { service, connectionRepository, credentialsFinderService, mcpRegistryService } =
				createService();
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			connectionRepository.findOneBy.mockResolvedValue({
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
			} as InstanceAiMcpRegistryConnection);
			credentialsFinderService.findCredentialForUser.mockImplementation(async (id) => {
				if (id === 'cred-1') return credential;
				return null;
			});
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			await expect(
				service.updateConnection(user, 'conn-1', { credentialId: 'cred-2' }),
			).rejects.toBeInstanceOf(NotFoundError);
			expect(connectionRepository.save).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when the new credential type is not allowed', async () => {
			const { service, connectionRepository, credentialsFinderService, mcpRegistryService } =
				createService();
			mcpRegistryService.get.mockResolvedValue(makeRegistryServer('linear'));
			connectionRepository.findOneBy.mockResolvedValue({
				id: 'conn-1',
				userId: user.id,
				serverSlug: 'linear',
				credentialId: 'cred-1',
			} as InstanceAiMcpRegistryConnection);
			credentialsFinderService.findCredentialForUser.mockImplementation(async (id) => {
				if (id === 'cred-1') return credential;
				return {
					id: 'cred-2',
					name: 'MCP OAuth2 #2',
					type: 'notMcpOAuth2Api',
				} as CredentialsEntity;
			});
			connectionRepository.save.mockImplementation(async (entity) => entity as never);

			await expect(
				service.updateConnection(user, 'conn-1', { credentialId: 'cred-2' }),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(connectionRepository.save).not.toHaveBeenCalled();
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
