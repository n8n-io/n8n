import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleECSError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		ClusterNotFoundException: 'The specified cluster was not found',
		ServiceNotFoundException: 'The specified service was not found',
		TaskNotFoundException: 'The specified task was not found',
		InvalidParameterException: 'Invalid parameter value provided',
		ClusterContainsServicesException: 'Cluster contains services and cannot be deleted',
		ClusterContainsTasksException: 'Cluster contains tasks and cannot be deleted',
		ServerException: 'Internal server error occurred',
		ClientException: 'Client request error',
		LimitExceededException: 'Resource limit exceeded',
		PlatformUnknownException: 'Unknown platform specified',
		PlatformTaskDefinitionIncompatibilityException: 'Task definition incompatible with platform',
		UnsupportedFeatureException: 'Feature not supported in this region',
		AccessDeniedException: 'Access denied to this resource',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS ECS error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
