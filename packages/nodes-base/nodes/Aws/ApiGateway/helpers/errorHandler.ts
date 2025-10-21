import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleApiGatewayError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		NotFoundException: 'The specified resource was not found',
		BadRequestException: 'The request was invalid or malformed',
		TooManyRequestsException: 'Rate limit exceeded, please retry later',
		UnauthorizedException: 'Authentication failed or credentials are invalid',
		ConflictException: 'Resource conflict - may already exist',
		LimitExceededException: 'Account quota or limit exceeded',
		ServiceUnavailableException: 'Service is temporarily unavailable',
		InvalidParameterException: 'One or more parameters are invalid',
		InvalidChangeSetStatusException: 'Change set is not in the correct status',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS API Gateway error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
