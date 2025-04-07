import {
	type JsonObject,
	NodeApiError,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

import type { IErrorResponse } from './interfaces';

type ErrorCode = 'EntityAlreadyExists' | 'NoSuchEntity' | 'DeleteConflict';

export const ErrorMap: Record<
	ErrorCode,
	(message: string, inputValue: string) => { message: string; description: string } | undefined
> = {
	EntityAlreadyExists: (message) => {
		if (message.includes('User')) {
			return {
				message,
				description: 'Users must have unique names. Enter a different name for the new user.',
			};
		}
		if (message.includes('Group')) {
			return {
				message,
				description: 'Groups must have unique names. Enter a different name for the new group.',
			};
		}
		return undefined;
	},
	NoSuchEntity: (message, inputValue) => {
		if (message.includes('User')) {
			return {
				message: `User "${inputValue}" does not exist`,
				description: 'The given user was not found - try entering a different user.',
			};
		}
		if (message.includes('Group')) {
			return {
				message: `Group "${inputValue}" does not exist`,
				description: 'The given group was not found - try entering a different group.',
			};
		}
		return undefined;
	},
	DeleteConflict: (message, inputValue) => {
		if (message.includes('User')) {
			return {
				message: `User "${inputValue}" is in a group`,
				description: 'Cannot delete entity, must remove users from group first.',
			};
		}
	},
};

export async function handleError(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const { Error } = response.body as IErrorResponse;
		const errorMessage = Error.Message;
		let inputValue: string | undefined;

		const resource = this.getNodeParameter('resource') as string;

		try {
			if (resource === 'user') {
				inputValue =
					(this.getNodeParameter('user', undefined, { extractValue: true }) as string) ??
					(this.getNodeParameter('newUserName') as string);
			} else if (resource === 'group') {
				inputValue =
					(this.getNodeParameter('group', undefined, { extractValue: true }) as string) ??
					(this.getNodeParameter('newGroupName') as string);
			}
		} catch (err) {
			console.error('Error retrieving parameters:', err);
		}

		const errorDetails = ErrorMap[Error.Code as ErrorCode]?.(errorMessage, inputValue ?? 'Unknown');
		if (errorDetails) {
			console.log('Error details found in ErrorMap:', errorDetails);
			throw new NodeApiError(this.getNode(), Error as unknown as JsonObject, errorDetails);
		} else {
			console.log('No error details found in ErrorMap, falling back...');
			throw new NodeApiError(this.getNode(), Error as unknown as JsonObject, {
				message: Error.Code,
				description: Error.Message,
			});
		}
	}

	return data;
}
