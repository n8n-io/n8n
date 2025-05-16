import { NodeApiError } from 'n8n-workflow';
import type { INodeExecutionData, IN8nHttpFullResponse, JsonObject } from 'n8n-workflow';

import { ERROR_DESCRIPTIONS } from '../../helpers/constants';
import { handleError } from '../../helpers/errorHandler';

const mockExecuteSingleFunctions = {
	getNode: jest.fn(() => ({ name: 'MockNode' })),
	getNodeParameter: jest.fn(),
} as any;

describe('handleError', () => {
	let response: IN8nHttpFullResponse;
	let data: INodeExecutionData[];

	beforeEach(() => {
		data = [{}] as INodeExecutionData[];
		response = { statusCode: 200, body: {} } as IN8nHttpFullResponse;
	});

	test('should return data when no error occurs', async () => {
		const result = await handleError.call(mockExecuteSingleFunctions, data, response);
		expect(result).toBe(data);
	});

	test('should throw NodeApiError for EntityAlreadyExists with user conflict', async () => {
		mockExecuteSingleFunctions.getNodeParameter = jest
			.fn()
			.mockReturnValueOnce('user')
			.mockReturnValueOnce('existingUserName');

		response.statusCode = 400;
		response.body = {
			Error: { Code: 'EntityAlreadyExists', Message: 'User "existingUserName" already exists' },
		} as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'User "existingUserName" already exists',
				description: ERROR_DESCRIPTIONS.EntityAlreadyExists.User,
			}),
		);
	});

	test('should throw NodeApiError for NoSuchEntity with user not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('user')
			.mockReturnValueOnce('nonExistentUser');

		response.statusCode = 404;
		response.body = {
			Error: { Code: 'NoSuchEntity', Message: 'User "nonExistentUser" does not exist' },
		} as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrowError(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'User "nonExistentUser" does not exist',
				description: ERROR_DESCRIPTIONS.NoSuchEntity.User,
			}),
		);
	});

	test('should throw generic error if no specific mapping exists', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('container');

		response.statusCode = 400;
		response.body = { Error: { Code: 'BadRequest', Message: 'Invalid request' } } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'BadRequest',
				description: 'Invalid request',
			}),
		);
	});

	test('should throw NodeApiError for EntityAlreadyExists with group conflict', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('group')
			.mockReturnValue('existingGroupName');

		response.statusCode = 400;
		response.body = {
			Error: { Code: 'EntityAlreadyExists', Message: 'Group "existingGroupName" already exists' },
		} as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'Group "existingGroupName" already exists',
				description: ERROR_DESCRIPTIONS.EntityAlreadyExists.Group,
			}),
		);
	});

	test('should throw NodeApiError for NoSuchEntity with group not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('group')
			.mockReturnValue('nonExistentGroup');

		response.statusCode = 404;
		response.body = {
			Error: { Code: 'NoSuchEntity', Message: 'Group "nonExistentGroup" does not exist' },
		} as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'Group "nonExistentGroup" does not exist',
				description: ERROR_DESCRIPTIONS.NoSuchEntity.Group,
			}),
		);
	});

	test('should throw NodeApiError for DeleteConflict', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('user')
			.mockReturnValue('userInGroup');

		response.statusCode = 400;
		response.body = {
			Error: { Code: 'DeleteConflict', Message: 'User "userIngroup" is in a group' },
		} as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'User "userIngroup" is in a group',
				description: 'This entity is still in use. Remove users from the group before deleting.',
			}),
		);
	});
});
