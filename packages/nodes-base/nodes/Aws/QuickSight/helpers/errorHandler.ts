import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleQuickSightError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMap: { [key: string]: string } = {
		ResourceNotFoundException: 'The requested resource was not found',
		ResourceExistsException: 'Resource already exists',
		InvalidParameterValueException: 'Invalid parameter value provided',
		AccessDeniedException: 'Access denied - insufficient permissions',
		ThrottlingException: 'Request throttled - too many requests',
		LimitExceededException: 'Service limit exceeded',
		ConflictException: 'Resource conflict detected',
		UnsupportedUserEditionException: 'Operation not supported for user edition',
		SessionLifetimeInMinutesInvalidException: 'Invalid session lifetime',
	};

	const message = errorMap[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), error as any, {
		message: `QuickSight error: ${message}`,
		description: errorMessage as string,
		itemIndex,
	});
}
