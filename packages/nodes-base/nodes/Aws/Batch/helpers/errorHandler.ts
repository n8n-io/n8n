import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleBatchError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ClientException: 'Client request error - invalid parameters',
		ServerException: 'Internal server error occurred',
		ResourceNotFoundException: 'The specified resource was not found',
		InvalidParameterValue: 'Invalid parameter value provided',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Batch error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
