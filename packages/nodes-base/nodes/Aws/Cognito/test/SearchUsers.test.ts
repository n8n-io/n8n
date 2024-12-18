import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUsers, awsRequest } from '../GenericFunctions';

interface AwsResponse {
	Users: Array<{ Username: string; Attributes: Array<{ Name: string; Value: string }> }>;
	NextToken?: string;
}

jest.mock('../GenericFunctions', () => ({
	awsRequest: jest.fn(),
	searchUsers: jest.fn(),
}));

describe('searchUsers', () => {
	const mockGetNodeParameter = jest.fn();
	const mockAwsRequest = awsRequest as jest.Mock;
	const mockSearchUsers = searchUsers as jest.Mock;

	const mockContext = {
		getNodeParameter: mockGetNodeParameter,
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGetNodeParameter.mockClear();
		mockAwsRequest.mockClear();
		mockSearchUsers.mockClear();
	});

	it('should throw an error if User Pool ID is missing', async () => {
		mockGetNodeParameter.mockReturnValueOnce(undefined);
		mockSearchUsers.mockRejectedValueOnce(new Error('User Pool ID is required to search users'));

		await expect(searchUsers.call(mockContext)).rejects.toThrow(
			'User Pool ID is required to search users',
		);
	});

	it('should make a POST request to search users and return results', async () => {
		mockGetNodeParameter.mockReturnValueOnce({ value: 'mockUserPoolId' });
		mockAwsRequest.mockResolvedValueOnce({
			Users: [
				{ Username: 'user1', Attributes: [{ Name: 'email', Value: 'user1@example.com' }] },
				{ Username: 'user2', Attributes: [{ Name: 'email', Value: 'user2@example.com' }] },
			],
			NextToken: 'nextTokenValue',
		});

		mockSearchUsers.mockImplementation(async (filter, nextToken) => {
			const awsResponse: AwsResponse = await mockAwsRequest({
				url: '',
				method: 'POST',
				headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
				body: JSON.stringify({
					UserPoolId: 'mockUserPoolId',
					MaxResults: 60,
					NextToken: nextToken,
				}),
			});

			const users = awsResponse.Users.map((user: any) => ({
				name: user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value || user.Username,
				value: user.Username,
			}));

			return {
				results: users,
				paginationToken: awsResponse.NextToken,
			};
		});

		const response = await searchUsers.call(mockContext, 'user1');

		expect(mockAwsRequest).toHaveBeenCalledWith({
			url: '',
			method: 'POST',
			headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
			body: JSON.stringify({
				UserPoolId: 'mockUserPoolId',
				MaxResults: 60,
				NextToken: undefined,
			}),
		});

		expect(response).toEqual({
			results: [
				{ name: 'user1@example.com', value: 'user1' },
				{ name: 'user2@example.com', value: 'user2' },
			],
			paginationToken: 'nextTokenValue',
		});
	});

	it('should handle pagination and return all results', async () => {
		mockAwsRequest
			.mockResolvedValueOnce({
				Users: [
					{ Username: 'user1', Attributes: [{ Name: 'email', Value: 'user1@example.com' }] },
					{ Username: 'user2', Attributes: [{ Name: 'email', Value: 'user2@example.com' }] },
				],
				NextToken: 'nextTokenValue',
			})
			.mockResolvedValueOnce({
				Users: [{ Username: 'user3', Attributes: [{ Name: 'email', Value: 'user3@example.com' }] }],
				NextToken: undefined,
			});

		mockGetNodeParameter.mockReturnValueOnce('mockUserPoolId');
		mockGetNodeParameter.mockReturnValueOnce(false);
		mockGetNodeParameter.mockReturnValueOnce(10);

		mockSearchUsers.mockImplementation(async () => {
			let allResults: any[] = [];
			let nextToken: string | undefined;
			do {
				const response: AwsResponse = await mockAwsRequest({
					url: '',
					method: 'POST',
					headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
					body: JSON.stringify({
						UserPoolId: 'mockUserPoolId',
						MaxResults: 60,
						NextToken: nextToken,
					}),
				});

				if (response.Users) {
					allResults = allResults.concat(
						response.Users.map((user: any) => ({
							name:
								user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value || user.Username,
							value: user.Username,
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

		const result = await searchUsers.call(mockContext, '');

		expect(mockAwsRequest).toHaveBeenCalledTimes(2);

		expect(result).toEqual({
			results: [
				{ name: 'user1@example.com', value: 'user1' },
				{ name: 'user2@example.com', value: 'user2' },
				{ name: 'user3@example.com', value: 'user3' },
			],
			paginationToken: undefined,
		});
	});

	it('should return empty results if no users are found', async () => {
		mockGetNodeParameter.mockReturnValueOnce('mockUserPoolId');
		mockAwsRequest.mockResolvedValueOnce({
			Users: [],
			NextToken: undefined,
		});

		mockSearchUsers.mockResolvedValueOnce({
			results: [],
			paginationToken: undefined,
		});

		const response = await searchUsers.call(mockContext);

		expect(response).toEqual({ results: [] });
	});
});
