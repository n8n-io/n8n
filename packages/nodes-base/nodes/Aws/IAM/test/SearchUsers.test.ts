import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUsers } from '../GenericFunctions';

describe('searchUsers', () => {
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

	it('should return a list of users when API responds with users', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockResolvedValueOnce({
			ListUsersResponse: {
				ListUsersResult: {
					Users: [{ UserName: 'Alice' }, { UserName: 'Bob' }],
				},
			},
			NextToken: 'nextTokenValue',
		});

		const result = await searchUsers.call(mockContext);

		expect(result.results).toHaveLength(2);
		expect(result.results).toEqual([
			{ name: 'Alice', value: 'Alice' },
			{ name: 'Bob', value: 'Bob' },
		]);
	});

	it('should return an empty array when API responds with no users', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockResolvedValueOnce({
			ListUsersResponse: {
				ListUsersResult: {
					Users: [],
				},
			},
			NextToken: 'nextTokenValue',
		});
		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should return an empty array when Users key is missing in response', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockResolvedValueOnce({
			ListUsersResponse: {
				ListUsersResult: {},
			},
			NextToken: 'nextTokenValue',
		});

		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should sort results alphabetically by UserName', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ value: 'mockUserPoolId' });
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockResolvedValueOnce({
			ListUsersResponse: {
				ListUsersResult: {
					Users: [{ UserName: 'Alice' }, { UserName: 'Charlie' }, { UserName: 'Bob' }],
				},
			},
			NextToken: 'nextTokenValue',
		});

		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'Alice', value: 'Alice' },
			{ name: 'Bob', value: 'Bob' },
			{ name: 'Charlie', value: 'Charlie' },
		]);
	});
});
