import type {
	PoolAssignment,
	UpdateWorkerPoolAssignmentDto,
	WorkerPoolsResponse,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

const GET_STATUS_ENDPOINT = '/orchestration/worker/status';
const WORKER_POOLS_ENDPOINT = '/orchestration/worker/pools';
const WORKER_POOL_ASSIGNMENT_ENDPOINT = '/orchestration/worker/pools/assignment';

export const sendGetWorkerStatus = async (context: IRestApiContext): Promise<void> => {
	await makeRestApiRequest(context, 'POST', GET_STATUS_ENDPOINT);
};

export const getWorkerPools = async (context: IRestApiContext): Promise<WorkerPoolsResponse> => {
	return await makeRestApiRequest(context, 'GET', WORKER_POOLS_ENDPOINT);
};

export const updateWorkerPoolAssignment = async (
	context: IRestApiContext,
	dto: UpdateWorkerPoolAssignmentDto,
): Promise<PoolAssignment> => {
	return await makeRestApiRequest(context, 'PATCH', WORKER_POOL_ASSIGNMENT_ENDPOINT, dto);
};
