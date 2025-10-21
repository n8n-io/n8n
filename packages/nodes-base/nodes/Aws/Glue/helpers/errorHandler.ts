import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleGlueError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		EntityNotFoundException: 'The specified entity was not found',
		AlreadyExistsException: 'Resource already exists',
		InvalidInputException: 'Invalid input parameters',
		InternalServiceException: 'Internal service error occurred',
		OperationTimeoutException: 'Operation timed out',
		ResourceNumberLimitExceededException: 'Resource limit exceeded',
		ConcurrentRunsExceededException: 'Too many concurrent runs',
		IdempotentParameterMismatchException: 'Idempotent parameter mismatch',
		CrawlerRunningException: 'Crawler is already running',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Glue error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
