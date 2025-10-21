import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleSecretsManagerError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ResourceNotFoundException: 'The specified secret was not found',
		InvalidParameterException: 'Invalid parameter provided',
		InvalidRequestException: 'The request was invalid',
		ResourceExistsException: 'A secret with this name already exists',
		DecryptionFailure: 'Failed to decrypt the secret value',
		InternalServiceError: 'An internal service error occurred',
		LimitExceededException: 'Service limit exceeded',
		MalformedPolicyDocumentException: 'The resource policy is malformed',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Secrets Manager error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
