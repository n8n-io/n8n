import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleElasticBeanstalkError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.Code || error.code || 'UnknownError';
	const errorMessage = error.Message || error.message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		InvalidRequestException: 'The request was invalid',
		ResourceNotFoundException: 'The specified resource was not found',
		TooManyApplicationsException: 'Application limit exceeded',
		TooManyEnvironmentsException: 'Environment limit exceeded',
		TooManyApplicationVersionsException: 'Application version limit exceeded',
		InsufficientPrivilegesException: 'Insufficient privileges for this operation',
		OperationInProgressException: 'An operation is already in progress',
		SourceBundleDeletionException: 'Failed to delete source bundle',
		S3LocationNotInServiceRegionException: 'S3 location not in service region',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Elastic Beanstalk error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
