import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { UserError } from '@n8n/errors';
import type { INode, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { VectorStorePinecone } from './VectorStorePinecone.node';
import { assertPineconeIndexAcceptsVectors, getPineconeVectorStore } from '../shared/pinecone';
import { createInsertContext } from '../../../test/vectorStoreInsert';

vi.mock('../shared/pinecone', () => ({
	getPineconeVectorStore: vi.fn(),
	assertPineconeIndexAcceptsVectors: vi.fn(),
}));
vi.mock('@langchain/pinecone', () => ({ PineconeStore: { fromDocuments: vi.fn() } }));
vi.mock('@pinecone-database/pinecone', () => ({ Pinecone: vi.fn() }));

const nodeDef: INode = {
	id: '1',
	name: 'Pinecone Vector Store',
	typeVersion: 1.3,
	type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
	position: [0, 0],
	parameters: {},
};

describe('VectorStorePinecone', () => {
	const embeddings = mock<Embeddings>();

	it('offers the Text Field option in retrieve mode', () => {
		const options = new VectorStorePinecone().description.properties.find(
			(p) => p.name === 'options' && p.displayOptions?.show?.mode?.includes('retrieve'),
		) as INodeProperties & { options: INodeProperties[] };

		expect(options.options.map((o) => o.name)).toContain('textField');
	});

	it('passes the index, namespace and text field to the shared Pinecone store', async () => {
		vi.mocked(getPineconeVectorStore).mockResolvedValue(mock<VectorStore>());
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{
				mode: 'retrieve',
				pineconeIndex: { mode: 'list', value: 'docs' },
				options: { pineconeNamespace: 'ns', textField: 'body' },
			},
			nodeDef,
		) as Mocked<ISupplyDataFunctions>;
		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'key' });
		ctx.getInputConnectionData = vi.fn().mockResolvedValue(embeddings);

		await new VectorStorePinecone().supplyData.call(ctx, 0);

		expect(getPineconeVectorStore).toHaveBeenCalledWith(
			{ context: ctx, credentialType: 'pineconeApi', apiKey: 'key' },
			embeddings,
			{
				indexName: 'docs',
				namespace: 'ns',
				filter: undefined,
				textField: 'body',
			},
		);
	});

	const deleteAll = vi.fn();
	const insertParameters = {
		pineconeIndex: { mode: 'list', value: 'docs' },
		options: { pineconeNamespace: 'ns', clearNamespace: true },
	};
	const documents = [
		{ pageContent: 'first', metadata: {} },
		{ pageContent: 'second', metadata: {} },
	];

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(Pinecone).mockImplementation(function () {
			return mock<Pinecone>({
				listIndexes: vi.fn().mockResolvedValue({ indexes: [{ name: 'docs' }] }),
				Index: vi.fn().mockReturnValue({ namespace: () => ({ deleteAll }) }),
			});
		});
	});

	it.each([1, 1.1])('clears the namespace once with version %s', async (version) => {
		const ctx = createInsertContext(version, insertParameters, embeddings, documents, {
			apiKey: 'key',
		});

		await new VectorStorePinecone().execute.call(ctx);

		expect(deleteAll).toHaveBeenCalledExactlyOnceWith();
		expect(deleteAll).toHaveBeenCalledBefore(vi.mocked(PineconeStore.fromDocuments));
		expect(vi.mocked(PineconeStore.fromDocuments).mock.calls.map(([batch]) => batch)).toEqual(
			version === 1 ? [documents] : [[documents[0]], [documents[1]]],
		);
	});

	it('rejects an insert into a document index before it clears the namespace', async () => {
		vi.mocked(assertPineconeIndexAcceptsVectors).mockRejectedValue(
			new UserError('Inserting into a Pinecone index with a document schema is not supported yet'),
		);
		const ctx = createInsertContext(nodeDef.typeVersion, insertParameters, embeddings, documents, {
			apiKey: 'key',
		});

		await expect(new VectorStorePinecone().execute.call(ctx)).rejects.toThrow(
			'document schema is not supported yet',
		);
		expect(assertPineconeIndexAcceptsVectors).toHaveBeenCalledWith(
			{ context: ctx, credentialType: 'pineconeApi', apiKey: 'key' },
			'docs',
		);
		expect(deleteAll).not.toHaveBeenCalled();
		expect(PineconeStore.fromDocuments).not.toHaveBeenCalled();
	});
});
