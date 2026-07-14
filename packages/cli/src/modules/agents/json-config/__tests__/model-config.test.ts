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
		});
	});

	it('falls through to resolve() for the managed tag when the provider has no gateway capability', async () => {
		const resolve = vi.fn().mockResolvedValue({ apiKey: 'x' });
		const credentialProvider = { resolve } as unknown as CredentialProvider;

		await resolveCredentialAwareModelConfig(
			'openai/gpt-5',
			AI_GATEWAY_MANAGED_TAG,
			credentialProvider,
		);

		expect(resolve).toHaveBeenCalledWith(AI_GATEWAY_MANAGED_TAG);
	});
});
