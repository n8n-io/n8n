import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUsers } from '../generalFunctions/dataFetching';

describe('GenericFunctions - searchUsers', () => {
	const mockRequestWithAuthentication = jest.fn();

	const mockContext = {
		helpers: {
			requestWithAuthentication: mockRequestWithAuthentication,
		},
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn().mockResolvedValue({ region: 'us-east-1' }),
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

		mockRequestWithAuthentication.mockResolvedValueOnce({
			UserPool: {
				UsernameAttributes: ['email'],
			},
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Users: [
				{
					Username: 'testuser1',
					Attributes: [
						{ Name: 'email', Value: 'test1@example.com' },
						{ Name: 'sub', Value: 'sub-1' },
					],
				},
				{
					Username: 'testuser2',
					Attributes: [
						{ Name: 'email', Value: 'test2@example.com' },
						{ Name: 'sub', Value: 'sub-2' },
					],
				},
			],
			NextToken: 'nextTokenValue',
		});

		const response = await searchUsers.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(response).toEqual({
			results: [
				{ name: 'test1@example.com', value: 'sub-1' },
				{ name: 'test2@example.com', value: 'sub-2' },
			],
			paginationToken: 'nextTokenValue',
		});
	});

	it('should handle pagination and return all results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			UserPool: { UsernameAttributes: ['email'] },
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Users: [
				{
					Username: 'testuser1',
					Attributes: [
						{ Name: 'email', Value: 'test1@example.com' },
						{ Name: 'sub', Value: 'sub-1' },
					],
				},
			],
			NextToken: 'nextTokenValue',
		});

		const response = await searchUsers.call(mockContext, '', 'prevTokenValue');

		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(2);

		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			expect.any(String),
			expect.objectContaining({
				body: JSON.stringify({
					UserPoolId: 'mockUserPoolId',
					MaxResults: 60,
					NextToken: 'prevTokenValue',
				}),
			}),
		);

		expect(response).toEqual({
			results: [{ name: 'test1@example.com', value: 'sub-1' }],
			paginationToken: 'nextTokenValue',
		});
	});

	it('should handle empty results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			UserPool: { UsernameAttributes: ['email'] },
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Users: [],
			NextToken: undefined,
		});

		const response = await searchUsers.call(mockContext);

		expect(response).toEqual({ results: [], paginationToken: undefined });
	});
});
