import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleTimestreamError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified resource was not found',
		ValidationException: 'Invalid input provided',
		ConflictException: 'Resource already exists or conflict occurred',
		AccessDeniedException: 'Access denied to the resource',
		InternalServerException: 'An internal service error occurred',
		ThrottlingException: 'Request was throttled',
		ServiceQuotaExceededException: 'Service quota exceeded',
		InvalidEndpointException: 'The endpoint is invalid',
		RejectedRecordsException: 'Some records were rejected',
		DatabaseNotFoundException: 'The specified database was not found',
		TableNotFoundException: 'The specified table was not found',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Timestream error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
