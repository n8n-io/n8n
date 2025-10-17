import { mockDeep } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	IHttpRequestOptions,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { bitbucketApiRequest, bitbucketApiRequestAllItems } from '../GenericFunctions';

describe('Bitbucket GenericFunctions', () => {
	describe('bitbucketApiRequest', () => {
		const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		const mockHookFunctions = mockDeep<IHookFunctions>();
		const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();

		const mockNode: INode = {
			id: 'test-node-id',
			name: 'Bitbucket Test',
			type: 'n8n-nodes-base.bitbucket',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {},
		};

		beforeEach(() => {
			jest.resetAllMocks();
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockHookFunctions.getNode.mockReturnValue(mockNode);
			mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);
		});

		describe('with access token authentication', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('accessToken');
				mockHookFunctions.getNodeParameter.mockReturnValue('accessToken');
				mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('accessToken');
			});

			it('should make successful API request with access token', async () => {
				const mockResponse = { data: 'test response' };
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

				const result = await bitbucketApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/repositories',
					{},
					{},
				);

				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
					'bitbucketAccessTokenApi',
					{
						method: 'GET',
						qs: {},
						url: 'https://api.bitbucket.org/2.0/repositories',
						json: true,
					},
				);
				expect(result).toEqual(mockResponse);
			});

			it('should handle custom URI with access token', async () => {
				const mockResponse = { data: 'test response' };
				const customUri = 'https://custom.api.bitbucket.org/2.0/custom';
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

				await bitbucketApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/repositories',
					{ name: 'test' },
					{ page: 1 },
					customUri,
				);

				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
					'bitbucketAccessTokenApi',
					{
						method: 'POST',
						qs: { page: 1 },
						body: { name: 'test' },
						url: customUri,
						json: true,
					},
				);
			});

			it('should remove empty body with access token', async () => {
				const mockResponse = { data: 'test response' };
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

				await bitbucketApiRequest.call(mockExecuteFunctions, 'GET', '/repositories');

				const expectedOptions: IHttpRequestOptions = {
					method: 'GET',
					qs: {},
					url: 'https://api.bitbucket.org/2.0/repositories',
					json: true,
				};

				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
					'bitbucketAccessTokenApi',
					expectedOptions,
				);
			});

			it('should work with hook functions', async () => {
				const mockResponse = { values: [] };
				mockHookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

				const result = await bitbucketApiRequest.call(mockHookFunctions, 'GET', '/workspaces');

				expect(mockHookFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
					'bitbucketAccessTokenApi',
					{
						method: 'GET',
						qs: {},
						url: 'https://api.bitbucket.org/2.0/workspaces',
						json: true,
					},
				);
				expect(result).toEqual(mockResponse);
			});

			it('should work with load options functions', async () => {
				const mockResponse = { values: [] };
				mockLoadOptionsFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(
					mockResponse,
				);

				const result = await bitbucketApiRequest.call(
					mockLoadOptionsFunctions,
					'GET',
					'/hook_events/workspace',
				);

				expect(mockLoadOptionsFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
					'bitbucketAccessTokenApi',
					{
						method: 'GET',
						qs: {},
						url: 'https://api.bitbucket.org/2.0/hook_events/workspace',
						json: true,
					},
				);
				expect(result).toEqual(mockResponse);
			});
		});

		describe('with password authentication', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('password');
				mockHookFunctions.getNodeParameter.mockReturnValue('password');
				mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('password');
			});

			it('should make successful API request with password', async () => {
				const mockCredentials = {
					username: 'testuser',
					appPassword: 'testpassword',
				};
				const mockResponse = { data: 'test response' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

				const result = await bitbucketApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/repositories',
					{},
					{},
				);

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('bitbucketApi');
				expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
					method: 'GET',
					auth: {
						user: 'testuser',
						password: 'testpassword',
					},
					qs: {},
					uri: 'https://api.bitbucket.org/2.0/repositories',
					json: true,
				});
				expect(result).toEqual(mockResponse);
			});

			it('should handle custom URI with password', async () => {
				const mockCredentials = {
					username: 'testuser',
					appPassword: 'testpassword',
				};
				const mockResponse = { data: 'test response' };
				const customUri = 'https://custom.api.bitbucket.org/2.0/custom';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

				await bitbucketApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/repositories',
					{ name: 'test' },
					{ page: 1 },
					customUri,
				);

				expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
					method: 'POST',
					auth: {
						user: 'testuser',
						password: 'testpassword',
					},
					qs: { page: 1 },
					body: { name: 'test' },
					uri: customUri,
					json: true,
				});
			});

			it('should remove empty body with password', async () => {
				const mockCredentials = {
					username: 'testuser',
					appPassword: 'testpassword',
				};
				const mockResponse = { data: 'test response' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

				await bitbucketApiRequest.call(mockExecuteFunctions, 'GET', '/repositories');

				const expectedOptions: IRequestOptions = {
					method: 'GET',
					auth: {
						user: 'testuser',
						password: 'testpassword',
					},
					qs: {},
					uri: 'https://api.bitbucket.org/2.0/repositories',
					json: true,
				};

				expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(expectedOptions);
			});
		});

		describe('error handling', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('accessToken');
			});

			it('should throw NodeApiError when request fails', async () => {
				const mockError = new Error('API request failed');
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(mockError);

				await expect(
					bitbucketApiRequest.call(mockExecuteFunctions, 'GET', '/repositories'),
				).rejects.toThrow(NodeApiError);

				expect(mockExecuteFunctions.getNode).toHaveBeenCalled();
			});

			it('should preserve original error details in NodeApiError', async () => {
				const mockError = {
					message: 'Unauthorized',
					statusCode: 401,
					response: { body: { error: 'Invalid credentials' } },
				};
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(mockError);

				await expect(
					bitbucketApiRequest.call(mockExecuteFunctions, 'GET', '/repositories'),
				).rejects.toThrow(NodeApiError);
			});
		});
	});

	describe('bitbucketApiRequestAllItems', () => {
		const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		const mockNode: INode = {
			id: 'test-node-id',
			name: 'Bitbucket Test',
			type: 'n8n-nodes-base.bitbucket',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {},
		};

		beforeEach(() => {
			jest.resetAllMocks();
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockReturnValue('accessToken');
		});

		it('should handle single page response', async () => {
			const mockResponse = {
				values: [{ id: 1 }, { id: 2 }],
				// no 'next' property means single page
			};

			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			const result = await bitbucketApiRequestAllItems.call(
				mockExecuteFunctions,
				'values',
				'GET',
				'/repositories',
			);

			expect(result).toEqual([{ id: 1 }, { id: 2 }]);
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should handle multiple pages', async () => {
			const firstPageResponse = {
				values: [{ id: 1 }, { id: 2 }],
				next: 'https://api.bitbucket.org/2.0/repositories?page=2',
			};

			const secondPageResponse = {
				values: [{ id: 3 }, { id: 4 }],
				next: 'https://api.bitbucket.org/2.0/repositories?page=3',
			};

			const thirdPageResponse = {
				values: [{ id: 5 }],
				// no 'next' property means last page
			};

			mockExecuteFunctions.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce(firstPageResponse)
				.mockResolvedValueOnce(secondPageResponse)
				.mockResolvedValueOnce(thirdPageResponse);

			const result = await bitbucketApiRequestAllItems.call(
				mockExecuteFunctions,
				'values',
				'GET',
				'/repositories',
			);

			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);

			// Check that subsequent calls use the 'next' URL
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				'bitbucketAccessTokenApi',
				{
					method: 'GET',
					qs: {},
					url: 'https://api.bitbucket.org/2.0/repositories?page=2',
					json: true,
				},
			);

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
				3,
				'bitbucketAccessTokenApi',
				{
					method: 'GET',
					qs: {},
					url: 'https://api.bitbucket.org/2.0/repositories?page=3',
					json: true,
				},
			);
		});

		it('should handle empty pages', async () => {
			const mockResponse = {
				values: [],
			};

			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			const result = await bitbucketApiRequestAllItems.call(
				mockExecuteFunctions,
				'values',
				'GET',
				'/repositories',
			);

			expect(result).toEqual([]);
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should pass through body and query parameters', async () => {
			const mockResponse = {
				values: [{ id: 1 }],
			};

			const body = { name: 'test-repo' };
			const query = { role: 'admin' };

			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			await bitbucketApiRequestAllItems.call(
				mockExecuteFunctions,
				'values',
				'POST',
				'/repositories',
				body,
				query,
			);

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'bitbucketAccessTokenApi',
				{
					method: 'POST',
					qs: query,
					body,
					url: 'https://api.bitbucket.org/2.0/repositories',
					json: true,
				},
			);
		});

		it('should work with different property names', async () => {
			const mockResponse = {
				items: [{ id: 1 }, { id: 2 }],
			};

			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			const result = await bitbucketApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/custom-endpoint',
			);

			expect(result).toEqual([{ id: 1 }, { id: 2 }]);
		});

		it('should handle errors during pagination', async () => {
			const firstPageResponse = {
				values: [{ id: 1 }],
				next: 'https://api.bitbucket.org/2.0/repositories?page=2',
			};

			const mockError = new Error('Network error');

			mockExecuteFunctions.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce(firstPageResponse)
				.mockRejectedValueOnce(mockError);

			await expect(
				bitbucketApiRequestAllItems.call(mockExecuteFunctions, 'values', 'GET', '/repositories'),
			).rejects.toThrow(NodeApiError);
		});

		it('should work with hook functions', async () => {
			const mockHookFunctions = mockDeep<IHookFunctions>();
			mockHookFunctions.getNode.mockReturnValue(mockNode);
			mockHookFunctions.getNodeParameter.mockReturnValue('accessToken');

			const mockResponse = {
				values: [{ event: 'repo:push' }],
			};

			mockHookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			const result = await bitbucketApiRequestAllItems.call(
				mockHookFunctions,
				'values',
				'GET',
				'/hook_events/repository',
			);

			expect(result).toEqual([{ event: 'repo:push' }]);
		});

		it('should work with load options functions', async () => {
			const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
			mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);
			mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('accessToken');

			const mockResponse = {
				values: [{ slug: 'workspace1' }],
			};

			mockLoadOptionsFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(
				mockResponse,
			);

			const result = await bitbucketApiRequestAllItems.call(
				mockLoadOptionsFunctions,
				'values',
				'GET',
				'/workspaces',
			);

			expect(result).toEqual([{ slug: 'workspace1' }]);
		});
	});
});
