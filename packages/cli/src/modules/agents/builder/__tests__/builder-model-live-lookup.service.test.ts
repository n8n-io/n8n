import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsHelper } from '@/credentials-helper';
import type { AiGatewayService } from '@/services/ai-gateway.service';

import { BuilderModelLiveLookupService } from '../builder-model-live-lookup.service';

const listModelsForProvider = vi.fn();
vi.mock('@n8n/ai-utilities/model-discovery', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities/model-discovery')>()),
	listModelsForProvider: (...args: unknown[]) => listModelsForProvider(...args) as unknown,
}));

const additionalData = mock<IWorkflowExecuteAdditionalData>();
const getBaseMock = vi.fn<(...args: unknown[]) => Promise<IWorkflowExecuteAdditionalData>>();
vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: async (...args: unknown[]) => await getBaseMock(...args),
}));

const user = mock<User>({ id: 'user-1' });
const projectId = 'project-1';

function makeService() {
	const credentialsService = mock<CredentialsService>();
	const credentialsHelper = mock<CredentialsHelper>();
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	const aiGatewayService = mock<AiGatewayService>();

	const service = new BuilderModelLiveLookupService(
		credentialsService,
		credentialsHelper,
		outboundHttp,
		aiGatewayService,
	);
	return { service, credentialsService, credentialsHelper, aiGatewayService };
}

function usable(id: string, type: string) {
	return [{ id, name: 'My Credential', type }] as Awaited<
		ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
	>;
}

describe('BuilderModelLiveLookupService', () => {
	beforeEach(() => {
		listModelsForProvider.mockReset();
		getBaseMock.mockReset();
		getBaseMock.mockResolvedValue(additionalData);
	});

	describe('lookup', () => {
		it('returns endpoint-only models and forwards OpenAI credential request options', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
				organizationId: 'org-123',
				header: true,
				headerName: 'authorization',
				headerValue: 'Bearer custom-token',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'custom-model', name: 'Custom model' }]);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({
				status: 'success',
				policy: 'endpoint-only',
				models: [{ name: 'Custom model', value: 'custom-model' }],
			});
			expect(listModelsForProvider).toHaveBeenCalledWith(
				'openai',
				expect.objectContaining({
					apiKey: 'sk-key',
					baseURL: 'https://openai-compatible.example/v1',
					headers: {
						Authorization: 'Bearer custom-token',
						'OpenAI-Organization': 'org-123',
					},
				}),
			);
		});

		it('lets a custom OpenAI organization header override the credential organization', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
				organizationId: 'org-default',
				header: true,
				headerName: 'openai-organization',
				headerValue: 'org-custom',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'custom-model', name: 'Custom model' }]);

			await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(listModelsForProvider).toHaveBeenCalledWith(
				'openai',
				expect.objectContaining({
					headers: { 'OpenAI-Organization': 'org-custom' },
				}),
			);
		});

		it('returns curated models for the official OpenAI endpoint', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://api.openai.com/v1',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'gpt-5', name: 'GPT-5' }]);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({
				status: 'success',
				policy: 'curated',
				models: [{ name: 'GPT-5', value: 'gpt-5' }],
			});
		});

		it('preserves endpoint-only policy when custom OpenAI discovery fails', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
			});
			const error = new Error('Model listing failed');
			listModelsForProvider.mockRejectedValue(error);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({ status: 'unavailable', policy: 'endpoint-only', error });
		});

		it('preserves endpoint-only policy when custom OpenAI discovery is empty', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
			});
			listModelsForProvider.mockResolvedValue([]);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({
				status: 'unavailable',
				policy: 'endpoint-only',
				error: expect.objectContaining({ message: 'Provider openai returned no models' }),
			});
		});

		it('returns managed policy for the n8n Connect managed tag', async () => {
			const { service, aiGatewayService } = makeService();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
			aiGatewayService.getSyntheticCredential.mockResolvedValue({
				apiKey: 'gateway-jwt',
				url: 'https://gw.example/v1/gateway/openai/v1',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'gpt-5-mini', name: 'GPT-5 mini' }]);

			const result = await service.lookup(
				user,
				projectId,
				AI_GATEWAY_MANAGED_TAG,
				'openAiApi',
				'openai',
			);

			expect(result).toEqual({
				status: 'success',
				policy: 'managed',
				models: [{ name: 'GPT-5 mini', value: 'gpt-5-mini' }],
			});
		});

		it('keeps list compatible with successful and unavailable lookups', async () => {
			const { service } = makeService();
			const models = [{ name: 'GPT-5', value: 'gpt-5' }];
			const error = new Error('Model listing failed');
			const lookup = vi
				.spyOn(service, 'lookup')
				.mockResolvedValueOnce({ status: 'success', policy: 'curated', models })
				.mockResolvedValueOnce({ status: 'unavailable', policy: 'curated', error });

			await expect(service.list(user, projectId, 'cred-1', 'openAiApi', 'openai')).resolves.toBe(
				models,
			);
			await expect(service.list(user, projectId, 'cred-1', 'openAiApi', 'openai')).rejects.toBe(
				error,
			);
			expect(lookup).toHaveBeenCalledTimes(2);
		});
	});

	it('lists models for a credential the user can use in the project', async () => {
		const { service, credentialsService, credentialsHelper } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsHelper.getDecrypted.mockResolvedValue({
			apiKey: 'sk-key',
			url: 'https://proxy.local',
		});
		listModelsForProvider.mockResolvedValue([
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		]);

		const result = await service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic');

		expect(result).toEqual([{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }]);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId,
		});
		// Credential fields are mapped for the provider (anthropic: apiKey + url→baseURL).
		expect(listModelsForProvider).toHaveBeenCalledWith(
			'anthropic',
			expect.objectContaining({ apiKey: 'sk-key', baseURL: 'https://proxy.local' }),
		);
	});

	it('resolves credential defaults and expressions instead of reading raw stored data', async () => {
		const { service, credentialsService, credentialsHelper } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsHelper.getDecrypted.mockResolvedValue({
			apiKey: 'sk-key',
			url: 'https://api.region.example/v1',
		});
		listModelsForProvider.mockResolvedValue([
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		]);

		await service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic');

		expect(getBaseMock).toHaveBeenCalledWith({ userId: 'user-1', projectId });
		expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
			additionalData,
			{ id: 'cred-1', name: 'My Credential' },
			'anthropicApi',
			'internal',
		);
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
		expect(listModelsForProvider).toHaveBeenCalledWith(
			'anthropic',
			expect.objectContaining({ baseURL: 'https://api.region.example/v1' }),
		);
	});

	it('treats an empty provider response as a failed lookup', async () => {
		const { service, credentialsService, credentialsHelper } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsHelper.getDecrypted.mockResolvedValue({ apiKey: 'sk-key' });
		// An empty list from a chat provider is far more likely a broken request
		// or drifted response shape than a real zero-model account — callers must
		// fall back rather than prune everything.
		listModelsForProvider.mockResolvedValue([]);

		await expect(
			service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('returned no models');
	});

	it('rejects a credential that is not available in the project', async () => {
		const { service, credentialsService } = makeService();
		// The user can read this credential, but it is not in the project's set.
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		await expect(
			service.list(user, projectId, 'cred-other-project', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('not found or not accessible');
		expect(listModelsForProvider).not.toHaveBeenCalled();
	});

	it('rejects a credential whose type does not match the provider', async () => {
		const { service, credentialsService } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'openAiApi'),
		);

		await expect(
			service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('not found or not accessible');
		expect(listModelsForProvider).not.toHaveBeenCalled();
	});

	describe('list with the n8n Connect managed tag', () => {
		it('resolves the synthetic gateway credential and lists its allowlisted models', async () => {
			const { service, aiGatewayService, credentialsService, credentialsHelper } = makeService();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
			aiGatewayService.getSyntheticCredential.mockResolvedValue({
				apiKey: 'gateway-jwt',
				url: 'https://gw.example/v1/gateway/openai/v1',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'gpt-5-mini', name: 'GPT-5 mini' }]);

			const result = await service.list(
				user,
				projectId,
				AI_GATEWAY_MANAGED_TAG,
				'openAiApi',
				'openai',
			);

			expect(result).toEqual([{ name: 'GPT-5 mini', value: 'gpt-5-mini' }]);
			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'openAiApi',
				userId: 'user-1',
				projectId,
			});
			// No stored-credential lookup or decryption for the managed tag.
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			// Discovery hits the gateway baseURL → the gateway returns only allowlisted models.
			expect(listModelsForProvider).toHaveBeenCalledWith(
				'openai',
				expect.objectContaining({
					apiKey: 'gateway-jwt',
					baseURL: 'https://gw.example/v1/gateway/openai/v1',
				}),
			);
		});

		it('throws when the gateway does not serve the provider', async () => {
			const { service, aiGatewayService } = makeService();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue(undefined);

			await expect(
				service.list(user, projectId, AI_GATEWAY_MANAGED_TAG, 'xAiApi', 'xai'),
			).rejects.toThrow('do not support');
			expect(aiGatewayService.getSyntheticCredential).not.toHaveBeenCalled();
			expect(listModelsForProvider).not.toHaveBeenCalled();
		});
	});
});
