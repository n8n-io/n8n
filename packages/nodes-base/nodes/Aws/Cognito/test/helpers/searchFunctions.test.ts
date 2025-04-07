import { NodeOperationError } from 'n8n-workflow';

import { searchUsersForGroup } from '../../helpers/searchFunctions';
import { awsApiRequest } from '../../transport';

jest.mock('../../transport', () => ({
	awsApiRequest: jest.fn(),
}));

describe('searchUsersForGroup', () => {
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			getNode: jest.fn(),
		};
	});

	it('should throw an error if UserPoolId is missing', async () => {
		mockNode.getNodeParameter.mockReturnValue(undefined);

		await expect(searchUsersForGroup.call(mockNode, 'groupName', '')).rejects.toThrowError(
			NodeOperationError,
		);
	});

	it('should return an empty list if no users are found', async () => {
		mockNode.getNodeParameter.mockReturnValue('userPoolId');
		const mockResponse = { Users: [] };

		(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await searchUsersForGroup.call(mockNode, 'groupName', 'userPoolId');
		expect(result).toEqual({ results: [] });
	});

	it('should return users correctly', async () => {
		mockNode.getNodeParameter.mockReturnValue('userPoolId');
		const mockUsers = [
			{
				Username: 'user1',
				Enabled: true,
				Attributes: [{ Name: 'email', Value: 'user1@example.com' }],
			},
			{
				Username: 'user2',
				Enabled: true,
				Attributes: [{ Name: 'email', Value: 'user2@example.com' }],
			},
		];
		const mockResponse = { Users: mockUsers, NextToken: 'next-token' };

		(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await searchUsersForGroup.call(mockNode, 'groupName', 'userPoolId');
		expect(result).toEqual({
			results: [
				{
					Username: 'user1',
					Enabled: true,
					email: 'user1@example.com',
				},
				{
					Username: 'user2',
					Enabled: true,
					email: 'user2@example.com',
				},
			],
			paginationToken: 'next-token',
		});
	});

	it('should handle empty attributes and missing values', async () => {
		mockNode.getNodeParameter.mockReturnValue('userPoolId');
		const mockUsers = [
			{ Username: 'user1', Enabled: true, Attributes: [{ Name: 'email', Value: '' }] },
		];
		const mockResponse = { Users: mockUsers };

		(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await searchUsersForGroup.call(mockNode, 'groupName', 'userPoolId');
		expect(result).toEqual({
			results: [
				{
					Username: 'user1',
					Enabled: true,
					email: '',
				},
			],
		});
	});

	it('should handle pagination and return the next token', async () => {
		mockNode.getNodeParameter.mockReturnValue('userPoolId');
		const mockUsers = [
			{
				Username: 'user1',
				Enabled: true,
				Attributes: [{ Name: 'email', Value: 'user1@example.com' }],
			},
		];
		const mockResponse = { Users: mockUsers, NextToken: 'next-token' };

		(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await searchUsersForGroup.call(mockNode, 'groupName', 'userPoolId');
		expect(result).toEqual({
			results: [
				{
					Username: 'user1',
					Enabled: true,
					email: 'user1@example.com',
				},
			],
			paginationToken: 'next-token',
		});
	});

	it('should return the users sorted by Username', async () => {
		mockNode.getNodeParameter.mockReturnValue('userPoolId');
		const mockUsers = [
			{
				Username: 'user2',
				Enabled: true,
				Attributes: [{ Name: 'email', Value: 'user2@example.com' }],
			},
			{
				Username: 'user1',
				Enabled: true,
				Attributes: [{ Name: 'email', Value: 'user1@example.com' }],
			},
		];
		const mockResponse = { Users: mockUsers };

		(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await searchUsersForGroup.call(mockNode, 'groupName', 'userPoolId');
		expect(result).toEqual({
			results: [
				{
					Username: 'user1',
					Enabled: true,
					email: 'user1@example.com',
				},
				{
					Username: 'user2',
					Enabled: true,
					email: 'user2@example.com',
				},
			],
		});
	});
});
