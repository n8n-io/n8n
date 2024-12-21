import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchGroups, awsRequest } from '../GenericFunctions';

interface AwsResponse {
	Groups: Array<{ GroupName: string }>;
	NextToken?: string;
}

jest.mock('../GenericFunctions', () => ({
	awsRequest: jest.fn(),
	searchGroups: jest.fn(),
}));

describe('searchGroups', () => {
	const mockGetNodeParameter = jest.fn();
	const mockAwsRequest = awsRequest as jest.Mock;
	const mockSearchGroups = searchGroups as jest.Mock;

	const mockContext = {
		getNodeParameter: mockGetNodeParameter,
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGetNodeParameter.mockClear();
		mockAwsRequest.mockClear();
		mockSearchGroups.mockClear();
	});

	it('should throw an error if User Pool ID is missing', async () => {
		mockGetNodeParameter.mockReturnValueOnce(undefined);
		mockSearchGroups.mockRejectedValueOnce(new Error('User Pool ID is required to search groups'));

		await expect(searchGroups.call(mockContext)).rejects.toThrow(
			'User Pool ID is required to search groups',
		);
	});

	it('should make a POST request to search groups and return results', async () => {
		mockGetNodeParameter.mockReturnValueOnce('mockUserPoolId');
		mockAwsRequest.mockResolvedValueOnce({
			Groups: [{ GroupName: 'Admin' }, { GroupName: 'User' }],
			NextToken: 'nextTokenValue',
		});

		mockSearchGroups.mockImplementation(async (filter, nextToken) => {
			const awsResponse: AwsResponse = await mockAwsRequest({
				url: '',
				method: 'POST',
				headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
				body: JSON.stringify({
					UserPoolId: 'mockUserPoolId',
					MaxResults: 60,
					NextToken: nextToken,
				}),
			});

			const groups = awsResponse.Groups.map((group: any) => ({
				name: group.GroupName,
				value: group.GroupName,
			}));

			return {
				results: groups,
				paginationToken: awsResponse.NextToken,
			};
		});

		const response = await searchGroups.call(mockContext, 'Admin');

		expect(mockAwsRequest).toHaveBeenCalledWith({
			url: '',
			method: 'POST',
			headers: {
				'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups',
			},
			body: JSON.stringify({
				UserPoolId: 'mockUserPoolId',
				MaxResults: 60,
				NextToken: undefined,
			}),
		});

		expect(response).toEqual({
			results: [
				{ name: 'Admin', value: 'Admin' },
				{ name: 'User', value: 'User' },
			],
			paginationToken: 'nextTokenValue',
		});
	});

	it('should handle pagination and return all results', async () => {
		// Mock the response for the first page
		mockAwsRequest
			.mockResolvedValueOnce({
				Groups: [{ GroupName: 'Admin' }, { GroupName: 'User' }],
				NextToken: 'nextTokenValue',
			})
			// Mock the response for the second page
			.mockResolvedValueOnce({
				Groups: [{ GroupName: 'Manager' }],
				NextToken: undefined,
			});

		mockGetNodeParameter.mockReturnValueOnce('mockUserPoolId');
		mockGetNodeParameter.mockReturnValueOnce(false);
		mockGetNodeParameter.mockReturnValueOnce(10);

		// Simulate the actual logic in searchGroups:
		mockSearchGroups.mockImplementation(async () => {
			let allResults: any[] = [];
			let nextToken: string | undefined;
			do {
				const response: AwsResponse = await mockAwsRequest({
					url: '',
					method: 'POST',
					headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
					body: JSON.stringify({
						UserPoolId: 'mockUserPoolId',
						MaxResults: 60,
						NextToken: nextToken,
					}),
				});

				if (response.Groups) {
					allResults = allResults.concat(
						response.Groups.map((group: any) => ({
							name: group.GroupName,
							value: group.GroupName,
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

		const result = await searchGroups.call(mockContext, '');

		expect(mockAwsRequest).toHaveBeenCalledTimes(2);

		expect(result).toEqual({
			results: [
				{ name: 'Admin', value: 'Admin' },
				{ name: 'User', value: 'User' },
				{ name: 'Manager', value: 'Manager' },
			],
			paginationToken: undefined,
		});
	});

	it('should return empty results if no groups are found', async () => {
		mockGetNodeParameter.mockReturnValueOnce('mockUserPoolId');
		mockAwsRequest.mockResolvedValueOnce({
			Groups: [],
			NextToken: undefined,
		});

		mockSearchGroups.mockResolvedValueOnce({
			results: [],
			paginationToken: undefined,
		});

		const response = await searchGroups.call(mockContext);

		expect(response).toEqual({ results: [] });
	});
});
