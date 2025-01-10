import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchGroups, awsRequest } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	awsRequest: jest.fn(),
}));

describe('searchGroups', () => {
	let mockFunctions: ILoadOptionsFunctions;

	beforeEach(() => {
		mockFunctions = {
			getNodeParameter: jest.fn(),
		} as unknown as ILoadOptionsFunctions;

		(awsRequest as jest.Mock).mockReset();
	});

	test('should throw an error if User Pool ID is missing', async () => {
		(mockFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce(undefined);

		await expect(searchGroups.call(mockFunctions)).rejects.toThrow(
			'User Pool ID is required to search groups',
		);
	});

	test('should make a POST request to search groups and return results', async () => {
		(mockFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });

		(awsRequest as jest.Mock).mockResolvedValueOnce({
			Groups: [{ GroupName: 'Admin' }, { GroupName: 'User' }],
			NextToken: 'nextTokenValue',
		});

		const response = await searchGroups.call(mockFunctions);

		expect(awsRequest).toHaveBeenCalledWith({
			url: '',
			method: 'POST',
			headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
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

	test('should handle pagination and return all results', async () => {
		(mockFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });

		(awsRequest as jest.Mock)
			.mockResolvedValueOnce({
				Groups: [{ GroupName: 'Admin' }, { GroupName: 'User' }],
				NextToken: 'nextTokenValue',
			})
			.mockResolvedValueOnce({
				Groups: [{ GroupName: 'Manager' }],
				NextToken: undefined,
			});

		const response = await searchGroups.call(mockFunctions, '', 'prevTokenValue');

		expect(awsRequest).toHaveBeenCalledTimes(2);
		expect(response).toEqual({
			results: [
				{ name: 'Admin', value: 'Admin' },
				{ name: 'User', value: 'User' },
				{ name: 'Manager', value: 'Manager' },
			],
			paginationToken: undefined,
		});
	});

	test('should return empty results if no groups are found', async () => {
		(mockFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });

		(awsRequest as jest.Mock).mockResolvedValueOnce({
			Groups: [],
			NextToken: undefined,
		});

		const response = await searchGroups.call(mockFunctions);

		expect(response).toEqual({ results: [] });
	});
});
