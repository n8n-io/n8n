import type { CredentialProvider } from '@n8n/agents';
import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import {
	resolveEmbeddingProviderOptionsFromCredential,
	resolveEpisodicMemoryEmbeddingProviderOptions,
} from '../embedding-credential';

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

describe('resolveEpisodicMemoryEmbeddingProviderOptions', () => {
	const proxyFetch = vi.fn();

	it('adds the proxy fetch to a credential embedder', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({ apiKey: 'openai-key' });

		const options = await resolveEpisodicMemoryEmbeddingProviderOptions(
			'embed-cred',
			'openai/text-embedding-3-small',
			credentialProvider,
			{ fetch: proxyFetch },
		);

		expect(options).toEqual({ apiKey: 'openai-key', fetch: proxyFetch });
	});

	it('keeps the fetch of managed embeddings', async () => {
		const managedFetch = vi.fn();
		const resolveManaged = vi.fn().mockResolvedValue({ apiKey: 'managed', fetch: managedFetch });

		const options = await resolveEpisodicMemoryEmbeddingProviderOptions(
			MANAGED_CREDENTIAL_TOKEN,
			'openai/text-embedding-3-small',
			mock<CredentialProvider>(),
			{ resolveManaged, fetch: proxyFetch },
		);

		expect(options).toEqual({ apiKey: 'managed', fetch: managedFetch });
	});

	it('returns null when managed embeddings are not available', async () => {
		const options = await resolveEpisodicMemoryEmbeddingProviderOptions(
			MANAGED_CREDENTIAL_TOKEN,
			'openai/text-embedding-3-small',
			mock<CredentialProvider>(),
		);

		expect(options).toBeNull();
	});
});
