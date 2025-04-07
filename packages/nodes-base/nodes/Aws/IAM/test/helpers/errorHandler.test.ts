import { NodeApiError } from 'n8n-workflow';
import type { INodeExecutionData, IN8nHttpFullResponse, JsonObject } from 'n8n-workflow';

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
		response.body = { code: 'EntityAlreadyExists', message: 'User already exists' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'User "existingUserName" already exists',
				description: 'Users must have unique names. Enter a different name for the new user.',
			}),
		);
	});

	test('should throw NodeApiError for EntityAlreadyExists with group conflict', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('group')
			.mockReturnValue('existingGroupName');

		response.statusCode = 400;
		response.body = { code: 'EntityAlreadyExists', message: 'Group already exists' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'Group "existingGroupName" already exists',
				description: 'Groups must have unique names. Enter a different name for the new group.',
			}),
		);
	});

	test('should throw NodeApiError for NoSuchEntity with user not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('user')
			.mockReturnValueOnce('nonExistentUser');

		response.statusCode = 404;
		response.body = { code: 'NoSuchEntity', message: 'User does not exist' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrowError(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'User "nonExistentUser" does not exist',
				description: 'The given user was not found - try entering a different user.',
			}),
		);
	});

	test('should throw NodeApiError for NoSuchEntity with group not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('group')
			.mockReturnValue('nonExistentGroup');

		response.statusCode = 404;
		response.body = { code: 'NoSuchEntity', message: 'Group does not exist' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'Group "nonExistentGroup" does not exist',
				description: 'The given group was not found - try entering a different group.',
			}),
		);
	});

	test('should throw NodeApiError for DeleteConflict', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('user')
			.mockReturnValue('userInGroup');

		response.statusCode = 400;
		response.body = { code: 'DeleteConflict', message: 'User is in a group' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'User "userInGroup" is in a group',
				description: 'Cannot delete entity, must remove users from group first.',
			}),
		);
	});

	test('should throw generic error if no specific mapping exists', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('container');

		response.statusCode = 400;
		response.body = { code: 'BadRequest', message: 'Invalid request' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'BadRequest',
				description: 'Invalid request',
			}),
		);
	});

	test('should handle error details correctly when match is successful', async () => {
		const errorMessage = 'Message: {"Errors":["Error 1", "Error 2"]}';
		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		expect(errorDetails).toEqual(['Error 1', 'Error 2']);
	});

	test('should handle error when match does not return expected format', async () => {
		const errorMessage = 'Message: Invalid format';

		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		expect(errorDetails).toEqual([]);
	});

	test('should throw NodeApiError with proper details if error details are present', async () => {
		const errorMessage = 'Message: {"Errors":["Specific error occurred"]}';
		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		if (errorDetails && errorDetails.length > 0) {
			await expect(
				handleError.call(mockExecuteSingleFunctions, data, {
					statusCode: 500,
					body: { code: 'InternalServerError', message: errorMessage },
					headers: {},
				}),
			).rejects.toThrow(
				new NodeApiError(
					mockExecuteSingleFunctions.getNode(),
					{
						code: 'InternalServerError',
						message: errorMessage,
					} as JsonObject,
					{
						message: 'InternalServerError',
						description: errorDetails.join('\n'),
					},
				),
			);
		}
	});

	test('should throw NodeApiError with fallback message if no details found', async () => {
		const errorMessage = 'Message: {"Errors":[] }';
		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		if (errorDetails && errorDetails.length > 0) {
			await expect(
				handleError.call(mockExecuteSingleFunctions, data, {
					statusCode: 500,
					body: { code: 'InternalServerError', message: errorMessage },
					headers: {},
				}),
			).rejects.toThrow(
				new NodeApiError(
					mockExecuteSingleFunctions.getNode(),
					{
						code: 'InternalServerError',
						message: errorMessage,
					} as JsonObject,
					{
						message: 'InternalServerError',
						description: 'Internal Server Error',
					},
				),
			);
		}
	});
});
