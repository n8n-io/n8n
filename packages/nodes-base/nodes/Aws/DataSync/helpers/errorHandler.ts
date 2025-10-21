import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleDataSyncError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMap: { [key: string]: string } = {
		InvalidRequestException: 'Invalid request parameters',
		InternalException: 'Internal service error occurred',
		ResourceNotFoundException: 'The requested resource was not found',
		ResourceAlreadyExistsException: 'Resource already exists',
		ResourceInUseException: 'Resource is currently in use',
		UnauthorizedException: 'Unauthorized - check credentials',
		ThrottlingException: 'Request throttled - too many requests',
	};

	const message = errorMap[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), error as any, {
		message: `DataSync error: ${message}`,
		description: errorMessage as string,
		itemIndex,
	});
}
