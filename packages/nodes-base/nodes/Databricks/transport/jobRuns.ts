import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	databricksApiRequest,
	getHost,
	type DatabricksContext,
	type DatabricksCredentialType,
} from '../actions/helpers';
import type { DatabricksJobRun } from '../actions/interfaces';
import {
	clampPageSize,
	collectPages,
	DEFAULT_MAX_PAGES,
	isJsonObject,
	toPage,
	type Page,
} from './pagination';

export const JOB_RUNS_MAX_PAGE_SIZE = 25;

export interface ListJobRunsParams {
	jobId?: number;
	startTimeFromMs?: number;
	startTimeToMs?: number;
	state?: 'active' | 'completed';
	expandTasks?: boolean;
	pageSize?: number;
	pageToken?: string;
}

type JobRunsListResponse = { runs?: DatabricksJobRun[]; next_page_token?: string };

function isJobRunsListResponse(value: unknown): value is JobRunsListResponse {
	return isJsonObject(value) && (value.runs === undefined || Array.isArray(value.runs));
}

function toQuery(params: ListJobRunsParams): IDataObject {
	const qs: IDataObject = {};
	if (params.jobId !== undefined) qs.job_id = params.jobId;
	if (params.startTimeFromMs !== undefined) qs.start_time_from = params.startTimeFromMs;
	if (params.startTimeToMs !== undefined) qs.start_time_to = params.startTimeToMs;
	if (params.state === 'active') qs.active_only = true;
	if (params.state === 'completed') qs.completed_only = true;
	if (params.expandTasks) qs.expand_tasks = true;
	const limit = clampPageSize(params.pageSize, JOB_RUNS_MAX_PAGE_SIZE);
	if (limit !== undefined) qs.limit = limit;
	if (params.pageToken !== undefined) qs.page_token = params.pageToken;
	return qs;
}

export async function listJobRuns(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListJobRunsParams = {},
): Promise<Page<DatabricksJobRun>> {
	const host = await getHost(context, credentialType);
	const response: unknown = await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${host}/api/2.2/jobs/runs/list`,
		qs: toQuery(params),
		headers: { Accept: 'application/json' },
		json: true,
	});
	if (!isJobRunsListResponse(response)) {
		throw new NodeOperationError(
			context.getNode(),
			'Databricks did not return a JSON list of job runs',
			{ description: `Check that ${host} is the URL of a Databricks workspace.` },
		);
	}
	return toPage(response.runs, response.next_page_token);
}

export async function listAllJobRuns(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListJobRunsParams = {},
	maxPages = DEFAULT_MAX_PAGES,
): Promise<Page<DatabricksJobRun>> {
	return await collectPages(
		async (pageToken) => await listJobRuns(context, credentialType, { ...params, pageToken }),
		params.pageToken,
		maxPages,
	);
}
