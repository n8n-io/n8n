import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { VectorStoreNodeConstructorArgs } from '@n8n/ai-utilities';
import { mock } from 'vitest-mock-extended';

import { getPineconeVectorStore } from '../shared/pinecone';

const captured = vi.hoisted(() => ({ config: undefined as unknown }));

vi.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: unknown) => {
		captured.config = config;
		return class {};
	},
	metadataFilterField: {},
}));
vi.mock('../shared/pinecone', () => ({
	getPineconeVectorStore: vi.fn(),
	assertPineconeIndexAcceptsVectors: vi.fn(),
}));

import './ChatHubVectorStorePinecone.node';

describe('ChatHubVectorStorePinecone', () => {
	const config = () => captured.config as VectorStoreNodeConstructorArgs;
	const doc = {
		pageContent: 'Hello',
		metadata: { fileName: 'a.pdf', 'loc.pageNumber': 1, agentId: 'x', secret: 'y' },
	};

	it('searches by text and filters the metadata of text and vector searches', async () => {
		const store = {
			similaritySearchVectorWithScore: vi.fn().mockResolvedValue([[doc, 0.9]]),
			similaritySearchWithScore: vi.fn().mockResolvedValue([[doc, 0.8]]),
		};
		vi.mocked(getPineconeVectorStore).mockResolvedValue(store as unknown as VectorStore);
		const context = {
			additionalData: { userId: 'user-1' },
			getCredentials: vi
				.fn()
				.mockResolvedValue({ apiKey: 'key', pineconeIndex: 'idx', namespacePrefix: 'chat' }),
		};

		expect(config().searchByText).toBe(true);
		const result = await config().getVectorStoreClient(
			context as never,
			undefined,
			mock<Embeddings>(),
			0,
		);

		const expected = { fileName: 'a.pdf', 'loc.pageNumber': 1 };
		const [[viaVector]] = await result.similaritySearchVectorWithScore([1], 1);
		expect(viaVector.metadata).toEqual(expected);
		const [[viaText]] = await result.similaritySearchWithScore('hi', 1);
		expect(viaText.metadata).toEqual(expected);
	});
});
