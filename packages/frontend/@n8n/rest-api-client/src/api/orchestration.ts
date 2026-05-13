import type {
	UpdateWorkerPoolDefaultsDto,
	WorkerPoolDefaults,
	WorkerPoolsResponse,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

const GET_STATUS_ENDPOINT = '/orchestration/worker/status';
const WORKER_POOLS_ENDPOINT = '/orchestration/worker/pools';
const WORKER_POOL_DEFAULTS_ENDPOINT = '/orchestration/worker/pools/defaults';

export const sendGetWorkerStatus = async (context: IRestApiContext): Promise<void> => {
	await makeRestApiRequest(context, 'POST', GET_STATUS_ENDPOINT);
};

export const getWorkerPools = async (context: IRestApiContext): Promise<WorkerPoolsResponse> => {
	return await makeRestApiRequest(context, 'GET', WORKER_POOLS_ENDPOINT);
};

export const updateWorkerPoolDefaults = async (
	context: IRestApiContext,
	dto: UpdateWorkerPoolDefaultsDto,
): Promise<WorkerPoolDefaults> => {
	return await makeRestApiRequest(context, 'PATCH', WORKER_POOL_DEFAULTS_ENDPOINT, dto);
};
