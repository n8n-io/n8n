import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleEFSError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.__type || error.code || 'UnknownError';
	const errorMessage = error.message || error.Message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		FileSystemNotFound: 'The specified file system was not found',
		FileSystemAlreadyExists: 'A file system with this token already exists',
		FileSystemInUse: 'File system is in use',
		FileSystemLimitExceeded: 'File system limit exceeded',
		MountTargetNotFound: 'The specified mount target was not found',
		MountTargetConflict: 'Mount target conflict in subnet',
		SecurityGroupNotFound: 'Security group not found',
		SubnetNotFound: 'Subnet not found',
		BadRequest: 'Invalid request',
		InsufficientThroughputCapacity: 'Insufficient throughput capacity',
		InvalidPolicyDocument: 'Invalid policy document',
		ThroughputLimitExceeded: 'Throughput limit exceeded',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS EFS error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
