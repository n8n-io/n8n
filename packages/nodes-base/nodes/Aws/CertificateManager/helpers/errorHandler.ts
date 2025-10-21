import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleCertificateManagerError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified certificate was not found',
		InvalidDomainValidationOptionsException: 'Invalid domain validation options',
		InvalidArnException: 'Invalid certificate ARN',
		LimitExceededException: 'Certificate limit exceeded',
		ResourceInUseException: 'Certificate is currently in use',
		RequestInProgressException: 'A certificate request is already in progress',
		TooManyTagsException: 'Too many tags for the certificate',
		ValidationException: 'Validation failed',
		InvalidStateException: 'Certificate is in invalid state for this operation',
		InvalidParameterException: 'Invalid parameter provided',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Certificate Manager error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
