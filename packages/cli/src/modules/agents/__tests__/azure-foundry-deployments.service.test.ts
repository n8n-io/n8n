import { AzureProjectNotFoundError } from '@n8n/ai-utilities/model-discovery';
import type {
	CustomFetch,
	HttpTransport,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { AzureFoundryDeploymentsService } from '../azure-foundry-deployments.service';

const listAzureOpenAiModels = vi.fn();
vi.mock('@n8n/ai-utilities/model-discovery', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities/model-discovery')>()),
	listAzureOpenAiModels: (...args: unknown[]) => listAzureOpenAiModels(...args) as unknown,
}));

const mintAzureFoundryDeploymentsToken = vi.fn();
vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	mintAzureFoundryDeploymentsToken: (...args: unknown[]) =>
		mintAzureFoundryDeploymentsToken(...args) as unknown,
}));

const foundryEndpoint = 'https://my-resource.services.ai.azure.com/openai/v1';

function makeService(ssrfEnabled = true) {
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	const ssrfProtectionService = mock<SsrfProtectionService>();
	const ssrfProtectionConfig = mock<SsrfProtectionConfig>({ enabled: ssrfEnabled });
	const service = new AzureFoundryDeploymentsService(
		outboundHttp,
		ssrfProtectionService,
		ssrfProtectionConfig,
	);
	return { service, ssrfProtectionService };
}

describe('AzureFoundryDeploymentsService', () => {
	beforeEach(() => {
		listAzureOpenAiModels.mockReset();
		listAzureOpenAiModels.mockResolvedValue([
			{ id: 'my-chat', name: 'my-chat (gpt-4.1)', modelFamily: 'openai' },
		]);
		mintAzureFoundryDeploymentsToken.mockReset();
	});

	it('reports a Classic credential as unsupported', async () => {
		const { service } = makeService();

		const result = await service.list({ endpointType: 'classic', apiKey: 'key', project: 'p' });

		expect(result).toEqual({ status: 'unavailable', reason: 'endpoint_type_unsupported' });
		expect(listAzureOpenAiModels).not.toHaveBeenCalled();
	});

	it('reports a Foundry credential without a project', async () => {
		const { service } = makeService();

		const result = await service.list({ endpointType: 'foundry', foundryEndpoint, apiKey: 'key' });

		expect(result).toEqual({ status: 'unavailable', reason: 'project_missing' });
		expect(listAzureOpenAiModels).not.toHaveBeenCalled();
	});

	it('lists the deployments with the API key', async () => {
		const { service } = makeService();

		const result = await service.list({
			endpointType: 'foundry',
			foundryEndpoint,
			apiKey: 'key',
			project: ' my-project ',
		});

		expect(result).toEqual({
			status: 'success',
			deployments: [{ id: 'my-chat', name: 'my-chat (gpt-4.1)' }],
		});
		expect(listAzureOpenAiModels).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://my-resource.services.ai.azure.com',
				project: 'my-project',
				headers: { 'api-key': 'key' },
			}),
		);
	});

	it('mints an Entra ID token from the mapped credential within the outbound policy', async () => {
		const { service, ssrfProtectionService } = makeService();
		mintAzureFoundryDeploymentsToken.mockResolvedValue('foundry-token');

		await service.list({
			endpointType: 'foundry',
			foundryEndpoint,
			project: 'my-project',
			clientId: 'client-id',
			clientSecret: 'secret',
			accessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/token',
			oauthTokenData: { access_token: 'stored' },
		});

		expect(mintAzureFoundryDeploymentsToken).toHaveBeenCalledWith(
			expect.objectContaining({
				oauthClientId: 'client-id',
				oauthAccessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/token',
			}),
			ssrfProtectionService,
		);
		expect(listAzureOpenAiModels).toHaveBeenCalledWith(
			expect.objectContaining({ headers: { Authorization: 'Bearer foundry-token' } }),
		);
	});

	it('prefixes Claude deployments so the runtime uses the Anthropic API', async () => {
		const { service } = makeService();
		listAzureOpenAiModels.mockResolvedValue([
			{ id: 'my-claude', name: 'my-claude (claude-opus-4-1)', modelFamily: 'anthropic' },
		]);

		const result = await service.list({
			endpointType: 'foundry',
			foundryEndpoint,
			apiKey: 'key',
			project: 'my-project',
		});

		expect(result).toEqual({
			status: 'success',
			deployments: [{ id: 'anthropic/my-claude', name: 'my-claude (claude-opus-4-1)' }],
		});
	});

	it('reports a project the deployments API does not know', async () => {
		const { service } = makeService();
		const error = new AzureProjectNotFoundError('missing-project');
		listAzureOpenAiModels.mockRejectedValue(error);

		const result = await service.list({
			endpointType: 'foundry',
			foundryEndpoint,
			apiKey: 'key',
			project: 'missing-project',
		});

		expect(result).toEqual({ status: 'unavailable', reason: 'project_not_found', error });
	});
});
