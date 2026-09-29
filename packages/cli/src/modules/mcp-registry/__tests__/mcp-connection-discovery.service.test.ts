import type { BuiltTool } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import type { ICredentialType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsHelper } from '@/credentials-helper';
import type { OauthService } from '@/oauth/oauth.service';

import { McpConnectionDiscoveryService } from '../mcp-connection-discovery.service';
import type { McpRegistryService } from '../registry/mcp-registry.service';
import type { McpRegistryServer } from '../registry/mcp-registry.types';

const {
	mcpClientCloseMock,
	mcpClientConfigs,
	mcpClientGetConnectionFailuresMock,
	mcpClientListToolsMock,
} = vi.hoisted(() => ({
	mcpClientCloseMock: vi.fn<() => Promise<void>>(),
	mcpClientConfigs: [] as Array<
		Array<{ name: string; fetch: CustomFetch; url: string; transport: string }>
	>,
	mcpClientGetConnectionFailuresMock: vi.fn(),
	mcpClientListToolsMock: vi.fn<() => Promise<BuiltTool[]>>(),
}));

vi.mock('@n8n/agents', () => ({
	McpClient: vi.fn(function (
		configs: Array<{ name: string; fetch: CustomFetch; url: string; transport: string }>,
	) {
		mcpClientConfigs.push(configs);
		return {
			close: mcpClientCloseMock,
			getConnectionFailures: mcpClientGetConnectionFailuresMock,
			listTools: mcpClientListToolsMock,
		};
	}),
}));

const proxyFetchMock = vi.hoisted(() => vi.fn());
const proxyFetch = ((...args: unknown[]) => proxyFetchMock(...args)) as unknown as CustomFetch;
const getBaseMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiMcpFetch: () => proxyFetch,
}));

vi.mock('@/workflow-execute-additional-data.js', () => ({
	getBase: getBaseMock,
}));

function makeServer(overrides: Partial<McpRegistryServer> = {}): McpRegistryServer {
	return {
		name: 'com.test/github',
		slug: 'git hub',
		title: 'GitHub',
		description: 'Manage repositories',
		tagline: 'GitHub tools',
		version: '1.0.0',
		updatedAt: '2026-09-25T00:00:00.000Z',
		icons: [],
		authType: 'usesCredentials',
		usesCredentials: [{ credentialType: 'githubOAuth2Api', name: 'OAuth2', value: 'oAuth2' }],
		remotes: [{ type: 'streamable-http', url: 'https://mcp.github.test/mcp' }],
		tools: [
			{ name: 'search_repositories', annotations: { readOnlyHint: true } },
			{ name: 'remove_repository', annotations: { destructiveHint: true } },
		],
		isOfficial: true,
		origin: 'registry',
		status: 'active',
		...overrides,
	} as McpRegistryServer;
}

describe('McpConnectionDiscoveryService', () => {
	const user = { id: 'user-1' } as User;
	const credential = {
		id: 'credential-1',
		name: 'GitHub OAuth2',
		type: 'githubOAuth2Api',
		shared: [{ role: 'credential:owner', projectId: 'project-1' }],
	} as CredentialsEntity;

	function createService() {
		const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
		const registryService = mock<McpRegistryService>();
		const credentialsFinderService = mock<CredentialsFinderService>();
		const credentialsHelper = mock<CredentialsHelper>();
		const credentialTypes = mock<CredentialTypes>();
		const oauthService = mock<OauthService>();
		const outboundHttp = mock<OutboundHttp>();
		const service = new McpConnectionDiscoveryService(
			logger,
			registryService,
			credentialsFinderService,
			credentialsHelper,
			credentialTypes,
			oauthService,
			outboundHttp,
		);

		registryService.get.mockResolvedValue(makeServer());
		credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
		credentialsHelper.getDecrypted.mockResolvedValue({
			oauthTokenData: { access_token: 'token' },
		});
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockReturnValue(
			mock<ICredentialType>({
				name: 'githubOAuth2Api',
				displayName: 'GitHub OAuth2',
				properties: [],
				authenticate: undefined,
				preAuthentication: undefined,
			}),
		);
		credentialTypes.getParentTypes.mockReturnValue(['oAuth2Api']);

		return { service, registryService, credentialsFinderService, credentialsHelper };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mcpClientConfigs.length = 0;
		mcpClientCloseMock.mockResolvedValue();
		mcpClientGetConnectionFailuresMock.mockReturnValue([]);
	});

	it('returns the discovered connection and classifies tools from live annotations', async () => {
		mcpClientListToolsMock.mockResolvedValue([
			{
				name: 'git_hub_search_repositories',
				description: 'Search repositories',
				mcpAnnotations: { readOnlyHint: true },
			} as BuiltTool,
			{
				name: 'ignored-prefix',
				mcpToolName: 'remove_repository',
				mcpAnnotations: { destructiveHint: true },
			} as BuiltTool,
		]);
		const { service } = createService();

		await expect(
			service.discover(user, { slug: 'git hub', credentialId: 'credential-1' }),
		).resolves.toEqual({
			status: 'connected',
			connection: {
				url: 'https://mcp.github.test/mcp',
				transport: 'streamableHttp',
				authentication: 'githubOAuth2Api',
				credentialId: 'credential-1',
				metadata: { nodeTypeName: '@n8n/mcp-registry.gitHub' },
			},
			tools: [
				{
					name: 'search_repositories',
					description: 'Search repositories',
					category: 'read',
				},
				{ name: 'remove_repository', category: 'write' },
			],
		});
		expect(mcpClientConfigs[0]?.[0]).toMatchObject({
			name: 'git_hub',
			url: 'https://mcp.github.test/mcp',
			transport: 'streamableHttp',
			connectionTimeoutMs: 10_000,
		});
		expect(mcpClientCloseMock).toHaveBeenCalledOnce();
	});

	it('ignores registry annotations when live annotations are absent', async () => {
		mcpClientListToolsMock.mockResolvedValue([
			{ name: 'git_hub_custom_widget' } as BuiltTool,
			{ name: 'git_hub_delete_repository' } as BuiltTool,
		]);
		const { service, registryService } = createService();
		registryService.get.mockResolvedValue(
			makeServer({
				tools: [
					{ name: 'custom_widget', annotations: { readOnlyHint: true } },
					{ name: 'delete_repository', annotations: { readOnlyHint: true } },
				],
			}),
		);

		const response = await service.discover(user, {
			slug: 'git hub',
			credentialId: 'credential-1',
		});

		expect(response.tools).toEqual([
			{ name: 'custom_widget', category: 'write' },
			{ name: 'delete_repository', category: 'write' },
		]);
	});

	it('resolves credential data through the credentials helper with project and user context', async () => {
		mcpClientListToolsMock.mockResolvedValue([]);
		const additionalData = { currentNodeExecutionIndex: 0 };
		getBaseMock.mockResolvedValueOnce(additionalData);
		const { service, credentialsHelper } = createService();

		await service.discover(user, { slug: 'git hub', credentialId: 'credential-1' });

		expect(getBaseMock).toHaveBeenCalledWith({
			projectId: 'project-1',
			userId: 'user-1',
		});
		expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
			additionalData,
			{ id: 'credential-1', name: 'GitHub OAuth2' },
			'githubOAuth2Api',
			'internal',
		);
	});

	it('classifies a failed authenticated request and closes the client', async () => {
		proxyFetchMock.mockResolvedValue(new Response('unauthorized', { status: 401 }));
		mcpClientListToolsMock.mockImplementation(async () => {
			await mcpClientConfigs[0]![0]!.fetch('https://mcp.github.test/mcp');
			return [];
		});
		mcpClientGetConnectionFailuresMock.mockReturnValue([{ server: 'git_hub' }]);
		const { service } = createService();

		await expect(
			service.discover(user, { slug: 'git hub', credentialId: 'credential-1' }),
		).resolves.toEqual({
			status: 'disconnected',
			failureReason: 'authentication',
			tools: [],
		});
		expect(mcpClientCloseMock).toHaveBeenCalledOnce();
	});

	it('reports transport failures as server unavailable', async () => {
		proxyFetchMock.mockRejectedValue(new Error('offline'));
		mcpClientListToolsMock.mockImplementation(async () => {
			await mcpClientConfigs[0]![0]!.fetch('https://mcp.github.test/mcp');
			return [];
		});
		const { service } = createService();

		await expect(
			service.discover(user, { slug: 'git hub', credentialId: 'credential-1' }),
		).resolves.toEqual({
			status: 'disconnected',
			failureReason: 'server_unavailable',
			tools: [],
		});
		expect(mcpClientCloseMock).toHaveBeenCalledOnce();
	});

	it('keeps an unclassified failure unknown after the server responds', async () => {
		proxyFetchMock.mockResolvedValue(new Response('ok'));
		mcpClientListToolsMock.mockImplementation(async () => {
			await mcpClientConfigs[0]![0]!.fetch('https://mcp.github.test/mcp');
			throw new Error('Invalid MCP response');
		});
		const { service } = createService();

		await expect(
			service.discover(user, { slug: 'git hub', credentialId: 'credential-1' }),
		).resolves.toEqual({
			status: 'disconnected',
			failureReason: 'unknown',
			tools: [],
		});
		expect(mcpClientCloseMock).toHaveBeenCalledOnce();
	});

	it('reports credential preparation failures as authentication failures', async () => {
		const { service, credentialsHelper } = createService();
		credentialsHelper.getDecrypted.mockRejectedValue(new Error('Credential resolution failed'));

		await expect(
			service.discover(user, { slug: 'git hub', credentialId: 'credential-1' }),
		).resolves.toEqual({
			status: 'disconnected',
			failureReason: 'authentication',
			tools: [],
		});
		expect(mcpClientListToolsMock).not.toHaveBeenCalled();
	});

	it('times out tool discovery and closes the client', async () => {
		vi.useFakeTimers();
		try {
			let notifyListToolsStarted: () => void = () => {};
			const listToolsStarted = new Promise<void>((resolve) => {
				notifyListToolsStarted = resolve;
			});
			mcpClientListToolsMock.mockImplementation(async () => {
				notifyListToolsStarted();
				return await new Promise<BuiltTool[]>(() => {});
			});
			const { service } = createService();

			const resultPromise = service.discover(user, {
				slug: 'git hub',
				credentialId: 'credential-1',
			});
			await listToolsStarted;
			await vi.advanceTimersByTimeAsync(10_000);

			await expect(resultPromise).resolves.toEqual({
				status: 'disconnected',
				failureReason: 'server_unavailable',
				tools: [],
			});
			expect(mcpClientCloseMock).toHaveBeenCalledOnce();
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not hide an inaccessible registry server as an authentication failure', async () => {
		const { service, registryService } = createService();
		registryService.get.mockResolvedValue(undefined);

		await expect(
			service.discover(user, { slug: 'missing', credentialId: 'credential-1' }),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(mcpClientListToolsMock).not.toHaveBeenCalled();
	});

	it('requires connect scope for resolvable credentials', async () => {
		const { service, credentialsFinderService } = createService();
		const resolvableCredential = mock<CredentialsEntity>({
			id: credential.id,
			name: credential.name,
			type: credential.type,
			shared: credential.shared,
			isResolvable: true,
		});
		credentialsFinderService.findCredentialForUser
			.mockResolvedValueOnce(resolvableCredential)
			.mockResolvedValueOnce(null);

		await expect(
			service.discover(user, { slug: 'git hub', credentialId: 'credential-1' }),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenNthCalledWith(
			2,
			'credential-1',
			user,
			['credential:connect'],
		);
	});
});
