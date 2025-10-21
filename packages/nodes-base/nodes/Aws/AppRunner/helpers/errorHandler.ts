import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleAppRunnerError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified resource was not found',
		InvalidRequestException: 'Invalid request parameters',
		InvalidStateException: 'Resource is in invalid state for this operation',
		ServiceQuotaExceededException: 'Service quota exceeded',
		InternalServiceErrorException: 'Internal service error occurred',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS App Runner error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
