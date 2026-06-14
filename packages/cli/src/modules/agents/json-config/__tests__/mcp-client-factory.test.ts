import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonMcpServerConfig } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { OauthService } from '@/oauth/oauth.service';

import { buildMcpClientForServer, mapApprovalToSdk } from '../mcp-client-factory';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mcpClientCtor = jest.fn();
jest.mock('@n8n/agents', () => ({
	McpClient: jest.fn(function (configs: unknown) {
		mcpClientCtor(configs);
		return { configs, close: jest.fn() };
	}),
}));

const proxyFetchMock = jest.fn();
jest.mock('@n8n/ai-utilities', () => ({
	proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServer(overrides: Partial<AgentJsonMcpServerConfig> = {}): AgentJsonMcpServerConfig {
	return {
		name: 'srv',
		url: 'https://example.test/mcp',
		transport: 'streamableHttp',
		authentication: 'none',
		...overrides,
	} as AgentJsonMcpServerConfig;
}

function makeOk(): Response {
	return new Response('ok', { status: 200 });
}

function make401(): Response {
	return new Response('unauthorized', { status: 401 });
}

// ---------------------------------------------------------------------------
// mapApprovalToSdk
// ---------------------------------------------------------------------------

describe('mapApprovalToSdk', () => {
	it('returns undefined when approval is absent', () => {
		expect(mapApprovalToSdk(undefined)).toBeUndefined();
	});

	it('maps mode "global" to literal true (all tools require approval)', () => {
		expect(mapApprovalToSdk({ mode: 'global' })).toBe(true);
	});

	it('maps mode "selected" to the literal tools list', () => {
		expect(mapApprovalToSdk({ mode: 'selected', tools: ['a', 'b'] })).toEqual(['a', 'b']);
	});
});

// ---------------------------------------------------------------------------
// buildMcpClientForServer — header derivation per auth type
// ---------------------------------------------------------------------------

describe('buildMcpClientForServer — header derivation', () => {
	beforeEach(() => {
		mcpClientCtor.mockReset();
		proxyFetchMock.mockReset();
		proxyFetchMock.mockResolvedValue(makeOk());
	});

	async function captureInitialHeaders(server: AgentJsonMcpServerConfig, resolved: unknown) {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue(resolved as never);
		const oauthService = mock<OauthService>();

		await buildMcpClientForServer(server, {
			credentialProvider,
			oauthService,
			projectId: 'proj-1',
		});

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<{ fetch: typeof fetch }>];
		const fetchFn = configs[0].fetch;
		await fetchFn('https://example.test/mcp');
		const [, init] = proxyFetchMock.mock.calls[0] as [unknown, RequestInit];
		return (init.headers ?? {}) as Record<string, string>;
	}

	it('sends no auth headers for authentication: "none"', async () => {
		const headers = await captureInitialHeaders(makeServer({ authentication: 'none' }), null);
		expect(headers.Authorization).toBeUndefined();
	});

	it('sends a Bearer header for bearerAuth', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'bearerAuth', credential: 'cred-1' }),
			{ token: 'tok123' },
		);
		expect(headers.Authorization).toBe('Bearer tok123');
	});

	it('sends the configured name/value pair for headerAuth', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'headerAuth', credential: 'cred-1' }),
			{ name: 'X-Api-Key', value: 'secret' },
		);
		expect(headers['X-Api-Key']).toBe('secret');
	});

	it('flattens the values array for multipleHeadersAuth', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'multipleHeadersAuth', credential: 'cred-1' }),
			{
				headers: {
					values: [
						{ name: 'X-One', value: 'one' },
						{ name: 'X-Two', value: 'two' },
					],
				},
			},
		);
		expect(headers['X-One']).toBe('one');
		expect(headers['X-Two']).toBe('two');
	});

	it('uses oauthTokenData.access_token for mcpOAuth2Api', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'mcpOAuth2Api', credential: 'cred-1' }),
			{ oauthTokenData: { access_token: 'oauth-token' } },
		);
		expect(headers.Authorization).toBe('Bearer oauth-token');
	});
});

// ---------------------------------------------------------------------------
// buildMcpClientForServer — OAuth2 refresh path
// ---------------------------------------------------------------------------

describe('buildMcpClientForServer — OAuth2 refresh on 401', () => {
	beforeEach(() => {
		mcpClientCtor.mockReset();
		proxyFetchMock.mockReset();
	});

	it('invokes oauthService.refreshOAuth2CredentialById once on 401 and retries with the refreshed header', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401()).mockResolvedValueOnce(makeOk());

		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({
			oauthTokenData: { access_token: 'stale-token' },
		} as never);

		const oauthService = mock<OauthService>();
		oauthService.refreshOAuth2CredentialById.mockResolvedValue({
			Authorization: 'Bearer fresh-token',
		});

		await buildMcpClientForServer(
			makeServer({ authentication: 'mcpOAuth2Api', credential: 'cred-1' }),
			{ credentialProvider, oauthService, projectId: 'proj-1' },
		);

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<{ fetch: typeof fetch }>];
		const fetchFn = configs[0].fetch;
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith('cred-1', 'proj-1');
		// First call uses the stale header, second uses the refreshed one.
		const [, firstInit] = proxyFetchMock.mock.calls[0] as [unknown, RequestInit];
		const [, secondInit] = proxyFetchMock.mock.calls[1] as [unknown, RequestInit];
		expect((firstInit.headers as Record<string, string>).Authorization).toBe('Bearer stale-token');
		expect((secondInit.headers as Record<string, string>).Authorization).toBe('Bearer fresh-token');
	});

	it('does NOT call refreshOAuth2CredentialById for non-OAuth2 auth schemes', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401());

		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({ token: 'static' } as never);

		const oauthService = mock<OauthService>();

		await buildMcpClientForServer(
			makeServer({ authentication: 'bearerAuth', credential: 'cred-1' }),
			{ credentialProvider, oauthService, projectId: 'proj-1' },
		);

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<{ fetch: typeof fetch }>];
		await configs[0].fetch('https://example.test/mcp');

		expect(oauthService.refreshOAuth2CredentialById).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// buildMcpClientForServer — SDK config mapping
// ---------------------------------------------------------------------------

describe('buildMcpClientForServer — SDK config mapping', () => {
	beforeEach(() => {
		mcpClientCtor.mockReset();
		proxyFetchMock.mockReset();
	});

	it('forwards toolFilter, approval, transport, and connectionTimeoutMs to the SDK config', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const oauthService = mock<OauthService>();

		await buildMcpClientForServer(
			makeServer({
				transport: 'sse',
				toolFilter: { mode: 'allow', tools: ['echo'] },
				approval: { mode: 'selected', tools: ['create'] },
				connectionTimeoutMs: 5_000,
			}),
			{ credentialProvider, oauthService, projectId: 'proj-1' },
		);

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<Record<string, unknown>>];
		expect(configs).toHaveLength(1);
		expect(configs[0]).toMatchObject({
			name: 'srv',
			url: 'https://example.test/mcp',
			transport: 'sse',
			toolFilter: { mode: 'allow', tools: ['echo'] },
			requireApproval: ['create'],
			connectionTimeoutMs: 5_000,
		});
		expect(typeof configs[0].fetch).toBe('function');
	});

	it('omits connectionTimeoutMs from the SDK config when not provided', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const oauthService = mock<OauthService>();

		await buildMcpClientForServer(makeServer(), {
			credentialProvider,
			oauthService,
			projectId: 'proj-1',
		});

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<Record<string, unknown>>];
		expect(configs[0]).not.toHaveProperty('connectionTimeoutMs');
	});
});

// ---------------------------------------------------------------------------
// buildMcpClientForServer — auth header edge cases
// ---------------------------------------------------------------------------

describe('buildMcpClientForServer — auth header edge cases', () => {
	beforeEach(() => {
		mcpClientCtor.mockReset();
		proxyFetchMock.mockReset();
		proxyFetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
	});

	async function captureInitialHeaders(server: AgentJsonMcpServerConfig, resolved: unknown) {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue(resolved as never);
		const oauthService = mock<OauthService>();

		await buildMcpClientForServer(server, {
			credentialProvider,
			oauthService,
			projectId: 'proj-1',
		});

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<{ fetch: typeof fetch }>];
		await configs[0].fetch('https://example.test/mcp');
		const [, init] = proxyFetchMock.mock.calls[0] as [unknown, RequestInit];
		return (init.headers ?? {}) as Record<string, string>;
	}

	it('sends no Authorization header for bearerAuth when the resolved token is an empty string', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'bearerAuth', credential: 'cred-1' }),
			{ token: '' },
		);
		expect(headers.Authorization).toBeUndefined();
	});

	it('sends no header for headerAuth when the name is missing from the resolved credential', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'headerAuth', credential: 'cred-1' }),
			{ name: '', value: 'secret' },
		);
		expect(Object.keys(headers)).not.toContain('');
		expect(headers.Authorization).toBeUndefined();
	});

	it('skips entries with non-string values in multipleHeadersAuth', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'multipleHeadersAuth', credential: 'cred-1' }),
			{
				headers: {
					values: [
						{ name: 'X-Valid', value: 'yes' },
						{ name: 42, value: 'ignored' },
						{ name: 'X-Also-Ignored', value: null },
					],
				},
			},
		);
		expect(headers['X-Valid']).toBe('yes');
		expect(Object.keys(headers)).not.toContain('42');
		expect(headers['X-Also-Ignored']).toBeUndefined();
	});

	it('sends no headers for multipleHeadersAuth when the values array is absent', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'multipleHeadersAuth', credential: 'cred-1' }),
			{ headers: { values: undefined } },
		);
		expect(headers).toEqual({});
	});

	it('uses the OAuth2 path for service-specific McpOAuth2Api variants (e.g. notionMcpOAuth2Api)', async () => {
		const headers = await captureInitialHeaders(
			makeServer({ authentication: 'notionMcpOAuth2Api' as never, credential: 'cred-1' }),
			{ oauthTokenData: { access_token: 'notion-oauth-token' } },
		);
		expect(headers.Authorization).toBe('Bearer notion-oauth-token');
	});
});

// ---------------------------------------------------------------------------
// buildMcpClientForServer — OAuth2 variant wires refresh handler
// ---------------------------------------------------------------------------

describe('buildMcpClientForServer — service-specific McpOAuth2Api refresh', () => {
	beforeEach(() => {
		mcpClientCtor.mockReset();
		proxyFetchMock.mockReset();
	});

	it('wires the onUnauthorized refresh handler for non-canonical McpOAuth2Api variants', async () => {
		proxyFetchMock
			.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
			.mockResolvedValueOnce(new Response('ok', { status: 200 }));

		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({
			oauthTokenData: { access_token: 'stale' },
		} as never);

		const oauthService = mock<OauthService>();
		oauthService.refreshOAuth2CredentialById.mockResolvedValue({
			Authorization: 'Bearer fresh',
		});

		await buildMcpClientForServer(
			makeServer({ authentication: 'notionMcpOAuth2Api' as never, credential: 'cred-1' }),
			{ credentialProvider, oauthService, projectId: 'proj-1' },
		);

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<{ fetch: typeof fetch }>];
		const res = await configs[0].fetch('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith('cred-1', 'proj-1');
	});

	it('does NOT wire an onUnauthorized handler when credential is absent for mcpOAuth2Api', async () => {
		proxyFetchMock.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));

		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({} as never);

		const oauthService = mock<OauthService>();

		// credential field intentionally absent
		await buildMcpClientForServer(makeServer({ authentication: 'mcpOAuth2Api' }), {
			credentialProvider,
			oauthService,
			projectId: 'proj-1',
		});

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<{ fetch: typeof fetch }>];
		await configs[0].fetch('https://example.test/mcp');

		// No refresh should have been attempted
		expect(oauthService.refreshOAuth2CredentialById).not.toHaveBeenCalled();
	});
});
