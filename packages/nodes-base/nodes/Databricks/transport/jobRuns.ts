import type { IDataObject } from 'n8n-workflow';

import {
	databricksApiRequest,
	getHost,
	type DatabricksContext,
	type DatabricksCredentialType,
} from '../actions/helpers';

export const JOB_RUNS_MAX_PAGE_SIZE = 25;
const DEFAULT_MAX_PAGES = 40;

export type JobRunStatus = {
	state?: string;
	termination_details?: { code?: string; type?: string; message?: string };
};

export type JobRunTask = {
	task_key?: string;
	run_id?: number;
	status?: JobRunStatus;
	state?: { life_cycle_state?: string; result_state?: string; state_message?: string };
	start_time?: number;
	end_time?: number;
	run_page_url?: string;
};

export type JobRun = {
	job_id?: number;
	run_id: number;
	run_name?: string;
	run_type?: string;
	run_page_url?: string;
	trigger?: string;
	creator_user_name?: string;
	start_time?: number;
	end_time?: number;
	queue_duration?: number;
	run_duration?: number;
	status?: JobRunStatus;
	state?: { life_cycle_state?: string; result_state?: string; state_message?: string };
	/** With `expandTasks`, at most 100 tasks; `has_more` marks a longer list. */
	tasks?: JobRunTask[];
	has_more?: boolean;
	next_page_token?: string;
	job_parameters?: Array<{ name?: string; default?: string; value?: string }>;
};

export interface ListJobRunsParams {
	jobId?: number;
	/** Epoch milliseconds; runs that started at or after this instant. */
	startTimeFrom?: number;
	/** Epoch milliseconds; runs that started at or before this instant. */
	startTimeTo?: number;
	state?: 'active' | 'completed';
	expandTasks?: boolean;
	/** Clamped to the API range of 1 to 25 runs per page. */
	limit?: number;
	pageToken?: string;
}

export interface JobRunsPage {
	runs: JobRun[];
	nextPageToken?: string;
}

type JobRunsListResponse = { runs?: JobRun[]; next_page_token?: string };

function toQuery(params: ListJobRunsParams): IDataObject {
	const qs: IDataObject = {};
	if (params.jobId !== undefined) qs.job_id = params.jobId;
	if (params.startTimeFrom !== undefined) qs.start_time_from = params.startTimeFrom;
	if (params.startTimeTo !== undefined) qs.start_time_to = params.startTimeTo;
	if (params.state === 'active') qs.active_only = true;
	if (params.state === 'completed') qs.completed_only = true;
	if (params.expandTasks) qs.expand_tasks = true;
	if (params.limit !== undefined) {
		qs.limit = Math.min(Math.max(Math.trunc(params.limit), 1), JOB_RUNS_MAX_PAGE_SIZE);
	}
	if (params.pageToken !== undefined) qs.page_token = params.pageToken;
	return qs;
}

export async function listJobRuns(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListJobRunsParams = {},
): Promise<JobRunsPage> {
	const host = await getHost(context, credentialType);
	const response: JobRunsListResponse = await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${host}/api/2.2/jobs/runs/list`,
		qs: toQuery(params),
		headers: { Accept: 'application/json' },
		json: true,
	});
	return { runs: response.runs ?? [], nextPageToken: response.next_page_token || undefined };
}

export async function listAllJobRuns(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListJobRunsParams = {},
	maxPages = DEFAULT_MAX_PAGES,
): Promise<JobRunsPage> {
	const runs: JobRun[] = [];
	let pageToken = params.pageToken;
	for (let page = 0; page < maxPages; page++) {
		const result = await listJobRuns(context, credentialType, { ...params, pageToken });
		runs.push(...result.runs);
		pageToken = result.nextPageToken;
		if (pageToken === undefined) break;
	}
	return { runs, nextPageToken: pageToken };
}
