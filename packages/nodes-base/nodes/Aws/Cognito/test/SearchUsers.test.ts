import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUsers } from '../GenericFunctions';

describe('GenericFunctions - searchUsers', () => {
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

	it('should throw an error if User Pool ID is missing', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({});

		await expect(searchUsers.call(mockContext)).rejects.toThrow(
			'User Pool ID is required to search users',
		);
	});

	it('should make a POST request to search users and return results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Users: [
				{
					Username: 'User1',
					Attributes: [
						{ Name: 'email', Value: 'user1@example.com' },
						{ Name: 'sub', Value: 'sub1' },
					],
				},
				{
					Username: 'User2',
					Attributes: [
						{ Name: 'email', Value: 'user2@example.com' },
						{ Name: 'sub', Value: 'sub2' },
					],
				},
			],
			NextToken: 'nextTokenValue',
		});

		const response = await searchUsers.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				baseURL: 'https://cognito-idp.us-east-1.amazonaws.com',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-amz-json-1.1',
					'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers',
				},
				body: JSON.stringify({
					UserPoolId: 'mockUserPoolId',
					MaxResults: 60,
					NextToken: undefined,
				}),
			}),
		);

		expect(response).toEqual({
			results: [
				{ name: 'user1@example.com', value: 'User1' },
				{ name: 'user2@example.com', value: 'User2' },
			],
			paginationToken: 'nextTokenValue',
		});
	});

	it('should handle pagination and return all results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Users: [
				{
					Username: 'User1',
					Attributes: [
						{ Name: 'email', Value: 'user1@example.com' },
						{ Name: 'sub', Value: 'sub1' },
					],
				},
				{
					Username: 'User2',
					Attributes: [
						{ Name: 'email', Value: 'user2@example.com' },
						{ Name: 'sub', Value: 'sub2' },
					],
				},
			],
			NextToken: undefined,
		});

		const response = await searchUsers.call(mockContext, '', 'prevTokenValue');

		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);

		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'aws',
			expect.objectContaining({
				body: JSON.stringify({
					UserPoolId: 'mockUserPoolId',
					MaxResults: 60,
					NextToken: 'prevTokenValue',
				}),
			}),
		);

		expect(response).toEqual({
			results: [
				{ name: 'user1@example.com', value: 'User1' },
				{ name: 'user2@example.com', value: 'User2' },
			],
			paginationToken: undefined,
		});
	});

	it('should handle empty results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Users: [],
			NextToken: undefined,
		});

		const response = await searchUsers.call(mockContext);

		expect(response).toEqual({ results: [], paginationToken: undefined });
	});
});
