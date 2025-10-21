import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleInspectorError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMap: { [key: string]: string } = {
		ResourceNotFoundException: 'The requested resource was not found',
		ValidationException: 'Invalid request parameters',
		AccessDeniedException: 'Access denied - insufficient permissions',
		ThrottlingException: 'Request throttled - too many requests',
		InternalServerException: 'Internal service error occurred',
		ServiceQuotaExceededException: 'Service quota exceeded',
		ConflictException: 'Resource already exists or conflict detected',
	};

	const message = errorMap[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), error as any, {
		message: `Inspector error: ${message}`,
		description: errorMessage as string,
		itemIndex,
	});
}
