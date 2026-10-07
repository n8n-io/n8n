import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import {
	resolveCredentialAwareModelConfig,
	type AiGatewayModelCredentialResolver,
} from '../model-config';

describe('resolveCredentialAwareModelConfig', () => {
	it('resolves a Vertex service account with the selected project and credential region', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.list.mockResolvedValue([{ id: 'gcp', name: 'GCP', type: 'googleApi' }]);
		credentialProvider.resolve.mockResolvedValue({
			email: 'agent@example.iam.gserviceaccount.com',
			privateKey: 'private-key',
			region: 'europe-west4',
		});
		await expect(
			resolveCredentialAwareModelConfig(
				'google-vertex/gemini-3-flash-preview',
				'gcp',
				credentialProvider,
				{ projectId: ' project-one ' },
			),
		).resolves.toEqual({
			id: 'google-vertex/gemini-3-flash-preview',
			project: 'project-one',
			location: 'europe-west4',
			clientEmail: 'agent@example.iam.gserviceaccount.com',
			privateKey: 'private-key',
		});
	});

	it.each([
		{
			model: 'google-vertex/gemini-2.5-pro',
			projectId: 'project-one',
			type: 'googleApi',
			error: 'Gemini 3',
		},
		{
			model: 'google-vertex/gemini-3-flash-preview',
			projectId: '',
			type: 'googleApi',
			error: 'project ID',
		},
		{
			model: 'google-vertex/gemini-3-flash-preview',
			projectId: 'project-one',
			type: 'googlePalmApi',
			error: 'Service Account credential',
		},
	])(
		'rejects an incomplete or incompatible Vertex selection: $error',
		async ({ model, projectId, type, error }) => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.list.mockResolvedValue([{ id: 'gcp', name: 'GCP', type }]);
			await expect(
				resolveCredentialAwareModelConfig(model, 'gcp', credentialProvider, { projectId }),
			).rejects.toThrow(error);
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
