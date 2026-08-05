import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface AuditLogEventRecord {
	id: string;
	eventName: string;
	message: string;
	ts: string;
	payload: unknown;
}

export interface AuditLogEventList {
	data: AuditLogEventRecord[];
	count: number;
}

export async function getAuditLogEvents(
	context: IRestApiContext,
	options: { skip?: number; take?: number; prefix?: string } = {},
): Promise<AuditLogEventList> {
	return await makeRestApiRequest(context, 'GET', '/eventbus/audit-log-events', { ...options });
}
