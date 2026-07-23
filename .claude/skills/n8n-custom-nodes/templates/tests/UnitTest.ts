/**
 * TEMPLATE: Unit Test for Programmatic Node
 *
 * Tests the execute() method with mocked IExecuteFunctions.
 * Uses jest-mock-extended for deep mocking of n8n interfaces.
 * Tests should cover: happy path, error handling, continueOnFail,
 * all operations, edge cases, and binary data.
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceName__     → Your service internal name (camelCase)
 */
import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { __ServiceName__ } from '../__ServiceName__.node';
import * as GenericFunctions from '../GenericFunctions';

describe('__ServiceName__ Node', () => {
	let node: __ServiceName__;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const apiRequestSpy = jest.spyOn(
		GenericFunctions,
		'__serviceName__ApiRequest',
	);
	const apiRequestAllSpy = jest.spyOn(
		GenericFunctions,
		'__serviceName__ApiRequestAllItems',
	);

	beforeEach(() => {
		node = new __ServiceName__();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		jest.clearAllMocks();

		// Default mocks that every test needs
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(
			mock<INode>({
				id: 'test-node-id',
				name: 'Test Node',
				type: 'n8n-nodes-base.__serviceName__',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Item Resource', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item'); // resource
		});

		describe('Create Operation', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('create'); // operation
			});

			it('should create an item with required fields', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('Test Item')  // name
					.mockReturnValueOnce({});           // additionalFields

				apiRequestSpy.mockResolvedValue({
					id: '123',
					name: 'Test Item',
					createdAt: '2024-01-01T00:00:00Z',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual({
					id: '123',
					name: 'Test Item',
					createdAt: '2024-01-01T00:00:00Z',
				});
				expect(result[0][0].pairedItem).toEqual({ item: 0 });
				expect(apiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/items',
					{ name: 'Test Item' },
				);
			});

			it('should create an item with additional fields', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('Test Item')                        // name
					.mockReturnValueOnce({ description: 'A test item' });    // additionalFields

				apiRequestSpy.mockResolvedValue({
					id: '123',
					name: 'Test Item',
					description: 'A test item',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(apiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/items',
					{ name: 'Test Item', description: 'A test item' },
				);
				expect(result[0][0].json).toHaveProperty('description', 'A test item');
			});
		});

		describe('Get Operation', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('get'); // operation
			});

			it('should get an item by ID', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('item-123'); // itemId

				apiRequestSpy.mockResolvedValue({
					id: 'item-123',
					name: 'Existing Item',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toEqual({
					id: 'item-123',
					name: 'Existing Item',
				});
				expect(apiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/items/item-123',
				);
			});
		});

		describe('Get Many Operation', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('getAll'); // operation
			});

			it('should return all items when returnAll is true', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(true); // returnAll

				const mockItems = [
					{ id: '1', name: 'Item 1' },
					{ id: '2', name: 'Item 2' },
				];
				apiRequestAllSpy.mockResolvedValue(mockItems);

				mockExecuteFunctions.helpers.constructExecutionMetaData
					.mockImplementation((items) => items as never);
				mockExecuteFunctions.helpers.returnJsonArray
					.mockReturnValue(
						mockItems.map((item) => ({ json: item })) as never,
					);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0]).toHaveLength(2);
				expect(apiRequestAllSpy).toHaveBeenCalledWith(
					'data',
					'GET',
					'/items',
				);
			});

			it('should respect limit when returnAll is false', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(false)  // returnAll
					.mockReturnValueOnce(10);    // limit

				apiRequestSpy.mockResolvedValue({
					data: [{ id: '1', name: 'Item 1' }],
				});

				mockExecuteFunctions.helpers.constructExecutionMetaData
					.mockImplementation((items) => items as never);
				mockExecuteFunctions.helpers.returnJsonArray
					.mockReturnValue([{ json: { id: '1', name: 'Item 1' } }] as never);

				await node.execute.call(mockExecuteFunctions);

				expect(apiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/items',
					{},
					{ limit: 10 },
				);
			});
		});

		describe('Update Operation', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('update'); // operation
			});

			it('should update an item', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('item-123')                    // itemId
					.mockReturnValueOnce({ name: 'Updated Name' });     // updateFields

				apiRequestSpy.mockResolvedValue({
					id: 'item-123',
					name: 'Updated Name',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toEqual({
					id: 'item-123',
					name: 'Updated Name',
				});
				expect(apiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/items/item-123',
					{ name: 'Updated Name' },
				);
			});

			it('should throw when no update fields are provided', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('item-123')  // itemId
					.mockReturnValueOnce({});          // updateFields (empty)

				mockExecuteFunctions.continueOnFail.mockReturnValue(false);

				await expect(
					node.execute.call(mockExecuteFunctions),
				).rejects.toThrow(NodeOperationError);
			});
		});

		describe('Delete Operation', () => {
			it('should delete an item', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('delete')    // operation
					.mockReturnValueOnce('item-123'); // itemId

				apiRequestSpy.mockResolvedValue({});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toEqual({
					success: true,
					id: 'item-123',
				});
				expect(apiRequestSpy).toHaveBeenCalledWith(
					'DELETE',
					'/items/item-123',
				);
			});
		});
	});

	describe('Error Handling', () => {
		it('should return error in json when continueOnFail is true', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')      // resource
				.mockReturnValueOnce('create')    // operation
				.mockReturnValueOnce('Test')      // name
				.mockReturnValueOnce({});          // additionalFields

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			apiRequestSpy.mockRejectedValue(new Error('API Error'));

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ error: 'API Error' });
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});

		it('should throw when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')      // resource
				.mockReturnValueOnce('create')    // operation
				.mockReturnValueOnce('Test')      // name
				.mockReturnValueOnce({});          // additionalFields

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			apiRequestSpy.mockRejectedValue(new Error('API Error'));

			await expect(
				node.execute.call(mockExecuteFunctions),
			).rejects.toThrow('API Error');
		});
	});

	describe('Multiple Items', () => {
		it('should process multiple input items', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: {} },
				{ json: {} },
			]);

			// Mock for item 0
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('id-1')
				// Mock for item 1
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('id-2');

			apiRequestSpy
				.mockResolvedValueOnce({ id: 'id-1', name: 'Item 1' })
				.mockResolvedValueOnce({ id: 'id-2', name: 'Item 2' });

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
			expect(result[0][1].pairedItem).toEqual({ item: 1 });
		});
	});
});
