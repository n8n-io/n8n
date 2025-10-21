import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleCloudFormationError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || error.Code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		AlreadyExistsException: 'Stack or resource already exists with this name',
		LimitExceededException: 'Account limit or quota exceeded',
		InsufficientCapabilitiesException: 'Missing required IAM capabilities',
		InvalidParameterException: 'Invalid parameter value or template',
		TokenAlreadyExistsException: 'Request token already used with different parameters',
		ValidationError: 'Request validation failed',
		ChangeSetNotFoundException: 'The specified change set was not found',
		InvalidChangeSetStatusException: 'Change set is not in correct status for this operation',
		StackSetNotFoundException: 'The specified stack set was not found',
		OperationInProgressException: 'Another operation is in progress',
		OperationIdAlreadyExistsException: 'Operation ID already exists',
		StaleRequestException: 'Request is stale, resource has been modified',
		StackSetNotEmptyException: 'Stack set contains stack instances',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS CloudFormation error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
