import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUserPools } from '../generalFunctions/dataFetching';

describe('searchUserPools', () => {
	const mockRequestWithAuthentication = jest.fn();

	const mockContext = {
		helpers: {
			requestWithAuthentication: mockRequestWithAuthentication,
		},
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should fetch user pools and return results', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			UserPools: [
				{ Name: 'PoolA', Id: '1' },
				{ Name: 'PoolB', Id: '2' },
			],
			NextToken: 'nextToken',
		});

		const response = await searchUserPools.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				baseURL: 'https://cognito-idp.us-east-1.amazonaws.com',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-amz-json-1.1',
					'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools',
				},
				body: JSON.stringify({
					MaxResults: 60,
					NextToken: undefined,
				}),
			}),
		);

		expect(response).toEqual({
			results: [
				{ name: 'PoolA', value: '1' },
				{ name: 'PoolB', value: '2' },
			],
			paginationToken: 'nextToken',
		});
	});

	it('should handle empty results when no user pools are found', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			UserPools: [],
			NextToken: 'nextToken',
		});

		const response = await searchUserPools.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				baseURL: 'https://cognito-idp.us-east-1.amazonaws.com',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-amz-json-1.1',
					'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools',
				},
				body: JSON.stringify({
					MaxResults: 60,
					NextToken: undefined,
				}),
			}),
		);

		expect(response).toEqual({
			results: [],
			paginationToken: 'nextToken',
		});
	});

	it('should handle pagination and fetch multiple pages of results', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockResolvedValueOnce({
			UserPools: [
				{ Name: 'User1', Id: '1' },
				{ Name: 'User2', Id: '2' },
			],
			NextToken: undefined,
		});

		const response = await searchUserPools.call(mockContext, '', 'prevTokenValue');

		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);

		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'aws',
			expect.objectContaining({
				body: JSON.stringify({
					MaxResults: 60,
					NextToken: 'prevTokenValue',
				}),
			}),
		);
		expect(response).toEqual({
			results: [
				{ name: 'User1', value: '1' },
				{ name: 'User2', value: '2' },
			],
			paginationToken: undefined,
		});
	});

	it('should return results sorted by name in ascending order', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			UserPools: [
				{ Name: 'ZebraPool', Id: '1' },
				{ Name: 'AlphaPool', Id: '2' },
				{ Name: 'BetaPool', Id: '3' },
			],
			NextToken: 'nextToken',
		});

		const response = await searchUserPools.call(mockContext);

		expect(response).toEqual({
			results: [
				{ name: 'AlphaPool', value: '2' },
				{ name: 'BetaPool', value: '3' },
				{ name: 'ZebraPool', value: '1' },
			],
			paginationToken: 'nextToken',
		});
	});
});
