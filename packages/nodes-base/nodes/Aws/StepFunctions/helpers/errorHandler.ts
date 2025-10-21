import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleStepFunctionsError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		StateMachineAlreadyExists: 'State machine with this name already exists',
		StateMachineDoesNotExist: 'The specified state machine does not exist',
		StateMachineLimitExceeded: 'State machine quota exceeded',
		InvalidDefinition: 'Invalid Amazon States Language definition',
		InvalidArn: 'Invalid ARN format',
		ExecutionAlreadyExists: 'Execution with this name already exists',
		ExecutionDoesNotExist: 'The specified execution does not exist',
		ExecutionLimitExceeded: 'Execution quota exceeded',
		InvalidExecutionInput: 'Invalid execution input JSON',
		InvalidName: 'Invalid name format',
		StateMachineDeleting: 'State machine is being deleted',
		ActivityDoesNotExist: 'The specified activity does not exist',
		ActivityAlreadyExists: 'Activity with this name already exists',
		ActivityLimitExceeded: 'Activity quota exceeded',
		TaskDoesNotExist: 'The specified task does not exist',
		TaskTimedOut: 'Task has timed out',
		InvalidOutput: 'Invalid task output JSON',
		ResourceNotFound: 'The specified resource was not found',
		TooManyTags: 'Too many tags (maximum 50 per resource)',
		InvalidToken: 'Invalid pagination token',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Step Functions error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
