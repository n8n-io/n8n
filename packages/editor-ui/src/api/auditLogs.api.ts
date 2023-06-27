import type { IRestApiContext, AuditLog } from '@/Interface';
import { makeRestApiRequest } from '@/utils';

const auditLogsApiRoot = '/audit-logs';

export const getAuditLogs = async (context: IRestApiContext): Promise<AuditLog[]> => {
	return makeRestApiRequest(context, 'GET', auditLogsApiRoot);
};
