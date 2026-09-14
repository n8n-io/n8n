import type { CredentialProvider } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { resolveEmbeddingProviderOptionsFromCredential } from '../embedding-credential';

describe('resolveEmbeddingProviderOptionsFromCredential', () => {
	it('maps an OpenAI-style credential to apiKey/baseURL', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({
			apiKey: 'openai-key',
			url: 'https://api.openai.com/v1',
		});

		const options = await resolveEmbeddingProviderOptionsFromCredential(
			'embed-cred',
			'openai/text-embedding-3-small',
			credentialProvider,
		);

		expect(options).toEqual({ apiKey: 'openai-key', baseURL: 'https://api.openai.com/v1' });
	});

	it('preserves AWS credential fields for a Bedrock embedding model', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({
			region: 'us-east-1',
			accessKeyId: 'AKIA...',
			secretAccessKey: 'secret',
			sessionToken: 'token',
		});

		const options = await resolveEmbeddingProviderOptionsFromCredential(
			'embed-cred',
			'bedrock/amazon.titan-embed-text-v2:0',
			credentialProvider,
		);

		expect(options).toEqual({
			region: 'us-east-1',
			accessKeyId: 'AKIA...',
			secretAccessKey: 'secret',
			sessionToken: 'token',
		});
	});

	it('drops non-string values from the resolved credential', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({ apiKey: 'openai-key', extra: 42 });

		const options = await resolveEmbeddingProviderOptionsFromCredential(
			'embed-cred',
			'openai/text-embedding-3-small',
			credentialProvider,
		);

		expect(options).toEqual({ apiKey: 'openai-key' });
	});
});
