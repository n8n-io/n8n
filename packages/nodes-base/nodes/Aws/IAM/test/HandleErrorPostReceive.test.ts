import type { INodeExecutionData, IN8nHttpFullResponse, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { handleErrorPostReceive } from '../GenericFunctions';

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
				message: "The required group doesn't match any existing one",
				description: "Double-check the value in the parameter 'Group' and try again",
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
				message: 'The group is already created',
				description: "Double-check the value in the parameter 'Group Name' and try again",
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
				message: 'The user is already created',
				description: "Double-check the value in the parameter 'User Name' and try again",
			}),
		);
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
				message: "The required user doesn't match any existing one",
				description: "Double-check the value in the parameter 'User' and try again",
			}),
		);
	});

	test('should throw error when InvalidParameterException occurs (for invalid group ID)', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 400,
			body: {
				__type: 'InvalidParameterException',
				message: 'Invalid parameter',
			},
			headers: {},
		};
		mockNodeParameter.mockReturnValueOnce('group');
		mockNodeParameter.mockReturnValueOnce('create');

		const data: INodeExecutionData[] = [];

		await expect(handleErrorPostReceive.call(mockContext, data, response)).rejects.toThrowError(
			new NodeApiError(mockGetNode(), response as unknown as JsonObject, {
				message: 'The group ID is invalid',
				description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
			}),
		);
	});

	test('should throw error when TooManyRequestsException occurs', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 429,
			body: {
				__type: 'TooManyRequestsException',
				message: 'Too many requests',
			},
			headers: {},
		};
		mockNodeParameter.mockReturnValueOnce('group');
		mockNodeParameter.mockReturnValueOnce('create');

		const data: INodeExecutionData[] = [];

		await expect(handleErrorPostReceive.call(mockContext, data, response)).rejects.toThrowError(
			new NodeApiError(mockGetNode(), response as unknown as JsonObject, {
				message: 'Too Many Requests',
				description: 'You have exceeded the allowed number of requests. Try again later.',
			}),
		);
	});
});
