import type { Logger } from '@n8n/backend-common';
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
	let fetchSpy: jest.SpyInstance;
	const createLinearAdapter = jest.fn();

	beforeEach(() => {
		integration = new LinearIntegration(logger);
		createLinearAdapter.mockReset();
		createLinearAdapter.mockReturnValue({ marker: 'adapter' });
		mockedLoadLinearAdapter.mockReset();
		mockedLoadLinearAdapter.mockResolvedValue({
			createLinearAdapter,
		} as unknown as Awaited<ReturnType<typeof loadLinearAdapter>>);

		fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ data: { viewer: { displayName: 'AgentName' } } }),
		} as Response);
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	const ctx = (credential: Record<string, unknown>): AgentChatIntegrationContext => ({
		agentId: 'agent-1',
		projectId: 'project-1',
		credentialId: 'credential-1',
		credential,
		webhookUrlFor: () => 'https://example.test/webhook',
	});

	it('builds the adapter with an apiKey from a linearApi credential', async () => {
		await integration.createAdapter(ctx({ apiKey: 'lin_api_xyz', signingSecret: 'sec' }));

		expect(createLinearAdapter).toHaveBeenCalledWith({
			apiKey: 'lin_api_xyz',
			webhookSecret: 'sec',
			userName: 'AgentName',
		});
		expect(fetchSpy.mock.calls[0][1]).toMatchObject({
			headers: { Authorization: 'lin_api_xyz' },
		});
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
		expect(fetchSpy.mock.calls[0][1]).toMatchObject({
			headers: { Authorization: 'Bearer oauth_token' },
		});
	});

	it('omits userName when the viewer lookup fails', async () => {
		fetchSpy.mockResolvedValue({ ok: false } as Response);

		await integration.createAdapter(ctx({ apiKey: 'lin_api_xyz', signingSecret: 'sec' }));

		expect(createLinearAdapter).toHaveBeenCalledWith({
			apiKey: 'lin_api_xyz',
			webhookSecret: 'sec',
		});
	});

	it('throws when the credential has no token', async () => {
		await expect(integration.createAdapter(ctx({ signingSecret: 'sec' }))).rejects.toThrow(
			/Could not extract an API token/,
		);
	});

	it('throws when the credential has no signing secret', async () => {
		await expect(integration.createAdapter(ctx({ apiKey: 'lin_api_xyz' }))).rejects.toThrow(
			/missing a signing secret/,
		);
	});
});
