import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { buildVectorStore, buildVectorStoreBackend } from '../vector-store-factory';

type EmbeddingProviderOpts = { apiKey?: string; baseURL?: string };

// `createEmbeddingModel` (called inside `VectorStore.embeddingModel()`) requires
// the AI SDK provider package synchronously — stub it the same way from-json-config.test.ts does.
vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: (opts?: EmbeddingProviderOpts) =>
		Object.assign((model: string) => ({ provider: 'openai', modelId: model, ...opts }), {
			embeddingModel: (model: string) => ({ provider: 'openai', modelId: model, ...opts }),
		}),
}));

function makePineconeConfig(
	overrides: Partial<Extract<AgentJsonVectorStoreConfig, { provider: 'pinecone' }>> = {},
): AgentJsonVectorStoreConfig {
	return {
		provider: 'pinecone',
		name: 'product_docs',
		credential: 'pinecone-cred',
		useWhen: 'Search product docs',
		embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
		indexName: 'product-docs',
		...overrides,
	};
}

function makeQdrantConfig(
	overrides: Partial<Extract<AgentJsonVectorStoreConfig, { provider: 'qdrant' }>> = {},
): AgentJsonVectorStoreConfig {
	return {
		provider: 'qdrant',
		name: 'product_docs',
		credential: 'qdrant-cred',
		useWhen: 'Search product docs',
		embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
		collectionName: 'product-docs',
		...overrides,
	};
}

function makeSupabaseConfig(
	overrides: Partial<Extract<AgentJsonVectorStoreConfig, { provider: 'supabase' }>> = {},
): AgentJsonVectorStoreConfig {
	return {
		provider: 'supabase',
		name: 'product_docs',
		credential: 'supabase-cred',
		useWhen: 'Search product docs',
		embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
		tableName: 'documents',
		...overrides,
	};
}

function makePostgresConfig(
	overrides: Partial<Extract<AgentJsonVectorStoreConfig, { provider: 'postgres' }>> = {},
): AgentJsonVectorStoreConfig {
	return {
		provider: 'postgres',
		name: 'product_docs',
		credential: 'postgres-cred',
		useWhen: 'Search product docs',
		embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
		tableName: 'documents',
		...overrides,
	};
}

// `constructorOptions` is protected on BaseVectorStore — safe to reach into from tests.
function getConstructorOptions(backend: unknown): Record<string, unknown> {
	return (backend as { constructorOptions: Record<string, unknown> }).constructorOptions;
}

describe('buildVectorStoreBackend', () => {
	it('throws when the connection has no credential configured', async () => {
		const credentialProvider = mock<CredentialProvider>();
		await expect(
			buildVectorStoreBackend(makePineconeConfig({ credential: '' }), credentialProvider),
		).rejects.toThrow(UserError);
		expect(credentialProvider.resolve).not.toHaveBeenCalled();
	});

	it('uses a pre-resolved credential without calling credentialProvider.resolve', async () => {
		const credentialProvider = mock<CredentialProvider>();

		const backend = await buildVectorStoreBackend(makePineconeConfig(), credentialProvider, {
			apiKey: 'pc-key',
		});

		expect(credentialProvider.resolve).not.toHaveBeenCalled();
		expect(getConstructorOptions(backend)).toEqual({
			apiKey: 'pc-key',
			indexName: 'product-docs',
		});
	});

	describe('pinecone', () => {
		it('maps apiKey, indexName, and namespace from the credential and config', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({ apiKey: 'pc-key' });

			const backend = await buildVectorStoreBackend(
				makePineconeConfig({ namespace: 'prod' }),
				credentialProvider,
			);

			expect(credentialProvider.resolve).toHaveBeenCalledWith('pinecone-cred');
			expect(getConstructorOptions(backend)).toEqual({
				apiKey: 'pc-key',
				indexName: 'product-docs',
				namespace: 'prod',
			});
		});

		it('omits namespace when not configured', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({ apiKey: 'pc-key' });

			const backend = await buildVectorStoreBackend(makePineconeConfig(), credentialProvider);

			expect(getConstructorOptions(backend)).toEqual({
				apiKey: 'pc-key',
				indexName: 'product-docs',
			});
		});

		it('throws when the credential is missing an apiKey', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({});

			await expect(
				buildVectorStoreBackend(makePineconeConfig(), credentialProvider),
			).rejects.toThrow(UserError);
		});
	});

	describe('qdrant', () => {
		it('maps url, optional apiKey, and collectionName', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				qdrantUrl: 'https://qdrant.example',
				apiKey: 'qd-key',
			});

			const backend = await buildVectorStoreBackend(makeQdrantConfig(), credentialProvider);

			expect(getConstructorOptions(backend)).toEqual({
				url: 'https://qdrant.example',
				apiKey: 'qd-key',
				collectionName: 'product-docs',
			});
		});

		it('omits apiKey when the credential leaves it blank', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				qdrantUrl: 'https://qdrant.example',
				apiKey: '',
			});

			const backend = await buildVectorStoreBackend(makeQdrantConfig(), credentialProvider);

			expect(getConstructorOptions(backend)).toEqual({
				url: 'https://qdrant.example',
				collectionName: 'product-docs',
			});
		});

		it('throws when the credential is missing qdrantUrl', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({ apiKey: 'qd-key' });

			await expect(buildVectorStoreBackend(makeQdrantConfig(), credentialProvider)).rejects.toThrow(
				UserError,
			);
		});
	});

	describe('supabase', () => {
		it('maps host to url, serviceRole to apiKey, tableName, and queryName', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'https://project.supabase.co',
				serviceRole: 'sb-secret',
			});

			const backend = await buildVectorStoreBackend(
				makeSupabaseConfig({ queryName: 'match_docs' }),
				credentialProvider,
			);

			expect(getConstructorOptions(backend)).toEqual({
				url: 'https://project.supabase.co',
				apiKey: 'sb-secret',
				tableName: 'documents',
				queryName: 'match_docs',
			});
		});

		it('throws when the credential is missing serviceRole', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({ host: 'https://project.supabase.co' });

			await expect(
				buildVectorStoreBackend(makeSupabaseConfig(), credentialProvider),
			).rejects.toThrow(UserError);
		});
	});

	describe('postgres', () => {
		it('builds a connection string from host/port/database/user/password', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				port: 5544,
				database: 'agentdb',
				user: 'agent_user',
				password: 'secret',
				ssl: 'disable',
			});

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend)).toEqual({
				connectionString: 'postgresql://agent_user:secret@db.example.com:5544/agentdb',
				tableName: 'documents',
				connectionTimeoutMillis: 10_000,
			});
		});

		it('URL-encodes special characters in user and password', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				port: 5432,
				database: 'agentdb',
				user: 'a@user',
				password: 'p@ss:word/1',
				ssl: 'disable',
			});

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend).connectionString).toBe(
				'postgresql://a%40user:p%40ss%3Aword%2F1@db.example.com:5432/agentdb',
			);
		});

		it('URL-encodes special characters in the database name', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				port: 5432,
				database: 'agent/db',
				user: 'agent_user',
				password: 'secret',
				ssl: 'disable',
			});

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend).connectionString).toContain('/agent%2Fdb');
		});

		it('appends sslmode=require when ssl is set to require', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				port: 5432,
				database: 'agentdb',
				user: 'agent_user',
				password: 'secret',
				ssl: 'require',
			});

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend).connectionString).toContain('?sslmode=require');
		});

		it('appends sslmode=no-verify when allowUnauthorizedCerts is set, overriding ssl', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				port: 5432,
				database: 'agentdb',
				user: 'agent_user',
				password: 'secret',
				ssl: 'require',
				allowUnauthorizedCerts: true,
			});

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend).connectionString).toContain('?sslmode=no-verify');
			expect(getConstructorOptions(backend).connectionString).not.toContain('sslmode=require');
		});

		it('defaults to port 5432 when the credential omits it', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				database: 'agentdb',
				user: 'agent_user',
				password: 'secret',
			});

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend).connectionString).toContain(':5432/');
		});

		it('rejects SSH tunnel credentials', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				database: 'agentdb',
				user: 'agent_user',
				password: 'secret',
				sshTunnel: true,
			});

			await expect(
				buildVectorStoreBackend(makePostgresConfig(), credentialProvider),
			).rejects.toThrow(UserError);
		});

		it('falls back to the credential type defaults for fields left unset', async () => {
			// Decrypted credential data omits fields left at their default in the
			// credential UI — host/database/user/port must fall back to the
			// defaults declared in Postgres.credentials.ts.
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({ password: 'secret' });

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend).connectionString).toBe(
				'postgresql://postgres:secret@localhost:5432/postgres',
			);
		});

		it('parses a string port from the credential data', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				host: 'db.example.com',
				database: 'agentdb',
				user: 'agent_user',
				password: 'secret',
				port: '5544',
			});

			const backend = await buildVectorStoreBackend(makePostgresConfig(), credentialProvider);

			expect(getConstructorOptions(backend).connectionString).toBe(
				'postgresql://agent_user:secret@db.example.com:5544/agentdb',
			);
		});
	});
});

describe('buildVectorStore', () => {
	it('throws when the connection has no embedding credential configured', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({ apiKey: 'pc-key' });

		await expect(
			buildVectorStore(
				makePineconeConfig({
					embedding: { model: 'openai/text-embedding-3-small', credential: '' },
				}),
				credentialProvider,
			),
		).rejects.toThrow(UserError);
	});

	it('resolves the embedding credential and builds a store backed by the configured provider', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockImplementation(async (credentialId: string) => {
			if (credentialId === 'pinecone-cred') return { apiKey: 'pc-key' };
			if (credentialId === 'embed-cred')
				return { apiKey: 'embed-key', url: 'https://embed.example' };
			throw new Error(`Unexpected credential id: ${credentialId}`);
		});

		const store = await buildVectorStore(makePineconeConfig(), credentialProvider);

		expect(credentialProvider.resolve).toHaveBeenCalledWith('pinecone-cred');
		expect(credentialProvider.resolve).toHaveBeenCalledWith('embed-cred');
		expect(store).toBeDefined();
	});
});
