import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import {
	resolveCredentialAwareModelConfig,
	type AiGatewayModelCredentialResolver,
} from '../model-config';

describe('resolveCredentialAwareModelConfig', () => {
	it.each([
		{
			model: 'google-vertex/gemini-2.5-pro',
			project: undefined,
			projectId: 'custom-project',
			expectedProject: 'custom-project',
		},
		{
			model: 'google-vertex/gemini-flash-latest',
			project: '__custom__',
			projectId: 'custom-project',
			expectedProject: 'custom-project',
		},
		{
			model: 'google-vertex/gemini-3-flash-preview',
			project: 'listed-project',
			projectId: 'old-custom-project',
			expectedProject: 'listed-project',
		},
	])(
		'uses the Vertex credential project $expectedProject and region for $model',
		async ({ model, project, projectId, expectedProject }) => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.list.mockResolvedValue([
				{ id: 'vertex', name: 'Vertex', type: 'googleVertexAiApi' },
			]);
			credentialProvider.resolve.mockResolvedValue({
				email: 'agent@example.iam.gserviceaccount.com',
				privateKey: 'private-key',
				region: 'europe-west4',
				project,
				projectId,
			});
			await expect(
				resolveCredentialAwareModelConfig(model, 'vertex', credentialProvider),
			).resolves.toEqual({
				id: model,
				project: expectedProject,
				location: 'europe-west4',
				clientEmail: 'agent@example.iam.gserviceaccount.com',
				privateKey: 'private-key',
			});
		},
	);

	it.each(['googleApi', 'googlePalmApi'])(
		'rejects an incompatible Vertex credential: %s',
		async (type) => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.list.mockResolvedValue([{ id: 'gcp', name: 'GCP', type }]);
			await expect(
				resolveCredentialAwareModelConfig(
					'google-vertex/gemini-2.5-pro',
					'gcp',
					credentialProvider,
				),
			).rejects.toThrow('Google Vertex AI credential');
			expect(credentialProvider.resolve).not.toHaveBeenCalled();
		},
	);

	it('resolves a real credential via the credential provider (unchanged path)', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({
			apiKey: 'real-key',
			url: 'https://api.openai.com',
		} as ResolvedCredential);

		const result = await resolveCredentialAwareModelConfig(
			'openai/gpt-5',
			'cred-123',
			credentialProvider,
		);

		expect(credentialProvider.resolve).toHaveBeenCalledWith('cred-123');
		expect(result).toEqual({
			id: 'openai/gpt-5',
			apiKey: 'real-key',
			baseURL: 'https://api.openai.com',
		});
	});

	it('resolves the managed tag through the provider gateway resolver, keyed by provider prefix', async () => {
		const credentialProvider = mock<CredentialProvider & AiGatewayModelCredentialResolver>();
		credentialProvider.resolveAiGatewayModelCredential.mockResolvedValue({
			apiKey: 'gateway-jwt',
			url: 'https://gw.example/v1/gateway/openai/v1',
		} as ResolvedCredential);

		const result = await resolveCredentialAwareModelConfig(
			'openai/gpt-5',
			AI_GATEWAY_MANAGED_TAG,
			credentialProvider,
		);

		expect(credentialProvider.resolveAiGatewayModelCredential).toHaveBeenCalledWith('openai');
		expect(credentialProvider.resolve).not.toHaveBeenCalled();
		expect(result).toEqual({
			id: 'openai/gpt-5',
			apiKey: 'gateway-jwt',
			baseURL: 'https://gw.example/v1/gateway/openai/v1',
			// The gateway serves OpenAI's Responses API; without this the model
			// factory infers /chat/completions from the baseURL.
			apiStyle: 'responses',
		});
	});

	it('throws for the managed tag when the provider cannot mint gateway credentials', async () => {
		// Resolving the tag as an ordinary credential id would surface as a confusing
		// "credential not found" instead of naming the real problem.
		const resolve = vi.fn();
		const credentialProvider = { resolve } as unknown as CredentialProvider;

		await expect(
			resolveCredentialAwareModelConfig('openai/gpt-5', AI_GATEWAY_MANAGED_TAG, credentialProvider),
		).rejects.toThrow('cannot resolve Gateway credits');
		expect(resolve).not.toHaveBeenCalled();
	});
});
