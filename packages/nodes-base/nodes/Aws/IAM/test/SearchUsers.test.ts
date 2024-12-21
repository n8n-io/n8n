import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { awsRequest, searchUsers } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	awsRequest: jest.fn(),
	searchUsers: jest.fn(),
}));

describe('searchUsers', () => {
	let mockContext: ILoadOptionsFunctions;
	const mockAwsRequest = awsRequest as jest.Mock;
	const mockSearchUsers = searchUsers as jest.Mock;

	beforeEach(() => {
		mockContext = {
			requestWithAuthentication: jest.fn(),
		} as unknown as ILoadOptionsFunctions;

		mockAwsRequest.mockClear();
		mockSearchUsers.mockClear();
	});

	it('should return a list of users when API responds with users', async () => {
		mockSearchUsers.mockImplementation(async () => {
			const users = [{ UserName: 'Alice' }, { UserName: 'Bob' }];

			return {
				results: users.map((user) => ({ name: user.UserName, value: user.UserName })),
			};
		});

		const result = await searchUsers.call(mockContext);

		expect(result.results).toHaveLength(2);
		expect(result.results).toEqual([
			{ name: 'Alice', value: 'Alice' },
			{ name: 'Bob', value: 'Bob' },
		]);
	});

	it('should return an empty array when API responds with no users', async () => {
		mockSearchUsers.mockImplementation(async () => {
			return { results: [] };
		});

		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should return an empty array when Users key is missing in response', async () => {
		mockSearchUsers.mockImplementation(async () => {
			return { results: [] };
		});

		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should filter results when a filter string is provided', async () => {
		mockSearchUsers.mockImplementation(async (filter) => {
			const users = [{ UserName: 'Alice' }, { UserName: 'Bob' }, { UserName: 'Charlie' }];

			return {
				results: users
					.filter((user) => !filter || user.UserName.includes(filter))
					.map((user) => ({ name: user.UserName, value: user.UserName })),
			};
		});

		const result = await searchUsers.call(mockContext, 'Bob');

		expect(result.results).toEqual([{ name: 'Bob', value: 'Bob' }]);
	});

	it('should sort results alphabetically by UserName', async () => {
		mockSearchUsers.mockImplementation(async () => {
			const users = [{ UserName: 'Charlie' }, { UserName: 'Alice' }, { UserName: 'Bob' }];

			return {
				results: users
					.map((user) => ({ name: user.UserName, value: user.UserName }))
					.sort((a, b) => a.name.localeCompare(b.name)),
			};
		});

		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'Alice', value: 'Alice' },
			{ name: 'Bob', value: 'Bob' },
			{ name: 'Charlie', value: 'Charlie' },
		]);
	});
});
