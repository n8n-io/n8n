import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	databricksApiRequest,
	getHost,
	type DatabricksContext,
	type DatabricksCredentialType,
} from '../actions/helpers';
import type { DatabricksJobRun } from '../actions/interfaces';
import { clampPageSize, collectPages, toPage, type Page, type PageLimits } from './pagination';

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
	return (
		isRecord(value) &&
		(value.runs === undefined || (Array.isArray(value.runs) && value.runs.every(isRecord)))
	);
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
	if (params.pageToken) qs.page_token = params.pageToken;
	return qs;
}

async function fetchJobRunsPage(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	host: string,
	params: ListJobRunsParams,
): Promise<Page<DatabricksJobRun>> {
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

export async function listJobRuns(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListJobRunsParams = {},
): Promise<Page<DatabricksJobRun>> {
	return await fetchJobRunsPage(
		context,
		credentialType,
		await getHost(context, credentialType),
		params,
	);
}

export async function listAllJobRuns(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListJobRunsParams,
	limits: PageLimits,
): Promise<Page<DatabricksJobRun>> {
	const host = await getHost(context, credentialType);
	return await collectPages(
		async (pageToken) =>
			await fetchJobRunsPage(context, credentialType, host, { ...params, pageToken }),
		limits,
		params.pageToken,
	);
}
