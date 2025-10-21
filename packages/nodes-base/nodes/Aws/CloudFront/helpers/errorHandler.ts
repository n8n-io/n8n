import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleCloudFrontError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.Code || error.code || 'UnknownError';
	const errorMessage = error.Message || error.message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		NoSuchDistribution: 'The specified distribution does not exist',
		DistributionAlreadyExists: 'A distribution with this configuration already exists',
		InvalidArgument: 'Invalid argument provided',
		InvalidIfMatchVersion: 'The If-Match version does not match',
		PreconditionFailed: 'Precondition failed - check ETag',
		TooManyDistributions: 'Distribution limit exceeded',
		TooManyInvalidationsInProgress: 'Too many invalidations in progress',
		InvalidationBatchAlreadyExists: 'This invalidation batch already exists',
		NoSuchInvalidation: 'The specified invalidation does not exist',
		AccessDenied: 'Access denied to CloudFront resource',
		CNAMEAlreadyExists: 'CNAME is already in use',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS CloudFront error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
