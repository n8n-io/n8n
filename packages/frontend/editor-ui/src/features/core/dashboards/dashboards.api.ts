import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	AggregateOp,
	BrokenRef,
	DashboardSpec,
	GroupByDirective,
	SortDirective,
} from '@n8n/api-types';

import type {
	Dashboard,
	DashboardListItem,
	AggregateResponse,
	DashboardActionResult,
} from '@/features/core/dashboards/dashboards.types';

type FetchDashboardsOptions = {
	skip?: number;
	take?: number;
	sortBy?: 'name:asc' | 'name:desc' | 'updatedAt:asc' | 'updatedAt:desc';
	filter?: {
		id?: string | string[];
		name?: string | string[];
		projectId?: string | string[];
		tag?: string | string[];
		archived?: boolean;
	};
};

export const fetchDashboardsApi = async (
	context: IRestApiContext,
	projectId: string,
	options?: FetchDashboardsOptions,
) => {
	const endpoint = projectId ? `/projects/${projectId}/dashboards` : '/dashboards-global';
	return await makeRestApiRequest<{ count: number; data: DashboardListItem[] }>(
		context,
		'GET',
		endpoint,
		{
			skip: options?.skip,
			take: options?.take,
			sortBy: options?.sortBy,
			filter: options?.filter,
		},
	);
};

export const fetchDashboardApi = async (
	context: IRestApiContext,
	projectId: string,
	dashboardId: string,
) => {
	return await makeRestApiRequest<Dashboard & { brokenRefs: BrokenRef[] }>(
		context,
		'GET',
		`/projects/${projectId}/dashboards/${dashboardId}`,
	);
};

export const createDashboardApi = async (
	context: IRestApiContext,
	projectId: string,
	payload: {
		name: string;
		description?: string;
		spec: DashboardSpec;
		tags?: string[];
	},
) => {
	return await makeRestApiRequest<Dashboard>(
		context,
		'POST',
		`/projects/${projectId}/dashboards`,
		payload,
	);
};

export const updateDashboardApi = async (
	context: IRestApiContext,
	projectId: string,
	dashboardId: string,
	payload: Partial<{
		name: string;
		description: string | null;
		spec: DashboardSpec;
		tags: string[];
		archived: boolean;
		/** Optimistic-concurrency token; PATCH returns 409 on mismatch. */
		expectedVersion: number;
	}>,
) => {
	return await makeRestApiRequest<Dashboard>(
		context,
		'PATCH',
		`/projects/${projectId}/dashboards/${dashboardId}`,
		payload,
	);
};

export const deleteDashboardApi = async (
	context: IRestApiContext,
	projectId: string,
	dashboardId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/projects/${projectId}/dashboards/${dashboardId}`,
	);
};

export const aggregateDataTableApi = async (
	context: IRestApiContext,
	projectId: string,
	dataTableId: string,
	payload: {
		ops: AggregateOp[];
		groupBy?: GroupByDirective[];
		filter?: unknown;
		sort?: SortDirective[];
		take?: number;
		skip?: number;
	},
) => {
	return await makeRestApiRequest<AggregateResponse>(
		context,
		'POST',
		`/projects/${projectId}/data-tables/${dataTableId}/aggregate`,
		payload,
	);
};

export type DashboardShare = {
	dashboardId: string;
	userId: string;
	role: 'viewer' | 'editor';
};

export const shareDashboardApi = async (
	context: IRestApiContext,
	projectId: string,
	dashboardId: string,
	payload: { shareWithIds: string[]; role: 'viewer' | 'editor' },
) => {
	return await makeRestApiRequest<DashboardShare[]>(
		context,
		'POST',
		`/projects/${projectId}/dashboards/${dashboardId}/share`,
		payload,
	);
};

export const unshareDashboardApi = async (
	context: IRestApiContext,
	projectId: string,
	dashboardId: string,
	userId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'POST',
		`/projects/${projectId}/dashboards/${dashboardId}/unshare`,
		{ userId },
	);
};

export const fetchDataTableColumnsApi = async (
	context: IRestApiContext,
	projectId: string,
	dataTableId: string,
) => {
	return await makeRestApiRequest<
		Array<{ id: string; name: string; type: 'string' | 'number' | 'boolean' | 'date' }>
	>(context, 'GET', `/projects/${projectId}/data-tables/${dataTableId}/columns`);
};

export const executeDashboardActionApi = async (
	context: IRestApiContext,
	projectId: string,
	dashboardId: string,
	slug: string,
	payload: {
		widgetId?: string;
		rowId?: string;
		row?: Record<string, unknown>;
		rows?: Array<Record<string, unknown>>;
		payload?: Record<string, unknown>;
		/** Set to dedupe accidental double-clicks within ~60s. */
		idempotencyKey?: string;
	},
) => {
	return await makeRestApiRequest<DashboardActionResult>(
		context,
		'POST',
		`/projects/${projectId}/dashboards/${dashboardId}/actions/${slug}`,
		payload,
	);
};
