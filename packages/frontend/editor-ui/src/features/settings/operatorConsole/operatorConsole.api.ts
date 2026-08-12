import type { OperatorLogFilter, OperatorLogHost, OperatorLogReadResult } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const BASE = '/operator-console';

/**
 * Flattens a filter into query params. Array labels travel comma-separated so
 * the query string stays readable in the network pane while debugging.
 */
function filterToQuery(filter: OperatorLogFilter): Record<string, string> {
	const query: Record<string, string> = {};

	if (filter.minLevel) query.minLevel = filter.minLevel;
	if (filter.scopes?.length) query.scopes = filter.scopes.join(',');
	if (filter.hostIds?.length) query.hostIds = filter.hostIds.join(',');
	if (filter.roles?.length) query.roles = filter.roles.join(',');
	if (filter.executionId) query.executionId = filter.executionId;
	if (filter.grep) query.grep = filter.grep;

	return query;
}

export async function fetchOperatorLogHosts(context: IRestApiContext): Promise<OperatorLogHost[]> {
	return await makeRestApiRequest<OperatorLogHost[]>(context, 'GET', `${BASE}/hosts`);
}

export async function fetchOperatorLogs(
	context: IRestApiContext,
	options: { filter: OperatorLogFilter; limit: number; since?: string },
): Promise<OperatorLogReadResult> {
	const query: Record<string, string | number> = {
		...filterToQuery(options.filter),
		limit: options.limit,
	};

	if (options.since) query.since = options.since;

	return await makeRestApiRequest<OperatorLogReadResult>(context, 'GET', `${BASE}/logs`, query);
}

/**
 * Starts or renews the tail lease for this push session. The `push-ref` header
 * added by `makeRestApiRequest` is what binds the lease to this browser's socket.
 */
export async function startOperatorLogTail(
	context: IRestApiContext,
	filter: OperatorLogFilter,
): Promise<void> {
	await makeRestApiRequest(context, 'POST', `${BASE}/tail`, { ...filter });
}

export async function stopOperatorLogTail(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${BASE}/tail`);
}
