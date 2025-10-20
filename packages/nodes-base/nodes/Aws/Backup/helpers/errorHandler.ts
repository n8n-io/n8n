import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleBackupError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified resource was not found',
		AlreadyExistsException: 'A resource with this name already exists',
		InvalidParameterValueException: 'Invalid parameter value provided',
		MissingParameterValueException: 'Required parameter is missing',
		ServiceUnavailableException: 'Service is temporarily unavailable',
		LimitExceededException: 'Service limit exceeded',
		InvalidRequestException: 'The request was invalid',
		DependencyFailureException: 'Dependency failure occurred',
		InvalidResourceStateException: 'Resource is in invalid state',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Backup error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
