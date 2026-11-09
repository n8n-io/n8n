import type { Mock, Mocked, MockedFunction } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import type { AgentChatIntegrationContext, EpisodicScopeContext } from '../agent-chat-integration';
import { LinearIntegration } from '../platforms/linear/linear-integration';

vi.mock('../esm-loader', () => ({
	loadLinearAdapter: vi.fn(),
}));

import { loadLinearAdapter } from '../esm-loader';

const mockedLoadLinearAdapter = loadLinearAdapter as MockedFunction<typeof loadLinearAdapter>;

describe('LinearIntegration', () => {
	const logger = mock<Logger>();
	let integration: LinearIntegration;
	let outboundHttp: Mocked<OutboundHttp>;
	let requestMock: Mock;
	const createLinearAdapter = vi.fn();

	beforeEach(() => {
		const httpClient = mock<HttpRequestClient>();
		requestMock = httpClient.request as Mock;
		outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(httpClient);
		integration = new LinearIntegration(logger, outboundHttp);
		createLinearAdapter.mockReset();
		createLinearAdapter.mockReturnValue({ marker: 'adapter' });
		mockedLoadLinearAdapter.mockReset();
		mockedLoadLinearAdapter.mockResolvedValue({
			createLinearAdapter,
		} as unknown as Awaited<ReturnType<typeof loadLinearAdapter>>);

		requestMock.mockResolvedValue({
			statusCode: 200,
			body: { data: { viewer: { displayName: 'AgentName' } } },
		});
	});

	const ctx = (credential: Record<string, unknown>): AgentChatIntegrationContext => ({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'linear', credentialId: 'credential-1' },
		credentialId: 'credential-1',
		credential,
		ingressEnabled: true,
		webhookUrlFor: () => 'https://example.test/webhook',
	});

	describe('episodic ownership', () => {
		const origin = { type: 'linear', issueId: 'issue-1', teamId: 'team-1' } as const;

		function context(overrides: Partial<EpisodicScopeContext> = {}): EpisodicScopeContext {
			return {
				agentId: 'agent-1',
				credentialId: 'cred-1',
				integrationType: 'linear',
				threadId: 'linear:issue-1',
				author: { id: 'U1', name: 'Alice' },
				origin,
				...overrides,
			};
		}

		it('reads and writes only the team owner', () => {
			expect(integration.resolveEpisodicScope(context())).toEqual({
				writeScopeId: 'linear:agent-1:cred-1:team-1',
				readScopeIds: ['linear:agent-1:cred-1:team-1'],
			});
		});

		it('keeps team ownership across issues, authors, projects and names', () => {
			const next = context({
				threadId: 'linear:issue-2:c:comment-1',
				author: { id: 'U2', name: 'Bob' },
				origin: {
					...origin,
					issueId: 'issue-2',
					identifier: 'ENG-2',
					title: 'Renamed',
					projectId: 'project-2',
					teamName: 'Renamed team',
				},
			});
			expect(integration.resolveEpisodicScope(next)).toEqual(
				integration.resolveEpisodicScope(context()),
			);
		});

		it.each([
			{ overrides: { agentId: 'agent-2' }, scopeId: 'linear:agent-2:cred-1:team-1' },
			{ overrides: { credentialId: 'cred-2' }, scopeId: 'linear:agent-1:cred-2:team-1' },
			{
				overrides: { origin: { ...origin, teamId: 'team-2' } },
				scopeId: 'linear:agent-1:cred-1:team-2',
			},
		] satisfies Array<{ overrides: Partial<EpisodicScopeContext>; scopeId: string }>)(
			'separates scopes for %j',
			({ overrides, scopeId }) => {
				const scope = integration.resolveEpisodicScope(context(overrides));

				expect(scope).toEqual({ writeScopeId: scopeId, readScopeIds: [scopeId] });
				expect(scope).not.toEqual(integration.resolveEpisodicScope(context()));
			},
		);

		it.each([
			{ agentId: '' },
			{ credentialId: '' },
			{ integrationType: 'slack' },
			{ origin: undefined },
			{ origin: { type: 'linear', issueId: 'issue-1' } },
			{ origin: { ...origin, teamId: '' } },
			{ origin: { type: 'discord', channelId: 'C1' } },
		] satisfies Partial<EpisodicScopeContext>[])(
			'disables memory for unresolved identity %j',
			(overrides) => {
				expect(integration.resolveEpisodicScope(context(overrides))).toBeNull();
			},
		);

		it('encodes scope components without delimiter collisions', () => {
			expect(
				integration.resolveEpisodicScope(
					context({ agentId: 'agent:1', origin: { ...origin, teamId: 'team:1' } }),
				),
			).toEqual({
				writeScopeId: 'linear:agent%3A1:cred-1:team%3A1',
				readScopeIds: ['linear:agent%3A1:cred-1:team%3A1'],
			});
		});
	});

	it('only advertises the Linear OAuth credential type to agents', () => {
		expect(integration.credentialTypes).toEqual(['linearOAuth2Api']);
	});

	it('advertises Linear issue, user, and workspace context queries', () => {
		expect(integration.contextQueries).toEqual([
			'get_current_message_context',
			'get_current_subject',
			'get_current_user',
			'get_user',
			'search_users',
			'get_team',
			'search_teams',
			'get_project',
			'search_projects',
			'search_labels',
			'search_issue_states',
			'get_issue',
			'search_issues',
		]);
	});

	it('advertises Linear issue and comment actions', () => {
		expect(integration.actions).toEqual([
			'respond',
			'create_issue',
			'update_issue',
			'create_comment',
		]);
	});

	it('rejects Linear API token credentials', async () => {
		await expect(
			integration.createAdapter(ctx({ apiKey: 'lin_api_xyz', signingSecret: 'sec' })),
		).rejects.toThrow(/OAuth access token/);
	});

	it('builds the adapter with an accessToken from a linearOAuth2Api credential', async () => {
		await integration.createAdapter(
			ctx({
				oauthTokenData: { access_token: 'oauth_token' },
				signingSecret: 'sec',
			}),
		);

		expect(createLinearAdapter).toHaveBeenCalledWith({
			accessToken: 'oauth_token',
			webhookSecret: 'sec',
			userName: 'AgentName',
		});
		expect(outboundHttp.requests).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'unsafe' });
		expect(requestMock.mock.calls[0][0]).toMatchObject({
			url: 'https://api.linear.app/graphql',
			headers: { Authorization: 'Bearer oauth_token' },
		});
	});

	it('uses agent sessions mode for Linear app actor credentials', async () => {
		await integration.createAdapter(
			ctx({
				actor: 'app',
				oauthTokenData: { access_token: 'oauth_token' },
				signingSecret: 'sec',
			}),
		);

		expect(createLinearAdapter).toHaveBeenCalledWith({
			accessToken: 'oauth_token',
			webhookSecret: 'sec',
			userName: 'AgentName',
			mode: 'agent-sessions',
		});
	});

	it('omits userName when the viewer lookup fails', async () => {
		requestMock.mockResolvedValue({ statusCode: 401, body: {} });

		await integration.createAdapter(
			ctx({
				oauthTokenData: { access_token: 'oauth_token' },
				signingSecret: 'sec',
			}),
		);

		expect(createLinearAdapter).toHaveBeenCalledWith({
			accessToken: 'oauth_token',
			webhookSecret: 'sec',
		});
	});

	it('throws when the credential has no token', async () => {
		await expect(integration.createAdapter(ctx({ signingSecret: 'sec' }))).rejects.toThrow(
			/Could not extract an OAuth access token/,
		);
	});

	it('throws when the credential has no signing secret', async () => {
		await expect(
			integration.createAdapter(ctx({ oauthTokenData: { access_token: 'oauth_token' } })),
		).rejects.toThrow(/missing a signing secret/);
	});
});
