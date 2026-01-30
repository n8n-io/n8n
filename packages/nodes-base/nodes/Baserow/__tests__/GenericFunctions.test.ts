/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeApiError } from 'n8n-workflow';

import {
	baserowApiRequest,
	baserowApiRequestAllItems,
	getAuthorizationHeader,
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
				'/endpoint',
				'testJwt',
			);
			expect(result).toEqual({ success: true });
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalled();
		});

		it('should throw NodeApiError on failure', async () => {
			mockExecuteFunctions.helpers.request.mockRejectedValue({ error: 'fail' });
			await expect(
				baserowApiRequest.call(mockExecuteFunctions, 'GET', '/endpoint', 'testJwt'),
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
				'/endpoint',
				'testJwt',
				{},
				{},
			);

			expect(result).toEqual([{ data: 1 }, { data: 2 }]);
		});
	});

	describe('getAuthorizationHeader', () => {
		it('should return JWT token when authType is basic', async () => {
			mockExecuteFunctions.helpers.request.mockResolvedValue({ token: 'mockToken' });

			const result = await getAuthorizationHeader.call(mockExecuteFunctions, {
				authType: 'basic',
				username: 'nathan@n8n.io',
				password: 'this-is-a-fake-password',
				host: 'https://api.baserow.io',
				token: '',
			});

			expect(result).toBe('JWT mockToken');
		});

		it('should return Token when authType is token', async () => {
			const result = await getAuthorizationHeader.call(mockExecuteFunctions, {
				authType: 'token',
				username: '',
				password: '',
				token: 'api_token_123',
				host: 'https://api.baserow.io',
			});

			expect(result).toBe('Token api_token_123');
		});

		it('should throw NodeApiError if basic auth request fails', async () => {
			mockExecuteFunctions.helpers.request.mockRejectedValue({ error: 'fail' });

			await expect(
				getAuthorizationHeader.call(mockExecuteFunctions, {
					authType: 'basic',
					username: 'nathan@n8n.io',
					password: 'this-is-a-fake-password',
					host: 'https://api.baserow.io',
					token: '',
				}),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw NodeApiError if token is missing for token auth', async () => {
			await expect(
				getAuthorizationHeader.call(mockExecuteFunctions, {
					authType: 'token',
					username: '',
					password: '',
					token: '',
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
