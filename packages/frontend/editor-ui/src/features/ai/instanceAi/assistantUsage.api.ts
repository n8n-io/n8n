import type {
	AssistantUsageResponse,
	AssistantUsageUsersResponse,
	AssistantUsageUsersSortBy,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export type AssistantUsageFilter = {
	startDate: Date;
	endDate: Date;
	/** Only the usage in this project. */
	projectId?: string;
};

export type AssistantUsageUsersQuery = AssistantUsageFilter & {
	skip: number;
	take: number;
	sortBy?: AssistantUsageUsersSortBy;
};

function toRangeQuery({ startDate, endDate, projectId }: AssistantUsageFilter) {
	return {
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
		...(projectId ? { projectId } : {}),
	};
}

/** Totals and daily usage. The days are in the time zone of the browser. */
export async function fetchAssistantUsage(
	context: IRestApiContext,
	filter: AssistantUsageFilter,
): Promise<AssistantUsageResponse> {
	return await makeRestApiRequest(context, 'GET', '/assistant/usage', {
		...toRangeQuery(filter),
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});
}

export async function fetchAssistantUsageUsers(
	context: IRestApiContext,
	{ skip, take, sortBy, ...filter }: AssistantUsageUsersQuery,
): Promise<AssistantUsageUsersResponse> {
	return await makeRestApiRequest(context, 'GET', '/assistant/usage/users', {
		...toRangeQuery(filter),
		skip,
		take,
		...(sortBy ? { sortBy } : {}),
	});
}
