import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonMcpServerConfig } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { OauthService } from '@/oauth/oauth.service';

import { buildMcpClientForServer, createAuthFetch, mapApprovalToSdk } from '../mcp-client-factory';

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
// createAuthFetch
// ---------------------------------------------------------------------------

describe('createAuthFetch', () => {
	beforeEach(() => {
		proxyFetchMock.mockReset();
	});

	it('routes through proxyFetch and injects the initial headers', async () => {
		proxyFetchMock.mockResolvedValueOnce(makeOk());

		const fetchFn = createAuthFetch({ initialHeaders: { Authorization: 'Bearer A' } });
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(proxyFetchMock).toHaveBeenCalledTimes(1);
		const [, init] = proxyFetchMock.mock.calls[0] as [unknown, RequestInit];
		expect(init.headers).toMatchObject({ Authorization: 'Bearer A' });
	});

	it('returns 401 unchanged when no onUnauthorized handler is configured', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401());

		const fetchFn = createAuthFetch({ initialHeaders: { Authorization: 'Bearer A' } });
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(401);
		expect(proxyFetchMock).toHaveBeenCalledTimes(1);
	});

	it('returns the original 401 when onUnauthorized returns null', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401());

		const onUnauthorized = jest.fn().mockResolvedValue(null);
		const fetchFn = createAuthFetch({
			initialHeaders: { Authorization: 'Bearer A' },
			onUnauthorized,
		});
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(401);
		expect(onUnauthorized).toHaveBeenCalledTimes(1);
		expect(proxyFetchMock).toHaveBeenCalledTimes(1);
	});

	it('retries once with refreshed headers when onUnauthorized returns new headers', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401()).mockResolvedValueOnce(makeOk());

		const onUnauthorized = jest.fn().mockResolvedValue({ Authorization: 'Bearer B' });
		const fetchFn = createAuthFetch({
			initialHeaders: { Authorization: 'Bearer A' },
			onUnauthorized,
		});
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(proxyFetchMock).toHaveBeenCalledTimes(2);
		const [, init2] = proxyFetchMock.mock.calls[1] as [unknown, RequestInit];
		expect(init2.headers).toMatchObject({ Authorization: 'Bearer B' });
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

		await buildMcpClientForServer(server, { credentialProvider, oauthService });

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
			{ credentialProvider, oauthService },
		);

		const [configs] = mcpClientCtor.mock.calls[0] as [Array<{ fetch: typeof fetch }>];
		const fetchFn = configs[0].fetch;
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith('cred-1');
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
			{ credentialProvider, oauthService },
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
			{ credentialProvider, oauthService },
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
});
