import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUserPools, awsRequest } from '../GenericFunctions';

interface AwsResponse {
	UserPools: Array<{ Name: string; Id: string }>;
	NextToken?: string;
}

jest.mock('../GenericFunctions', () => ({
	awsRequest: jest.fn(),
	searchUserPools: jest.fn(),
}));

describe('searchUserPools', () => {
	const mockGetNodeParameter = jest.fn();
	const mockAwsRequest = awsRequest as jest.Mock;
	const mockSearchUserPools = searchUserPools as jest.Mock;

	const mockContext = {
		getNodeParameter: mockGetNodeParameter,
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGetNodeParameter.mockClear();
		mockAwsRequest.mockClear();
		mockSearchUserPools.mockClear();
	});

	it('should make a POST request to search user pools and return results', async () => {
		mockAwsRequest.mockResolvedValueOnce({
			UserPools: [
				{ Name: 'UserPool1', Id: 'userPoolId1' },
				{ Name: 'UserPool2', Id: 'userPoolId2' },
			],
			NextToken: 'nextTokenValue',
		});

		mockSearchUserPools.mockImplementation(async (filter, nextToken) => {
			const awsResponse: AwsResponse = await mockAwsRequest({
				url: '',
				method: 'POST',
				headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools' },
				body: JSON.stringify({
					MaxResults: 60,
					NextToken: nextToken,
				}),
			});

			const userPools = awsResponse.UserPools.map((pool: any) => ({
				name: pool.Name,
				value: pool.Id,
			}));

			return {
				results: userPools,
				paginationToken: awsResponse.NextToken,
			};
		});

		const response = await searchUserPools.call(mockContext, '');

		expect(mockAwsRequest).toHaveBeenCalledWith({
			url: '',
			method: 'POST',
			headers: {
				'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools',
			},
			body: JSON.stringify({
				MaxResults: 60,
				NextToken: undefined,
			}),
		});

		expect(response).toEqual({
			results: [
				{ name: 'UserPool1', value: 'userPoolId1' },
				{ name: 'UserPool2', value: 'userPoolId2' },
			],
			paginationToken: 'nextTokenValue',
		});
	});

	it('should handle pagination and return all results', async () => {
		mockAwsRequest
			.mockResolvedValueOnce({
				UserPools: [
					{ Name: 'UserPool1', Id: 'userPoolId1' },
					{ Name: 'UserPool2', Id: 'userPoolId2' },
				],
				NextToken: 'nextTokenValue',
			})
			.mockResolvedValueOnce({
				UserPools: [{ Name: 'UserPool3', Id: 'userPoolId3' }],
				NextToken: undefined,
			});

		mockGetNodeParameter.mockReturnValueOnce(false);
		mockGetNodeParameter.mockReturnValueOnce(10);
		mockSearchUserPools.mockImplementation(async () => {
			let allResults: any[] = [];
			let nextToken: string | undefined;
			do {
				const response: AwsResponse = await mockAwsRequest({
					url: '',
					method: 'POST',
					headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools' },
					body: JSON.stringify({
						MaxResults: 60,
						NextToken: nextToken,
					}),
				});

				if (response.UserPools) {
					allResults = allResults.concat(
						response.UserPools.map((pool: any) => ({
							name: pool.Name,
							value: pool.Id,
						})),
					);
				}

				nextToken = response.NextToken;
			} while (nextToken);

			return {
				results: allResults,
				paginationToken: nextToken,
			};
		});

		const result = await searchUserPools.call(mockContext, '');

		expect(mockAwsRequest).toHaveBeenCalledTimes(2);

		expect(result).toEqual({
			results: [
				{ name: 'UserPool1', value: 'userPoolId1' },
				{ name: 'UserPool2', value: 'userPoolId2' },
				{ name: 'UserPool3', value: 'userPoolId3' },
			],
			paginationToken: undefined,
		});
	});

	it('should return empty results if no user pools are found', async () => {
		mockAwsRequest.mockResolvedValueOnce({
			UserPools: [],
			NextToken: undefined,
		});

		mockSearchUserPools.mockResolvedValueOnce({
			results: [],
			paginationToken: undefined,
		});

		const response = await searchUserPools.call(mockContext);

		expect(response).toEqual({ results: [] });
	});
});
