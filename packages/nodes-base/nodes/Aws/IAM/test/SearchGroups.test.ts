import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { awsRequest } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	awsRequest: jest.fn(),
}));

describe('searchGroups', () => {
	let mockContext: ILoadOptionsFunctions;
	let searchGroups: (
		this: ILoadOptionsFunctions,
		filter?: string,
	) => Promise<{ results: Array<{ name: string; value: string }> }>;

	beforeEach(() => {
		mockContext = {
			requestWithAuthentication: jest.fn(),
		} as unknown as ILoadOptionsFunctions;

		searchGroups = async function (
			this: ILoadOptionsFunctions,
			filter?: string,
		): Promise<{ results: Array<{ name: string; value: string }> }> {
			const opts = {
				method: 'POST' as const,
				url: '/?Action=ListGroups&Version=2010-05-08',
			};

			const responseData: any = await awsRequest.call(this, opts);

			const groups = responseData?.ListGroupsResponse?.ListGroupsResult?.Groups || [];

			const results = groups
				.map((group: any) => ({
					name: String(group.GroupName),
					value: String(group.GroupName),
				}))
				.filter((group: any) => !filter || group.name.includes(filter))
				.sort((a: any, b: any) => a.name.localeCompare(b.name));

			return { results };
		};

		(awsRequest as jest.Mock).mockReset();
	});

	it('should return a list of groups when API responds with groups', async () => {
		(awsRequest as jest.Mock).mockResolvedValueOnce({
			ListGroupsResponse: {
				ListGroupsResult: {
					Groups: [{ GroupName: 'Admins' }, { GroupName: 'Developers' }],
				},
			},
		});

		const result = await searchGroups.call(mockContext);

		expect(result.results).toHaveLength(2);
		expect(result.results).toEqual([
			{ name: 'Admins', value: 'Admins' },
			{ name: 'Developers', value: 'Developers' },
		]);
	});

	it('should return an empty array when API responds with no groups', async () => {
		(awsRequest as jest.Mock).mockResolvedValueOnce({
			ListGroupsResponse: {
				ListGroupsResult: {
					Groups: [],
				},
			},
		});

		const result = await searchGroups.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should return an empty array when Groups key is missing in response', async () => {
		(awsRequest as jest.Mock).mockResolvedValueOnce({
			ListGroupsResponse: {
				ListGroupsResult: {},
			},
		});

		const result = await searchGroups.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should filter results when a filter string is provided', async () => {
		(awsRequest as jest.Mock).mockResolvedValueOnce({
			ListGroupsResponse: {
				ListGroupsResult: {
					Groups: [{ GroupName: 'Admins' }, { GroupName: 'Developers' }, { GroupName: 'Managers' }],
				},
			},
		});

		const result = await searchGroups.call(mockContext, 'Admin');

		expect(result.results).toEqual([{ name: 'Admins', value: 'Admins' }]);
	});

	it('should sort results alphabetically by GroupName', async () => {
		(awsRequest as jest.Mock).mockResolvedValueOnce({
			ListGroupsResponse: {
				ListGroupsResult: {
					Groups: [{ GroupName: 'Managers' }, { GroupName: 'Admins' }, { GroupName: 'Developers' }],
				},
			},
		});

		const result = await searchGroups.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'Admins', value: 'Admins' },
			{ name: 'Developers', value: 'Developers' },
			{ name: 'Managers', value: 'Managers' },
		]);
	});
});
