/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeApiError, requestPath, requestUrl } from 'n8n-workflow';

import {
	baserowApiRequest,
	baserowApiRequestAllItems,
	getJwtToken,
	getFieldNamesAndIds,
	toOptions,
	TableFieldMapper,
} from '../GenericFunctions';

describe('Baserow > GenericFunctions', () => {
	const mockExecuteFunctions: any = {
		helpers: {
			request: jest.fn(),
		},
		getCredentials: jest.fn().mockResolvedValue({
			username: 'nathan@n8n.io',
			password: 'this-is-a-fake-password',
			host: 'https://api.baserow.io',
		}),
		getNodeParameter: jest.fn(),
		getNode: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('baserowApiRequest', () => {
		it('should return data on success', async () => {
			mockExecuteFunctions.helpers.request.mockResolvedValue({ success: true });
			const result = await baserowApiRequest.call(
				mockExecuteFunctions,
				'GET',
				requestPath`/endpoint`,
				'testJwt',
			);
			expect(result).toEqual({ success: true });
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					uri: requestUrl`https://api.baserow.io/endpoint`,
				}),
			);
		});

		it('should throw NodeApiError on failure', async () => {
			mockExecuteFunctions.helpers.request.mockRejectedValue({ error: 'fail' });
			await expect(
				baserowApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/endpoint`, 'testJwt'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('baserowApiRequestAllItems', () => {
		it('should accumulate all pages', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(true) // returnAll
				.mockReturnValue(1000); // limit
			mockExecuteFunctions.helpers.request
				.mockResolvedValueOnce({ results: [{ data: 1 }], next: 'page2' })
				.mockResolvedValueOnce({ results: [{ data: 2 }], next: null });

			const result = await baserowApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				requestPath`/endpoint`,
				'testJwt',
				{},
				{},
			);

			expect(result).toEqual([{ data: 1 }, { data: 2 }]);
		});
	});

	describe('getJwtToken', () => {
		it('should return a token', async () => {
			mockExecuteFunctions.helpers.request.mockResolvedValue({ token: 'mockToken' });
			const result = await getJwtToken.call(mockExecuteFunctions, {
				username: 'nathan@n8n.io',
				password: 'this-is-a-fake-password',
				host: 'https://api.baserow.io',
			});
			expect(result).toBe('mockToken');
		});

		it('should throw NodeApiError if request fails', async () => {
			mockExecuteFunctions.helpers.request.mockRejectedValue({ error: 'fail' });
			await expect(
				getJwtToken.call(mockExecuteFunctions, {
					username: 'nathan@n8n.io',
					password: 'this-is-a-fake-password',
					host: 'https://api.baserow.io',
				}),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('getFieldNamesAndIds', () => {
		it('should return field names and ids', async () => {
			mockExecuteFunctions.helpers.request.mockResolvedValue([
				{ id: 1, name: 'field1' },
				{ id: 2, name: 'field2' },
			]);
			const result = await getFieldNamesAndIds.call(mockExecuteFunctions, '1', 'testJwt');
			expect(result).toEqual({
				names: ['field1', 'field2'],
				ids: ['field_1', 'field_2'],
			});
		});

		it('should encode the table ID in the request URL', async () => {
			mockExecuteFunctions.helpers.request.mockResolvedValue([]);
			await getFieldNamesAndIds.call(mockExecuteFunctions, '1/rows', 'testJwt');
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: requestUrl`https://api.baserow.io/api/database/fields/table/1%2Frows/`,
				}),
			);
		});

		it('should reject a table ID of ".." without a request', async () => {
			await expect(
				getFieldNamesAndIds.call(mockExecuteFunctions, '..', 'testJwt'),
			).rejects.toThrow();
			expect(mockExecuteFunctions.helpers.request).not.toHaveBeenCalled();
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
