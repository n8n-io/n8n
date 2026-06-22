import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mock } from 'jest-mock-extended';

import type { AgentChatIntegrationContext } from '../agent-chat-integration';
import { LinearIntegration } from '../platforms/linear-integration';

jest.mock('../esm-loader', () => ({
	loadLinearAdapter: jest.fn(),
}));

import { loadLinearAdapter } from '../esm-loader';

const mockedLoadLinearAdapter = loadLinearAdapter as jest.MockedFunction<typeof loadLinearAdapter>;

describe('LinearIntegration', () => {
	const logger = mock<Logger>();
	let integration: LinearIntegration;
	let outboundHttp: jest.Mocked<OutboundHttp>;
	let requestMock: jest.Mock;
	const createLinearAdapter = jest.fn();

	beforeEach(() => {
		const httpClient = mock<HttpRequestClient>();
		requestMock = httpClient.request as jest.Mock;
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
		credentialId: 'credential-1',
		credential,
		webhookUrlFor: () => 'https://example.test/webhook',
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
		expect(outboundHttp.requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
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
