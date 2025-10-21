import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleKinesisError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified stream was not found',
		ResourceInUseException: 'The resource is currently in use',
		LimitExceededException: 'Service limit exceeded',
		InvalidArgumentException: 'Invalid argument provided',
		ProvisionedThroughputExceededException: 'Request rate exceeds provisioned throughput',
		ExpiredIteratorException: 'The shard iterator has expired',
		KMSDisabledException: 'KMS key is disabled',
		KMSInvalidStateException: 'KMS key is in invalid state',
		KMSAccessDeniedException: 'Access denied to KMS key',
		KMSNotFoundException: 'KMS key not found',
		KMSOptInRequired: 'KMS opt-in required',
		KMSThrottlingException: 'KMS request throttled',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Kinesis error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
