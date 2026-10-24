import type { BuiltVectorStoreBackend, CredentialProvider } from '@n8n/agents';
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { VectorStoreConnectionTestService } from '../connection-test.service';
import { resolveEmbeddingProviderOptionsFromCredential } from '../embedding-credential';
import { buildVectorStoreBackend } from '../factory';

vi.mock('../factory', () => ({
	buildVectorStoreBackend: vi.fn(),
}));

vi.mock('../embedding-credential', () => ({
	resolveEmbeddingProviderOptionsFromCredential: vi.fn().mockResolvedValue({}),
}));

vi.mock('@n8n/agents', () => ({
	createEmbeddingModel: vi.fn().mockReturnValue({ modelId: 'text-embedding-3-small' }),
}));

vi.mock('ai', () => ({
	embed: vi.fn().mockResolvedValue({ embedding: [0, 0] }),
}));

const postgresConfig: AgentJsonVectorStoreConfig = {
	provider: 'postgres',
	name: 'docs',
	credential: 'postgres-cred',
	useWhen: 'Search docs',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
	tableName: 'documents',
};

// Built manually instead of `mock<BuiltVectorStoreBackend>()`: `close` being an
// optional method makes vitest-mock-extended's deep proxy fall back to the
// plain (un-mocked) function types for every method, so `.mockResolvedValue`
// etc. wouldn't type-check. `satisfies` keeps the vi.fn() types while still
// checking the shape matches the interface.
function makeBackend() {
	return {
		upsert: vi.fn(),
		query: vi.fn(),
		delete: vi.fn(),
		close: vi.fn().mockResolvedValue(undefined),
	} satisfies BuiltVectorStoreBackend;
}

describe('VectorStoreConnectionTestService.testConnection', () => {
	const credentialProvider = mock<CredentialProvider>();
	const service = new VectorStoreConnectionTestService();
	beforeEach(() => {
		vi.clearAllMocks();
		credentialProvider.resolve.mockReset().mockResolvedValue({ apiKey: 'store-key' });
		vi.mocked(buildVectorStoreBackend).mockReset();
		vi.mocked(resolveEmbeddingProviderOptionsFromCredential).mockReset().mockResolvedValue({});
	});

	it('resolves the store credential once, builds the backend with it, and closes on success', async () => {
		const backend = makeBackend();
		backend.query.mockResolvedValue([]);
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);

		const result = await service.testConnection(postgresConfig, credentialProvider);

		expect(result).toEqual({ success: true });
		expect(credentialProvider.resolve).toHaveBeenCalledTimes(1);
		expect(credentialProvider.resolve).toHaveBeenCalledWith(postgresConfig.credential);
		expect(buildVectorStoreBackend).toHaveBeenCalledWith(postgresConfig, credentialProvider, {
			apiKey: 'store-key',
		});
		expect(backend.query).toHaveBeenCalledWith([0, 0], { topK: 1 });
		expect(backend.close).toHaveBeenCalledTimes(1);
	});

	it('times out, reports a timeout message, and still closes the backend', async () => {
		vi.useFakeTimers();
		try {
			const backend = makeBackend();
			backend.query.mockImplementation(async () => await new Promise<never>(() => {}));
			vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);

			const resultPromise = service.testConnection(postgresConfig, credentialProvider);
			await vi.advanceTimersByTimeAsync(15_000);
			const result = await resultPromise;

			expect(result).toEqual({ success: false, message: 'Connection test timed out' });
			expect(backend.close).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('closes a backend that finishes building only after the timeout already responded', async () => {
		vi.useFakeTimers();
		try {
			const backend = makeBackend();
			let resolveBackend!: (value: BuiltVectorStoreBackend) => void;
			vi.mocked(buildVectorStoreBackend).mockImplementation(
				async () =>
					await new Promise<BuiltVectorStoreBackend>((resolve) => {
						resolveBackend = resolve;
					}),
			);

			const resultPromise = service.testConnection(postgresConfig, credentialProvider);
			await vi.advanceTimersByTimeAsync(15_000);
			const result = await resultPromise;

			expect(result).toEqual({ success: false, message: 'Connection test timed out' });
			expect(backend.close).not.toHaveBeenCalled();

			// Backend creation finishes late, after the timeout already responded.
			resolveBackend(backend);
			await vi.advanceTimersByTimeAsync(0);

			expect(backend.close).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('surfaces the probe query error and still closes the backend', async () => {
		const backend = makeBackend();
		backend.query.mockRejectedValue(new Error('connection refused'));
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);

		const result = await service.testConnection(postgresConfig, credentialProvider);

		expect(result).toEqual({ success: false, message: 'connection refused' });
		expect(backend.close).toHaveBeenCalledTimes(1);
	});

	it('warns when the configured Pinecone namespace has no data yet, still running the probe query', async () => {
		vi.doMock('@pinecone-database/pinecone', () => ({
			Pinecone: class {
				async describeIndex() {
					return { dimension: 2 };
				}
				index() {
					return { describeIndexStats: async () => ({ namespaces: { prod: {} } }) };
				}
			},
		}));

		const backend = makeBackend();
		backend.query.mockResolvedValue([]);
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);
		credentialProvider.resolve.mockResolvedValue({ apiKey: 'pc-key' });
		const pineconeConfig: AgentJsonVectorStoreConfig = {
			provider: 'pinecone',
			name: 'docs',
			credential: 'pinecone-cred',
			useWhen: 'Search docs',
			embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
			indexName: 'product-docs',
			namespace: 'staging',
		};

		const result = await service.testConnection(pineconeConfig, credentialProvider);

		expect(result).toEqual({
			success: true,
			warning:
				'Namespace "staging" has no data yet in index "product-docs". It will appear once data is indexed — double-check the name if you expected existing data.',
		});
		expect(backend.query).toHaveBeenCalledWith([0, 0], { topK: 1 });
		expect(backend.close).toHaveBeenCalledTimes(1);

		vi.doUnmock('@pinecone-database/pinecone');
	});

	it('reports a hard failure for a Pinecone dimension mismatch and skips the probe query', async () => {
		vi.doMock('@pinecone-database/pinecone', () => ({
			Pinecone: class {
				async describeIndex() {
					return { dimension: 4 };
				}
				index() {
					return { describeIndexStats: async () => ({ namespaces: { prod: {} } }) };
				}
			},
		}));

		const backend = makeBackend();
		backend.query.mockResolvedValue([]);
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);
		credentialProvider.resolve.mockResolvedValue({ apiKey: 'pc-key' });
		const pineconeConfig: AgentJsonVectorStoreConfig = {
			provider: 'pinecone',
			name: 'docs',
			credential: 'pinecone-cred',
			useWhen: 'Search docs',
			embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
			indexName: 'product-docs',
		};

		const result = await service.testConnection(pineconeConfig, credentialProvider);

		expect(result).toEqual({
			success: false,
			message:
				'Index "product-docs" expects 4 dimensions but model "openai/text-embedding-3-small" produces 2.',
		});
		expect(backend.query).not.toHaveBeenCalled();
		expect(backend.close).toHaveBeenCalledTimes(1);

		vi.doUnmock('@pinecone-database/pinecone');
	});
});
