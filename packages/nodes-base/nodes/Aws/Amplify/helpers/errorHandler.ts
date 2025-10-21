import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleAmplifyError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMap: { [key: string]: string } = {
		ResourceNotFoundException: 'The requested resource was not found',
		BadRequestException: 'Invalid request parameters',
		UnauthorizedException: 'Authentication failed or insufficient permissions',
		LimitExceededException: 'Service limit exceeded',
		InternalFailureException: 'Internal service error occurred',
		NotFoundException: 'Resource not found',
		DependentServiceFailureException: 'A dependent AWS service failed',
	};

	const message = errorMap[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), error as any, {
		message: `Amplify error: ${message}`,
		description: errorMessage as string,
		itemIndex,
	});
}
