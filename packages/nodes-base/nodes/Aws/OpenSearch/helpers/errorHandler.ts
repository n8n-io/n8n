import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleOpenSearchError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified domain was not found',
		ResourceAlreadyExistsException: 'A domain with this name already exists',
		LimitExceededException: 'Service limit exceeded',
		InvalidTypeException: 'Invalid type provided',
		ValidationException: 'Validation failed',
		DisabledOperationException: 'Operation is disabled',
		InternalException: 'An internal service error occurred',
		BaseException: 'An error occurred',
		AccessDeniedException: 'Access denied to the resource',
		ConflictException: 'Resource conflict occurred',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS OpenSearch error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
