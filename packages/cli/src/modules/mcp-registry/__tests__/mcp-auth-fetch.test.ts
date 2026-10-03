import type { CustomFetch } from '@n8n/backend-network';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { OauthService } from '@/oauth/oauth.service';

import { createMcpAuthFetch, resolveMcpAuthDomainPolicy } from '../mcp-auth-fetch';

const baseFetchMock = vi.fn();
const baseFetch = ((...args: unknown[]) => baseFetchMock(...args)) as unknown as CustomFetch;

describe('resolveMcpAuthDomainPolicy', () => {
	it('limits native OAuth credentials with no explicit policy to the MCP host', () => {
		expect(
			resolveMcpAuthDomainPolicy(
				'githubOAuth2Api',
				{ oauthTokenData: { access_token: 'secret' } },
				'mcp.github.test',
			),
		).toEqual({ mode: 'domains', domains: 'mcp.github.test' });
	});

	it.each([
		['none', { mode: 'none' }],
		['domains', { mode: 'domains', domains: 'api.github.test' }],
		['all', undefined],
	] as const)('honors the native OAuth %s domain policy', (policy, expected) => {
		expect(
			resolveMcpAuthDomainPolicy(
				'githubOAuth2Api',
				{
					allowedHttpRequestDomains: policy,
					allowedDomains: 'api.github.test',
				},
				'mcp.github.test',
			),
		).toEqual(expected);
	});

	it('uses the generic credential domain policy for MCP OAuth credentials', () => {
		expect(
			resolveMcpAuthDomainPolicy(
				'mcpOAuth2Api',
				{
					allowedHttpRequestDomains: 'domains',
					allowedDomains: 'oauth.example.test',
				},
				'mcp.example.test',
			),
		).toEqual({ mode: 'domains', domains: 'oauth.example.test' });
	});
});

describe('createMcpAuthFetch', () => {
	const oauthService = mock<OauthService>();

	beforeEach(() => {
		vi.clearAllMocks();
		baseFetchMock.mockReset();
	});

	it('refreshes an expired OAuth token before the first request', async () => {
		baseFetchMock.mockResolvedValue(new Response('ok'));
		oauthService.refreshOAuth2CredentialById.mockResolvedValue({
			headers: { Authorization: 'Bearer fresh-token' },
		});
		const fetch = createMcpAuthFetch({
			authentication: 'githubOAuth2Api',
			baseFetch,
			credentialData: {
				grantType: 'authorizationCode',
				oauthTokenData: {
					access_token: 'stale-token',
					refresh_token: 'refresh-token',
					n8n_expires_at: '1',
				},
			},
			credentialId: 'credential-1',
			initialHeaders: { Authorization: 'Bearer stale-token' },
			oauthService,
			projectId: 'project-1',
		});

		await fetch('https://mcp.github.test');

		expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith(
			'credential-1',
			'project-1',
			expect.objectContaining({ accessToken: 'stale-token' }),
		);
		expect(new Headers(baseFetchMock.mock.calls[0][1].headers).get('authorization')).toBe(
			'Bearer fresh-token',
		);
	});

	it('does not refresh OAuth without both a credential and project', async () => {
		baseFetchMock.mockResolvedValue(new Response('unauthorized', { status: 401 }));
		const fetch = createMcpAuthFetch({
			authentication: 'githubOAuth2Api',
			baseFetch,
			credentialData: { oauthTokenData: { access_token: 'stale-token' } },
			initialHeaders: { Authorization: 'Bearer stale-token' },
			oauthService,
			projectId: null,
		});

		await expect(fetch('https://mcp.github.test')).resolves.toHaveProperty('status', 401);
		expect(oauthService.refreshOAuth2CredentialById).not.toHaveBeenCalled();
		expect(baseFetchMock).toHaveBeenCalledOnce();
	});

	it('enforces the supplied discovery domain policy before sending credentials', async () => {
		const fetch = createMcpAuthFetch({
			authentication: 'headerAuth',
			allowedDomains: { mode: 'domains', domains: 'mcp.example.test' },
			baseFetch,
			credentialData: {},
			initialHeaders: { Authorization: 'Bearer secret' },
			oauthService,
			projectId: 'project-1',
		});

		await expect(fetch('https://other.example.test/mcp')).rejects.toBeInstanceOf(UserError);
		expect(baseFetchMock).not.toHaveBeenCalled();
	});
});
