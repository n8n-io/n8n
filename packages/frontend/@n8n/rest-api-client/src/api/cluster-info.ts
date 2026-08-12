import type { ClusterInfo } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

/**
 * The process that answered this request (`self`) plus, under the hypervisor,
 * live details of every forked child (`processes`). Because HTTP round-robins
 * across mains, `self` may report different PIDs across calls.
 */
export const getClusterProcessInfo = async (context: IRestApiContext): Promise<ClusterInfo> => {
	return await makeRestApiRequest(context, 'GET', '/cluster-info');
};
