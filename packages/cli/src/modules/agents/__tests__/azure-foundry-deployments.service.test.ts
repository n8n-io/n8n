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

const getToken = vi.fn();
const clientOAuth2 = vi.fn();
vi.mock('@n8n/client-oauth2', () => ({
	ClientOAuth2: class {
		credentials = { getToken };

		constructor(options: unknown) {
			clientOAuth2(options);
		}
	},
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
		listAzureOpenAiModels.mockResolvedValue([{ id: 'my-chat', name: 'my-chat (gpt-4.1)' }]);
		getToken.mockReset();
		clientOAuth2.mockReset();
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

	it('lists the OpenAI-compatible deployments with the API key', async () => {
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
				openAiCompatibleOnly: true,
			}),
		);
	});

	it('mints an Entra ID token for the Foundry audience within the outbound policy', async () => {
		const { service, ssrfProtectionService } = makeService();
		getToken.mockResolvedValue({ data: { access_token: 'foundry-token' } });

		await service.list({
			endpointType: 'foundry',
			foundryEndpoint,
			project: 'my-project',
			clientId: 'client-id',
			clientSecret: 'secret',
			accessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/token',
			oauthTokenData: { access_token: 'stored' },
		});

		expect(clientOAuth2).toHaveBeenCalledWith(
			expect.objectContaining({
				clientId: 'client-id',
				accessTokenUri: 'https://login.microsoftonline.com/tenant/oauth2/token',
				additionalBodyProperties: { resource: 'https://ai.azure.com/' },
				ssrfBridge: ssrfProtectionService,
			}),
		);
		expect(listAzureOpenAiModels).toHaveBeenCalledWith(
			expect.objectContaining({ headers: { Authorization: 'Bearer foundry-token' } }),
		);
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
