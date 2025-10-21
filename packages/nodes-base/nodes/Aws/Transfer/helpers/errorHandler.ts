import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleTransferError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified resource was not found',
		ResourceExistsException: 'A resource with this name already exists',
		InvalidRequestException: 'The request was invalid',
		ServiceUnavailableException: 'Service is temporarily unavailable',
		ThrottlingException: 'Request was throttled',
		InternalServiceError: 'An internal service error occurred',
		AccessDeniedException: 'Access denied',
		ConflictException: 'Resource conflict occurred',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Transfer Family error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
