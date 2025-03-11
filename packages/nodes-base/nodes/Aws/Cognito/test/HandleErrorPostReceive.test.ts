import type { INodeExecutionData, IN8nHttpFullResponse, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { handleErrorPostReceive } from '../generalFunctions/errorHandling';

describe('handleErrorPostReceive', () => {
	let mockContext: any;
	let mockGetNode: jest.Mock;
	let mockNodeParameter: jest.Mock;

	beforeEach(() => {
		mockGetNode = jest.fn().mockReturnValue('mockNode');

		mockNodeParameter = jest.fn();

		mockContext = {
			getNode: mockGetNode,
			getNodeParameter: mockNodeParameter,
		};
	});

	test('should throw error when status code starts with 4 (ResourceNotFoundException for group get operation)', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 404,
			body: {
				__type: 'ResourceNotFoundException',
				message: 'Group not found',
			},
			headers: {},
		};
		mockNodeParameter.mockReturnValueOnce('group');
		mockNodeParameter.mockReturnValueOnce('get');
		const data: INodeExecutionData[] = [];

		await expect(handleErrorPostReceive.call(mockContext, data, response)).rejects.toThrowError(
			new NodeApiError(mockGetNode(), response as unknown as JsonObject, {
				message: 'The group you are requesting could not be found.',
				description: 'Adjust the "Group" parameter setting to retrieve the group correctly.',
			}),
		);
	});

	test('should not throw error when status code does not start with 4 or 5', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 200,
			body: {},
			headers: {},
		};

		const data: INodeExecutionData[] = [];

		const result = await handleErrorPostReceive.call(mockContext, data, response);
		expect(result).toEqual(data);
	});

	test('should throw error for user delete operation when UserNotFoundException occurs', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 404,
			body: {
				__type: 'UserNotFoundException',
				message: 'User not found',
			},
			headers: {},
		};
		mockNodeParameter.mockReturnValueOnce('user');
		mockNodeParameter.mockReturnValueOnce('delete');

		const data: INodeExecutionData[] = [];

		await expect(handleErrorPostReceive.call(mockContext, data, response)).rejects.toThrowError(
			new NodeApiError(mockGetNode(), response as unknown as JsonObject, {
				message: 'The user you are requesting could not be found.',
				description: 'Adjust the "User" parameter setting to retrieve the post correctly.',
			}),
		);
	});

	test('should throw error when status code starts with 5 (EntityAlreadyExists for group create operation)', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 500,
			body: {
				__type: 'EntityAlreadyExists',
				message: 'Group already exists',
			},
			headers: {},
		};
		mockNodeParameter.mockReturnValueOnce('group');
		mockNodeParameter.mockReturnValueOnce('create');

		const data: INodeExecutionData[] = [];

		await expect(handleErrorPostReceive.call(mockContext, data, response)).rejects.toThrowError(
			new NodeApiError(mockGetNode(), response as unknown as JsonObject, {
				message: 'The group you are trying to create already exists.',
				description: 'Adjust the "Group Name" parameter setting to create the group correctly.',
			}),
		);
	});

	test('should throw error for user create operation when UsernameExistsException occurs', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 400,
			body: {
				__type: 'UsernameExistsException',
				message: 'User account already exists',
			},
			headers: {},
		};
		mockNodeParameter.mockReturnValueOnce('user');
		mockNodeParameter.mockReturnValueOnce('create');

		const data: INodeExecutionData[] = [];

		await expect(handleErrorPostReceive.call(mockContext, data, response)).rejects.toThrowError(
			new NodeApiError(mockGetNode(), response as unknown as JsonObject, {
				message: 'The user you are trying to create already exists.',
				description: 'Adjust the "User Name" parameter setting to create the user correctly.',
			}),
		);
	});
});
