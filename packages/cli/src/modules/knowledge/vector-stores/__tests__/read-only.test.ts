import { VectorStore, type CredentialProvider } from '@n8n/agents';
import { PineconeVectorStore } from '@n8n/agents/vector-stores/pinecone';
import { PgVectorStore } from '@n8n/agents/vector-stores/postgres';
import { QdrantVectorStore } from '@n8n/agents/vector-stores/qdrant';
import { SupabaseVectorStore } from '@n8n/agents/vector-stores/supabase';
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { MockEmbeddingModelV3 } from 'ai/test';
import nock from 'nock';
import { Pool } from 'pg';
import { mock } from 'vitest-mock-extended';

import { buildFromJson, type ToolExecutor } from '@/modules/agents/json-config/from-json-config';

import { VectorStoreConnectionTestService } from '../connection-test.service';

vi.mock('@n8n/agents', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/agents')>();
	return {
		...actual,
		createEmbeddingModel: () => embeddingModel,
	};
});

const embeddingModel = new MockEmbeddingModelV3({
	doEmbed: async ({ values }) => ({ embeddings: values.map(() => [0, 0]), warnings: [] }),
});

const baseConfig = {
	name: 'docs',
	credential: 'store-credential',
	useWhen: 'Search documentation',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'embedding-credential' },
};

const configs: AgentJsonVectorStoreConfig[] = [
	{ ...baseConfig, provider: 'pinecone', indexName: 'documents', namespace: 'docs' },
	{ ...baseConfig, provider: 'qdrant', collectionName: 'documents' },
	{ ...baseConfig, provider: 'supabase', tableName: 'documents' },
	{ ...baseConfig, provider: 'postgres', tableName: 'documents' },
];

async function buildSearchTool(
	config: AgentJsonVectorStoreConfig,
	credentialProvider: CredentialProvider,
) {
	const agent = await buildFromJson(
		{
			name: 'Documentation agent',
			model: 'openai/gpt-4.1',
			credential: 'embedding-credential',
			instructions: 'Answer questions using the documentation.',
			vectorStores: [config],
		},
		{},
		{ credentialProvider, toolExecutor: mock<ToolExecutor>(), memoryFactory: vi.fn() },
	);
	return agent.declaredTools.find((tool) => tool.name === 'search_docs');
}

function watchWrites(provider: AgentJsonVectorStoreConfig['provider']) {
	const backend = {
		pinecone: PineconeVectorStore,
		qdrant: QdrantVectorStore,
		supabase: SupabaseVectorStore,
		postgres: PgVectorStore,
	}[provider];
	const failWrite = () => {
		throw new Error('Unexpected vector-store write');
	};
	return [
		vi.spyOn(VectorStore.prototype, 'addDocuments').mockImplementation(failWrite),
		vi.spyOn(VectorStore.prototype, 'deleteDocuments').mockImplementation(failWrite),
		vi.spyOn(backend.prototype, 'upsert').mockImplementation(failWrite),
		vi.spyOn(backend.prototype, 'delete').mockImplementation(failWrite),
	];
}

function watchHttpWrites(scope: nock.Scope, readPostPaths: string[]) {
	const write = vi.fn<() => nock.ReplyFnResult>(() => [
		400,
		{ message: 'Unexpected vector-store write' },
	]);
	scope.put(/.*/).query(true).reply(write);
	scope.patch(/.*/).query(true).reply(write);
	scope.delete(/.*/).query(true).reply(write);
	scope
		.post((uri) => !readPostPaths.includes(uri.split('?')[0]))
		.query(true)
		.reply(write);
	return write;
}

function mockProvider(provider: AgentJsonVectorStoreConfig['provider']) {
	if (provider === 'postgres') {
		const read = vi
			.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>()
			.mockResolvedValue({ rows: [] });
		vi.spyOn(Pool.prototype, 'query').mockImplementation(read);
		vi.spyOn(Pool.prototype, 'end').mockResolvedValue(undefined);
		return {
			read,
			writes: [],
			fail: () => read.mockRejectedValue(new Error('Provider unavailable')),
		};
	}

	const read = vi.fn<() => nock.ReplyFnResult>();
	switch (provider) {
		case 'pinecone': {
			const control = nock('https://api.pinecone.io').persist();
			control.get('/indexes/documents').reply(200, {
				name: 'documents',
				dimension: 2,
				host: 'documents.svc.pinecone.example',
			});
			const data = nock('https://documents.svc.pinecone.example').persist();
			data.post('/describe_index_stats').reply(200, { namespaces: { docs: { recordCount: 1 } } });
			data.post('/query').reply(read);
			read.mockReturnValue([200, { matches: [], namespace: 'docs' }]);
			return {
				read,
				writes: [
					watchHttpWrites(control, []),
					watchHttpWrites(data, ['/query', '/describe_index_stats']),
				],
				fail: () => read.mockReturnValue([400, { message: 'Provider unavailable' }]),
			};
		}
		case 'qdrant': {
			const scope = nock('http://qdrant.example:6333').persist();
			scope.get('/').reply(200, { version: '1.19.0' });
			scope.get('/collections/documents').reply(200, {
				result: { config: { params: { vectors: { size: 2 } } } },
				status: 'ok',
			});
			scope.post('/collections/documents/points/query').reply(read);
			read.mockReturnValue([200, { result: { points: [] }, status: 'ok' }]);
			return {
				read,
				writes: [watchHttpWrites(scope, ['/collections/documents/points/query'])],
				fail: () => read.mockReturnValue([400, { status: { error: 'Provider unavailable' } }]),
			};
		}
		case 'supabase': {
			const scope = nock('https://supabase.example').persist();
			scope.post('/rest/v1/rpc/match_documents').query(true).reply(read);
			read.mockReturnValue([200, []]);
			return {
				read,
				writes: [watchHttpWrites(scope, ['/rest/v1/rpc/match_documents'])],
				fail: () => read.mockReturnValue([400, { message: 'Provider unavailable' }]),
			};
		}
	}
}

describe.each(configs)('$provider read-only access', (config) => {
	const credentialProvider = mock<CredentialProvider>();
	let writes: ReturnType<typeof watchWrites>;
	let provider: ReturnType<typeof mockProvider>;

	beforeEach(() => {
		writes = watchWrites(config.provider);
		provider = mockProvider(config.provider);
		const storeCredentials = {
			pinecone: { apiKey: 'store-secret' },
			qdrant: { apiKey: 'store-secret', qdrantUrl: 'http://qdrant.example:6333' },
			supabase: { host: 'https://supabase.example', serviceRole: 'store-secret' },
			postgres: { host: 'db.example', password: 'store-secret' },
		};
		credentialProvider.resolve.mockImplementation(async (id) =>
			id === 'embedding-credential'
				? { apiKey: 'embedding-secret' }
				: storeCredentials[config.provider],
		);
		const setEmbeddingModel = VectorStore.prototype.embeddingModel;
		vi.spyOn(VectorStore.prototype, 'embeddingModel').mockImplementation(function (
			this: VectorStore,
		) {
			return setEmbeddingModel.call(this, embeddingModel);
		});
	});

	afterEach(() => {
		nock.cleanAll();
		// Assert calls as well as rejecting writes: compatibility checks can catch errors.
		for (const write of [...writes, ...provider.writes]) expect(write).not.toHaveBeenCalled();
		if (config.provider === 'postgres') {
			for (const [sql] of provider.read.mock.calls) expect(sql).toMatch(/^SELECT\b/);
		}
	});

	it('constructs and runs the search tool using only reads', async () => {
		const tool = await buildSearchTool(config, credentialProvider);

		await expect(tool?.handler?.({ query: 'refund policy' }, {})).resolves.toEqual({ results: [] });
		expect(provider.read).toHaveBeenCalledTimes(1);
	});

	it('tests the connection using only reads', async () => {
		const service = new VectorStoreConnectionTestService();

		await expect(service.testConnection(config, credentialProvider)).resolves.toEqual({
			success: true,
		});
		expect(provider.read).toHaveBeenCalledTimes(1);
	});

	if (config.provider === 'supabase') {
		it('reports a failed connection without writing', async () => {
			provider.fail();
			const service = new VectorStoreConnectionTestService();

			await expect(service.testConnection(config, credentialProvider)).resolves.toEqual({
				success: false,
				message: expect.any(String),
			});
			expect(provider.read).toHaveBeenCalledTimes(1);
		});

		it('propagates a failed search without writing', async () => {
			provider.fail();
			const tool = await buildSearchTool(config, credentialProvider);

			await expect(tool?.handler?.({ query: 'refund policy' }, {})).rejects.toThrow();
			expect(provider.read).toHaveBeenCalledTimes(1);
		});
	}
});
