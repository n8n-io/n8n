import nock from 'nock';

import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';
import { brandfetchApiRequest } from '../GenericFunctions'; // Adjust the import path as necessary

describe('brandfetchApiRequest', () => {
	const mockThis = {
		helpers: {
			requestWithAuthentication: jest.fn(),
		},
		getNodeParameter: jest.fn(),
		getNode: jest.fn(),
	} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should make a successful API request', async () => {
		const method = 'GET';
		const resource = '/test';
		const body = {};
		const qs = {};
		const uri = 'https://api.brandfetch.io/v2/test';
		const option = {};

		const mockResponse = { statusCode: 200, data: 'test data' };

		nock('https://api.brandfetch.io').get('/v2/test').reply(200, mockResponse);

		mockThis.helpers.requestWithAuthentication.mockResolvedValue(mockResponse);
		mockThis.getNodeParameter.mockReturnValue('logo');

		const response = await brandfetchApiRequest.call(
			mockThis,
			method,
			resource,
			body,
			qs,
			uri,
			option,
		);

		expect(response).toEqual(mockResponse);
		expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'brandfetchApi',
			expect.any(Object),
		);
	});

	it('should throw an error for non-200 status codes', async () => {
		const method = 'GET';
		const resource = '/brands/n8n.io';
		const body = {};
		const qs = {};
		const uri = 'https://api.brandfetch.io/v2/brands/n8n.io';
		const option = {};

		const mockErrorResponse = { statusCode: 400, message: 'Bad Request' };

		nock('https://api.brandfetch.io').get('/v2/brands/n8n.io').reply(400, mockErrorResponse);

		mockThis.helpers.requestWithAuthentication.mockResolvedValue(mockErrorResponse);
		mockThis.getNodeParameter.mockReturnValue('logo');

		await expect(
			brandfetchApiRequest.call(mockThis, method, resource, body, qs, uri, option),
		).rejects.toThrow(NodeApiError);
		expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'brandfetchApi',
			expect.any(Object),
		);
	});
});
