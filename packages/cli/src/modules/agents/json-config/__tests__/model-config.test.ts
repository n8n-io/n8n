import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import {
	resolveCredentialAwareModelConfig,
	type AiGatewayModelCredentialResolver,
} from '../model-config';

describe('resolveCredentialAwareModelConfig', () => {
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
		).rejects.toThrow('cannot resolve n8n credits');
		expect(resolve).not.toHaveBeenCalled();
	});
});
