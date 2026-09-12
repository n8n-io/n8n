import type { InstanceReportingStatus } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getInstanceReportingStatus(
	context: IRestApiContext,
): Promise<InstanceReportingStatus> {
	return await makeRestApiRequest(context, 'GET', '/instance-reporting/status');
}
