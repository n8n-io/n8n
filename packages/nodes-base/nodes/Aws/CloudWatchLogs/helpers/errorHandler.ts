import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleCloudWatchLogsError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified log group or stream was not found',
		ResourceAlreadyExistsException: 'A resource with this name already exists',
		InvalidParameterException: 'Invalid parameter provided',
		OperationAbortedException: 'Operation was aborted',
		ServiceUnavailableException: 'Service is temporarily unavailable',
		DataAlreadyAcceptedException: 'Data has already been accepted',
		InvalidSequenceTokenException: 'Invalid sequence token provided',
		LimitExceededException: 'Service limit exceeded',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS CloudWatch Logs error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
