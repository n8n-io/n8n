import type { Embeddings } from '@langchain/core/embeddings';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { UserError } from 'n8n-workflow';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { VectorStorePineconeInsert } from './VectorStorePineconeInsert.node';
import { assertPineconeIndexAcceptsVectors } from '../shared/pinecone';

vi.mock('../shared/pinecone', () => ({ assertPineconeIndexAcceptsVectors: vi.fn() }));
vi.mock('@langchain/pinecone', () => ({ PineconeStore: { fromDocuments: vi.fn() } }));
vi.mock('@pinecone-database/pinecone', () => ({ Pinecone: vi.fn() }));

const nodeDef: INode = {
	id: '1',
	name: 'Pinecone: Insert',
	typeVersion: 1,
	type: '@n8n/n8n-nodes-langchain.vectorStorePineconeInsert',
	position: [0, 0],
	parameters: {},
};

describe('VectorStorePineconeInsert', () => {
	it('rejects a document index before it clears the namespace', async () => {
		const deleteAll = vi.fn();
		vi.mocked(Pinecone).mockImplementation(function () {
			return { Index: vi.fn().mockReturnValue({ namespace: () => ({ deleteAll }) }) } as never;
		});
		vi.mocked(assertPineconeIndexAcceptsVectors).mockRejectedValue(
			new UserError('Inserting into a Pinecone index with a document schema is not supported yet'),
		);
		const ctx = createMockExecuteFunction<IExecuteFunctions>(
			{
				pineconeNamespace: 'ns',
				pineconeIndex: { mode: 'list', value: 'docs' },
				clearNamespace: true,
			},
			nodeDef,
		) as Mocked<IExecuteFunctions>;
		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'key' });
		ctx.getInputData = vi.fn().mockReturnValue([{ json: {} }]);
		ctx.getInputConnectionData = vi
			.fn()
			.mockResolvedValueOnce([{ pageContent: 'hello', metadata: {} }])
			.mockResolvedValueOnce(mock<Embeddings>());
		ctx.logger = mock<IExecuteFunctions['logger']>();

		await expect(new VectorStorePineconeInsert().execute.call(ctx)).rejects.toThrow(
			'document schema is not supported yet',
		);
		expect(assertPineconeIndexAcceptsVectors).toHaveBeenCalledWith('key', 'docs');
		expect(deleteAll).not.toHaveBeenCalled();
		expect(PineconeStore.fromDocuments).not.toHaveBeenCalled();
	});
});
