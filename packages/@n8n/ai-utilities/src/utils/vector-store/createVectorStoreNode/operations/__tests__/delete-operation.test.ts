import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { NodeOperationError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { handleDeleteOperation } from '../delete-operation';

describe('handleDeleteOperation', () => {
	let context: MockProxy<IExecuteFunctions>;
	let vectorStore: MockProxy<VectorStore>;
	let parameters: Record<string, unknown>;

	const createArgs = (
		overrides: Partial<VectorStoreNodeConstructorArgs> = {},
	): VectorStoreNodeConstructorArgs => ({
		meta: {
			displayName: 'Test Store',
			name: 'testStore',
			description: 'Test',
			docsUrl: 'https://example.com',
			icon: 'file:test.svg',
			operationModes: ['load', 'insert', 'delete'],
		},
		sharedFields: [],
		getVectorStoreClient: vi.fn().mockResolvedValue(vectorStore),
		populateVectorStore: vi.fn(),
		releaseVectorStoreClient: vi.fn(),
		...overrides,
	});

	beforeEach(() => {
		vectorStore = mock<VectorStore>();
		parameters = { deleteBy: 'ids', deleteIds: 'id-1' };
		context = mock<IExecuteFunctions>();
		context.getNode.mockReturnValue(mock<INode>({ name: 'Test Store' }));
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation(
			(name: string, _itemIndex: number, fallback?: unknown) =>
				(parameters[name] ?? fallback) as NodeParameterValueType,
		);
	});

	it('should throw when the vector store does not turn on the delete mode', async () => {
		const args = createArgs();
		args.meta.operationModes = ['load', 'insert'];

		await expect(handleDeleteOperation(context, args)).rejects.toThrow(
			'Delete operation is not implemented for this Vector Store',
		);
	});

	describe('by IDs', () => {
		it('should delete the comma-separated IDs for each item', async () => {
			context.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
			parameters.deleteIds = ' id-1, ,id-2 ';
			const args = createArgs();

			const result = await handleDeleteOperation(context, args);

			expect(vectorStore.delete).toHaveBeenCalledTimes(2);
			expect(vectorStore.delete).toHaveBeenCalledWith({ ids: ['id-1', 'id-2'] });
			expect(result).toEqual([
				{
					json: { deleted: true, deleteBy: 'ids', ids: ['id-1', 'id-2'] },
					pairedItem: { item: 0 },
				},
				{
					json: { deleted: true, deleteBy: 'ids', ids: ['id-1', 'id-2'] },
					pairedItem: { item: 1 },
				},
			]);
			expect(args.releaseVectorStoreClient).toHaveBeenCalledTimes(2);
		});

		it('should accept an array of IDs from an expression', async () => {
			parameters.deleteIds = ['id-1', 7, { not: 'an id' }];

			await handleDeleteOperation(context, createArgs());

			expect(vectorStore.delete).toHaveBeenCalledWith({ ids: ['id-1', '7'] });
		});

		it.each([[''], [' , '], [[]], [42]])('should throw when the IDs value is %j', async (ids) => {
			parameters.deleteIds = ids;

			await expect(handleDeleteOperation(context, createArgs())).rejects.toThrow(
				'Enter at least one ID to delete',
			);
			expect(vectorStore.delete).not.toHaveBeenCalled();
		});
	});

	describe('by filter', () => {
		const parseDeleteFilter = vi.fn((filter: Record<string, unknown>) => ({ native: filter }));

		beforeEach(() => {
			parameters.deleteBy = 'filter';
			parseDeleteFilter.mockClear();
		});

		it('should delete with the native filter that the store parses from JSON', async () => {
			parameters.deleteFilter = '{ "author": "Elis" }';

			const result = await handleDeleteOperation(context, createArgs({ parseDeleteFilter }));

			expect(parseDeleteFilter).toHaveBeenCalledWith({ author: 'Elis' }, context, 0);
			expect(vectorStore.delete).toHaveBeenCalledWith({ filter: { native: { author: 'Elis' } } });
			expect(result).toEqual([
				{ json: { deleted: true, deleteBy: 'filter' }, pairedItem: { item: 0 } },
			]);
		});

		it('should accept a filter that is already an object', async () => {
			parameters.deleteFilter = { author: 'Elis' };

			await handleDeleteOperation(context, createArgs({ parseDeleteFilter }));

			expect(parseDeleteFilter).toHaveBeenCalledWith({ author: 'Elis' }, context, 0);
		});

		it('should throw a user error for a filter that is not valid JSON', async () => {
			parameters.deleteFilter = '{ not json';

			await expect(
				handleDeleteOperation(context, createArgs({ parseDeleteFilter })),
			).rejects.toThrow(UserError);
		});

		it.each([
			['[1]', 'The delete filter must be a JSON object'],
			['{}', 'Enter a filter to delete documents'],
		])('should throw for the filter %s', async (filter, message) => {
			parameters.deleteFilter = filter;

			await expect(
				handleDeleteOperation(context, createArgs({ parseDeleteFilter })),
			).rejects.toThrow(message);
			expect(vectorStore.delete).not.toHaveBeenCalled();
		});

		it('should throw when the store cannot parse a filter', async () => {
			parameters.deleteFilter = '{ "author": "Elis" }';

			await expect(handleDeleteOperation(context, createArgs())).rejects.toThrow(
				'Delete by "filter" is not supported for this Vector Store',
			);
		});
	});

	describe('store-specific delete', () => {
		it('should use the output of deleteDocuments and skip the default delete', async () => {
			parameters.deleteBy = 'collection';
			const deleteDocuments = vi.fn().mockResolvedValue({ deleted: true, collection: 'Books' });

			const result = await handleDeleteOperation(context, createArgs({ deleteDocuments }));

			expect(deleteDocuments).toHaveBeenCalledWith(context, vectorStore, 0);
			expect(vectorStore.delete).not.toHaveBeenCalled();
			expect(result).toEqual([
				{ json: { deleted: true, collection: 'Books' }, pairedItem: { item: 0 } },
			]);
		});

		it('should use the default delete when deleteDocuments returns nothing', async () => {
			const deleteDocuments = vi.fn().mockResolvedValue(undefined);

			await handleDeleteOperation(context, createArgs({ deleteDocuments }));

			expect(vectorStore.delete).toHaveBeenCalledWith({ ids: ['id-1'] });
		});
	});

	it('should release the vector store client when the delete fails', async () => {
		vectorStore.delete.mockRejectedValue(new NodeOperationError(mock<INode>(), 'boom'));
		const args = createArgs();

		await expect(handleDeleteOperation(context, args)).rejects.toThrow('boom');
		expect(args.releaseVectorStoreClient).toHaveBeenCalledWith(vectorStore);
	});

	it('should give the store embeddings that throw when the delete tries to embed', async () => {
		const args = createArgs();

		await handleDeleteOperation(context, args);

		const embeddings = vi.mocked(args.getVectorStoreClient).mock.calls[0][2] as Embeddings;
		await expect(embeddings.embedQuery('text')).rejects.toThrow(
			'Embeddings are not available in the delete mode',
		);
		await expect(embeddings.embedDocuments(['text'])).rejects.toThrow(
			'Embeddings are not available in the delete mode',
		);
	});
});
