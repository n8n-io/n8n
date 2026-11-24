import { AzureProjectNotFoundError } from '@n8n/ai-utilities/model-discovery';
import type { Logger } from '@n8n/backend-common';
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
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const service = new AzureFoundryDeploymentsService(
		logger,
		outboundHttp,
		ssrfProtectionService,
		ssrfProtectionConfig,
	);
	return { service, ssrfProtectionService, logger };
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

	describe('findUnderlyingModel', () => {
		const credential = {
			endpointType: 'foundry',
			foundryEndpoint,
			apiKey: 'key',
			project: 'my-project',
		};

		it('finds the served model and caches the list for the credential', async () => {
			const { service } = makeService();
			listAzureOpenAiModels.mockResolvedValue([
				{ id: 'my-chat', name: 'my-chat (gpt-4.1)', modelFamily: 'openai', modelName: 'gpt-4.1' },
				{
					id: 'my-claude',
					name: 'my-claude (claude-opus-4-5)',
					modelFamily: 'anthropic',
					modelName: 'claude-opus-4-5',
				},
			]);

			await expect(service.findUnderlyingModel('cred-1', credential, 'my-chat')).resolves.toBe(
				'gpt-4.1',
			);
			await expect(
				service.findUnderlyingModel('cred-1', credential, 'anthropic/my-claude'),
			).resolves.toBe('claude-opus-4-5');
			expect(listAzureOpenAiModels).toHaveBeenCalledTimes(1);
		});

		it('lists again when the cached list does not have the deployment', async () => {
			const { service } = makeService();
			listAzureOpenAiModels
				.mockResolvedValueOnce([
					{ id: 'my-chat', name: 'my-chat (gpt-4.1)', modelFamily: 'openai', modelName: 'gpt-4.1' },
				])
				.mockResolvedValueOnce([
					{ id: 'my-chat', name: 'my-chat (gpt-4.1)', modelFamily: 'openai', modelName: 'gpt-4.1' },
					{ id: 'new-chat', name: 'new-chat (gpt-5)', modelFamily: 'openai', modelName: 'gpt-5' },
				]);

			await service.findUnderlyingModel('cred-1', credential, 'my-chat');
			await expect(service.findUnderlyingModel('cred-1', credential, 'new-chat')).resolves.toBe(
				'gpt-5',
			);
			expect(listAzureOpenAiModels).toHaveBeenCalledTimes(2);
		});

		it('caches a listed deployment without a model name', async () => {
			const { service } = makeService();

			await expect(
				service.findUnderlyingModel('cred-1', credential, 'my-chat'),
			).resolves.toBeUndefined();
			await expect(
				service.findUnderlyingModel('cred-1', credential, 'my-chat'),
			).resolves.toBeUndefined();
			expect(listAzureOpenAiModels).toHaveBeenCalledTimes(1);
		});

		it('returns undefined when no listing has the deployment', async () => {
			const { service } = makeService();

			await expect(
				service.findUnderlyingModel('cred-1', credential, 'missing'),
			).resolves.toBeUndefined();
			await expect(
				service.findUnderlyingModel('cred-1', credential, 'missing'),
			).resolves.toBeUndefined();
			expect(listAzureOpenAiModels).toHaveBeenCalledTimes(2);
		});

		it('does not cache a failed listing and logs a warning', async () => {
			const { service, logger } = makeService();
			listAzureOpenAiModels
				.mockRejectedValueOnce(new Error('down'))
				.mockResolvedValueOnce([
					{ id: 'my-chat', name: 'my-chat (gpt-4.1)', modelFamily: 'openai', modelName: 'gpt-4.1' },
				]);

			await expect(
				service.findUnderlyingModel('cred-1', credential, 'my-chat'),
			).resolves.toBeUndefined();
			await expect(service.findUnderlyingModel('cred-1', credential, 'my-chat')).resolves.toBe(
				'gpt-4.1',
			);

			expect(listAzureOpenAiModels).toHaveBeenCalledTimes(2);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ credentialId: 'cred-1', error: 'down' }),
			);
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
