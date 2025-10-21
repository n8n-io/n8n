import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleAppSyncError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		NotFoundException: 'The specified resource was not found',
		BadRequestException: 'Invalid request provided',
		UnauthorizedException: 'Unauthorized access',
		ConcurrentModificationException: 'Concurrent modification occurred',
		InternalFailureException: 'An internal service error occurred',
		LimitExceededException: 'Service limit exceeded',
		ApiKeyLimitExceededException: 'API key limit exceeded',
		ApiLimitExceededException: 'API limit exceeded',
		GraphQLSchemaException: 'GraphQL schema is invalid',
		AccessDeniedException: 'Access denied to the resource',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS AppSync error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
