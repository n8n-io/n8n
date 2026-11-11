import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { UserError } from 'n8n-workflow';
import type { IExecuteFunctions, INode, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { VectorStorePinecone } from './VectorStorePinecone.node';
import { assertPineconeIndexAcceptsVectors, getPineconeVectorStore } from '../shared/pinecone';

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

		expect(getPineconeVectorStore).toHaveBeenCalledWith(embeddings, {
			apiKey: 'key',
			indexName: 'docs',
			namespace: 'ns',
			filter: undefined,
			textField: 'body',
		});
	});

	it('rejects an insert into a document index before it clears the namespace', async () => {
		const deleteAll = vi.fn();
		vi.mocked(Pinecone).mockImplementation(function () {
			return {
				listIndexes: vi.fn().mockResolvedValue({ indexes: [{ name: 'docs' }] }),
				Index: vi.fn().mockReturnValue({ namespace: () => ({ deleteAll }) }),
			} as never;
		});
		vi.mocked(assertPineconeIndexAcceptsVectors).mockRejectedValue(
			new UserError('Inserting into a Pinecone index with a document schema is not supported yet'),
		);
		const ctx = createMockExecuteFunction<IExecuteFunctions>(
			{
				mode: 'insert',
				pineconeIndex: { mode: 'list', value: 'docs' },
				options: { pineconeNamespace: 'ns', clearNamespace: true },
			},
			nodeDef,
		) as Mocked<IExecuteFunctions>;
		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'key' });
		ctx.getInputData = vi.fn().mockReturnValue([{ json: {} }]);
		ctx.getInputConnectionData = vi
			.fn()
			.mockResolvedValueOnce(embeddings)
			.mockResolvedValueOnce([{ pageContent: 'hello', metadata: {} }]);
		ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(undefined);
		ctx.logger = mock<IExecuteFunctions['logger']>();
		ctx.logAiEvent = vi.fn();

		await expect(new VectorStorePinecone().execute.call(ctx)).rejects.toThrow(
			'document schema is not supported yet',
		);
		expect(assertPineconeIndexAcceptsVectors).toHaveBeenCalledWith('key', 'docs');
		expect(deleteAll).not.toHaveBeenCalled();
		expect(PineconeStore.fromDocuments).not.toHaveBeenCalled();
	});
});
