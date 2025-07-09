import type {
	JsonObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { ERROR_MESSAGES } from './constants';
import type { AwsError, ErrorMessage } from './interfaces';

function mapErrorToResponse(
	errorType: string,
	resource: string,
	operation: string,
	inputValue?: string,
): ErrorMessage | undefined {
	const op = operation as keyof typeof ERROR_MESSAGES.ResourceNotFound.User;
	const nameLabel = resource.charAt(0).toUpperCase() + resource.slice(1);
	const valuePart = inputValue ? ` "${inputValue}"` : '';

	const notFoundMessage = (base: ErrorMessage, suffix: string): ErrorMessage => ({
		...base,
		message: `${nameLabel}${valuePart} ${suffix}`,
	});

	const isNotFound = [
		'UserNotFoundException',
		'ResourceNotFoundException',
		'NoSuchEntity',
	].includes(errorType);

	const isExists = [
		'UsernameExistsException',
		'EntityAlreadyExists',
		'GroupExistsException',
	].includes(errorType);

	if (isNotFound) {
		if (resource === 'user') {
			if (operation === 'addToGroup') {
				return notFoundMessage(ERROR_MESSAGES.UserGroup.add, 'not found while adding to group.');
			}
			if (operation === 'removeFromGroup') {
				return notFoundMessage(
					ERROR_MESSAGES.UserGroup.remove,
					'not found while removing from group.',
				);
			}
			return notFoundMessage(ERROR_MESSAGES.ResourceNotFound.User[op], 'not found.');
		}

		if (resource === 'group') {
			return notFoundMessage(ERROR_MESSAGES.ResourceNotFound.Group[op], 'not found.');
		}
	}

	if (isExists) {
		const existsMessage = `${nameLabel}${valuePart} already exists.`;

		if (resource === 'user') {
			return { ...ERROR_MESSAGES.EntityAlreadyExists.User, message: existsMessage };
		}
		if (resource === 'group') {
			return { ...ERROR_MESSAGES.EntityAlreadyExists.Group, message: existsMessage };
		}
	}

	return undefined;
}

export async function handleError(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const statusCode = String(response.statusCode);

	if (!statusCode.startsWith('4') && !statusCode.startsWith('5')) {
		return data;
	}

	const resource = this.getNodeParameter('resource') as string;
	const operation = this.getNodeParameter('operation') as string;

	let inputValue: string | undefined;

	if (operation === 'create') {
		if (resource === 'user') {
			inputValue = this.getNodeParameter('newUserName', '') as string;
		} else if (resource === 'group') {
			inputValue = this.getNodeParameter('newGroupName', '') as string;
		}
	} else {
		inputValue = this.getNodeParameter(resource, '', { extractValue: true }) as string;
	}

	const responseBody = response.body as AwsError;
	const errorType = (responseBody.__type ?? response.headers?.['x-amzn-errortype']) as string;
	const errorMessage = (responseBody.message ??
		response.headers?.['x-amzn-errormessage']) as string;

	if (!errorType) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	const specificError = mapErrorToResponse(errorType, resource, operation, inputValue);

	throw new NodeApiError(
		this.getNode(),
		response as unknown as JsonObject,
		specificError ?? {
			message: errorType,
			description: errorMessage,
		},
	);
}
