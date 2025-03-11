import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchGroups } from '../generalFunctions/dataFetching';

describe('GenericFunctions - searchGroups', () => {
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

		await expect(searchGroups.call(mockContext)).rejects.toThrow(
			'User Pool ID is required to search groups',
		);
	});

	it('should make a POST request to search groups and return results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Groups: [{ GroupName: 'Admin' }, { GroupName: 'User' }],
			NextToken: 'nextTokenValue',
		});

		const response = await searchGroups.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				baseURL: 'https://cognito-idp.us-east-1.amazonaws.com',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-amz-json-1.1',
					'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups',
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
				{ name: 'Admin', value: 'Admin' },
				{ name: 'User', value: 'User' },
			],
			paginationToken: 'nextTokenValue',
		});
	});

	it('should handle pagination and return all results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Groups: [{ GroupName: 'Admin' }, { GroupName: 'User' }],
			NextToken: undefined,
		});

		const response = await searchGroups.call(mockContext, '', 'prevTokenValue');

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
				{ name: 'Admin', value: 'Admin' },
				{ name: 'User', value: 'User' },
			],
			paginationToken: undefined,
		});
	});

	it('should handle empty results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Groups: [],
			NextToken: undefined,
		});

		const response = await searchGroups.call(mockContext);

		expect(response).toEqual({ results: [], paginationToken: undefined });
	});
});
