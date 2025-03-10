import {
	type JsonObject,
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const responseBody = response.body as IDataObject;
	if (
		!String(response.statusCode).startsWith('4') &&
		!String(response.statusCode).startsWith('5')
	) {
		return data;
	}
	const error = responseBody.Error as IDataObject;
	if (error) {
		const errorCode = error.Code;
		const errorMessage = error.Message as string;
		let specificError: IDataObject | undefined;
		switch (errorCode) {
			case 'EntityAlreadyExists':
				if (errorMessage.includes('User')) {
					specificError = {
						message: 'User already exists',
						description: 'Users must have unique names. Enter a different name for the new user.',
					};
				} else if (errorMessage.includes('Group')) {
					specificError = {
						message: 'Group already exists',
						description: 'Groups must have unique names. Enter a different name for the new group.',
					};
				}
				break;

			case 'NoSuchEntity':
				if (errorMessage.includes('user')) {
					specificError = {
						message: 'User does not exist',
						description: 'The given user was not found - try entering a different user.',
					};
				} else if (errorMessage.includes('group')) {
					specificError = {
						message: 'Group does not exist',
						description: 'The given group was not found - try entering a different group.',
					};
				}
				break;

			case 'DeleteConflict':
				specificError = {
					message: 'User is in a group',
					description: 'Cannot delete entity, must remove users from group first.',
				};
				break;

			default:
				specificError = {
					message: errorCode || 'Unknown Error',
					description:
						errorMessage || 'An unexpected error occurred. Please check the request and try again.',
				};
				break;
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, specificError);
	}

	throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
		message: 'Unexpected Error',
		description: 'An unexpected error occurred. Please check the request and try again.',
	});
}
