/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeApiError } from 'n8n-workflow';

import {
	baserowApiRequest,
	baserowApiRequestAllItems,
	getFieldNamesAndIds,
	toOptions,
	TableFieldMapper,
} from '../GenericFunctions';

describe('Baserow > GenericFunctions', () => {
	const mockExecuteFunctions: any = {
		helpers: {
			requestWithAuthentication: jest.fn(),
		},
		getCredentials: jest.fn().mockResolvedValue({
			host: 'https://api.baserow.io',
		}),
		getNodeParameter: jest.fn(),
		getNode: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			host: 'https://api.baserow.io',
		});
	});

	describe('baserowApiRequest', () => {
		it('should return data on success', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
			});
			const result = await baserowApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/endpoint',
				'baserowApi',
			);
			expect(result).toEqual({ success: true });
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'baserowApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.baserow.io/endpoint',
				}),
			);
		});

		it('should throw NodeApiError on failure', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue({
				error: 'fail',
			});
			await expect(
				baserowApiRequest.call(mockExecuteFunctions, 'GET', '/endpoint', 'baserowApi'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('baserowApiRequestAllItems', () => {
		it('should accumulate all pages', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(true) // returnAll
				.mockReturnValue(1000); // limit
			mockExecuteFunctions.helpers.requestWithAuthentication
				.mockResolvedValueOnce({ results: [{ data: 1 }], next: 'page2' })
				.mockResolvedValueOnce({ results: [{ data: 2 }], next: null });

			const result = await baserowApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/endpoint',
				'baserowApi',
				{},
				{},
			);

			expect(result).toEqual([{ data: 1 }, { data: 2 }]);
		});
	});

	describe('getFieldNamesAndIds', () => {
		it('should return field names and ids', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue([
				{ id: 1, name: 'field1' },
				{ id: 2, name: 'field2' },
			]);
			const result = await getFieldNamesAndIds.call(mockExecuteFunctions, '1', 'baserowApi');
			expect(result).toEqual({
				names: ['field1', 'field2'],
				ids: ['field_1', 'field_2'],
			});
		});
	});

	describe('toOptions', () => {
		it('should map items to options', () => {
			const result = toOptions([
				{ id: 1, name: 'field1' },
				{ id: 2, name: 'field2' },
			]);
			expect(result).toEqual([
				{ name: 'field1', value: 1 },
				{ name: 'field2', value: 2 },
			]);
		});
	});

	describe('TableFieldMapper', () => {
		it('should create name-to-id and id-to-name mappings', () => {
			const mapper = new TableFieldMapper();
			mapper.createMappings([
				{ id: 1, name: 'field1' },
				{ id: 2, name: 'field2' },
			]);
			expect(mapper.nameToIdMapping).toEqual({
				field1: 'field_1',
				field2: 'field_2',
			});
			expect(mapper.idToNameMapping).toEqual({
				field_1: 'field1',
				field_2: 'field2',
			});
		});
	});
});
