import { Milvus } from '@langchain/community/vectorstores/milvus';
import type { Embeddings } from '@langchain/core/embeddings';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { mock } from 'vitest-mock-extended';

import { VectorStoreMilvus } from './VectorStoreMilvus.node';
import { createInsertContext } from '../../../test/vectorStoreInsert';

vi.mock('@langchain/community/vectorstores/milvus', () => ({ Milvus: { fromDocuments: vi.fn() } }));
vi.mock('@zilliz/milvus2-sdk-node', () => ({ MilvusClient: vi.fn() }));

it.each([1, 1.1])('drops the collection once before inserting with version %s', async (version) => {
	vi.resetAllMocks();
	const dropCollection = vi.fn();
	vi.mocked(MilvusClient).mockImplementation(function () {
		return mock<MilvusClient>({ dropCollection });
	});
	const documents = [
		{ pageContent: 'first', metadata: {} },
		{ pageContent: 'second', metadata: {} },
	];
	const context = createInsertContext(
		version,
		{
			milvusCollection: { mode: 'list', value: 'docs' },
			options: { clearCollection: true },
		},
		mock<Embeddings>(),
		documents,
		{ baseUrl: 'localhost:19530', username: 'user', password: 'password' },
	);

	await new VectorStoreMilvus().execute.call(context);

	expect(dropCollection).toHaveBeenCalledExactlyOnceWith({ collection_name: 'docs' });
	expect(dropCollection).toHaveBeenCalledBefore(vi.mocked(Milvus.fromDocuments));
	expect(vi.mocked(Milvus.fromDocuments).mock.calls.map(([batch]) => batch)).toEqual(
		version === 1 ? [documents] : [[documents[0]], [documents[1]]],
	);
});
