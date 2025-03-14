import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchGroups } from '../GenericFunctions';

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

	it('should make a POST request to search groups and return results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			ListGroupsResponse: {
				ListGroupsResult: {
					Groups: [{ GroupName: 'Admins' }, { GroupName: 'Developers' }],
				},
			},
			NextToken: 'nextTokenValue',
		});

		const response = await searchGroups.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				baseURL: 'https://iam.amazonaws.com',
				method: 'POST',
				url: '/?Action=ListGroups&Version=2010-05-08',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				json: true,
			}),
		);

		expect(response).toEqual({
			results: [
				{ name: 'Admins', value: 'Admins' },
				{ name: 'Developers', value: 'Developers' },
			],
		});
	});

	it('should handle pagination and return all results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });

		mockRequestWithAuthentication.mockResolvedValueOnce({
			ListGroupsResponse: {
				ListGroupsResult: {
					Groups: [{ GroupName: 'Admin' }, { GroupName: 'User' }],
				},
			},
			NextToken: 'nextTokenValue',
		});

		const response = await searchGroups.call(mockContext, '');

		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				baseURL: 'https://iam.amazonaws.com',
				method: 'POST',
				url: '/?Action=ListGroups&Version=2010-05-08',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				json: true,
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
			ListGroupsResponse: {
				ListGroupsResult: {
					Groups: [],
				},
			},
			NextToken: undefined,
		});

		const response = await searchGroups.call(mockContext);

		expect(response).toEqual({ results: [], paginationToken: undefined });
	});
});
