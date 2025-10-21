import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleNeptuneError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<void> {
	const errorCode = error.Error?.Code || error.code || 'UnknownError';
	const errorMessage = error.Error?.Message || error.message || 'An unknown error occurred';

	const errorMessages: { [key: string]: string } = {
		DBClusterNotFoundFault: 'The specified Neptune cluster was not found',
		DBInstanceNotFoundFault: 'The specified Neptune instance was not found',
		DBClusterAlreadyExistsFault: 'A cluster with this identifier already exists',
		DBInstanceAlreadyExistsFault: 'An instance with this identifier already exists',
		InvalidDBClusterStateFault: 'The cluster is not in a valid state for this operation',
		InvalidDBInstanceStateFault: 'The instance is not in a valid state for this operation',
		DBClusterQuotaExceededFault: 'Cluster quota exceeded for your account',
		DBInstanceQuotaExceededFault: 'Instance quota exceeded for your account',
		InsufficientDBClusterCapacityFault: 'Insufficient cluster capacity',
		InsufficientDBInstanceCapacityFault: 'Insufficient instance capacity',
		InvalidParameterValueException: 'Invalid parameter value provided',
		InvalidParameterCombinationException: 'Invalid combination of parameters',
		DBClusterSnapshotNotFoundFault: 'The specified cluster snapshot was not found',
		InvalidDBClusterSnapshotStateFault: 'The snapshot is not in a valid state',
		SnapshotQuotaExceededFault: 'Snapshot quota exceeded',
		StorageQuotaExceededFault: 'Storage quota exceeded',
	};

	const message = errorMessages[errorCode as string] || errorMessage;

	throw new NodeApiError(this.getNode(), {
		message: `AWS Neptune error: ${message}`,
		description: `Error code: ${errorCode}`,
	}, { itemIndex });
}
