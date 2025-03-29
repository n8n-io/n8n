import {
	type JsonObject,
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

export async function handleError(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const statusCode = String(response.statusCode);

	if (!statusCode.startsWith('4') && !statusCode.startsWith('5')) {
		return data;
	}

	const responseBody = response.body as IDataObject;
	const error = responseBody.Error as IDataObject;

	if (!error) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
			message: 'Unexpected Error',
			description: 'An unexpected error occurred. Please check the request and try again.',
		});
	}

	const errorCode = error.Code as string;
	const errorMessage = error.Message as string;

	const ERROR_MAP: Record<string, (message: string) => IDataObject | undefined> = {
		EntityAlreadyExists: (message) => {
			if (message.includes('User')) {
				return {
					message: 'User already exists',
					description: 'Users must have unique names. Enter a different name for the new user.',
				};
			}
			if (message.includes('Group')) {
				return {
					message: 'Group already exists',
					description: 'Groups must have unique names. Enter a different name for the new group.',
				};
			}
		},
		NoSuchEntity: (message) => {
			if (message.includes('user')) {
				return {
					message: 'User does not exist',
					description: 'The given user was not found - try entering a different user.',
				};
			}
			if (message.includes('group')) {
				return {
					message: 'Group does not exist',
					description: 'The given group was not found - try entering a different group.',
				};
			}
		},
		DeleteConflict: () => ({
			message: 'User is in a group',
			description: 'Cannot delete entity, must remove users from group first.',
		}),
	};

	const specificError = ERROR_MAP[errorCode]?.(errorMessage) ?? {
		message: errorCode || 'Unknown Error',
		description:
			errorMessage || 'An unexpected error occurred. Please check the request and try again.',
	};

	throw new NodeApiError(this.getNode(), response as unknown as JsonObject, specificError);
}
