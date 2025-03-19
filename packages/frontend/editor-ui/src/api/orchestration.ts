import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

const GET_STATUS_ENDPOINT = '/orchestration/worker/status';

export const sendGetWorkerStatus = async (context: IRestApiContext): Promise<void> => {
	await makeRestApiRequest(context, 'POST', GET_STATUS_ENDPOINT);
};
