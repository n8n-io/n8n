import { isRecord } from '@n8n/utils/is-record';
import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	type DatabricksCredentialType,
} from '../actions/helpers';
import { withLegibleErrors } from './shared';

export const PIPELINES_PAGE_SIZE = 100;
export const PIPELINES_SEARCH_MAX_PAGES = 10;

type PipelineSummary = { pipeline_id: string; name?: string };

type PipelinesListResponse = { statuses?: unknown[]; next_page_token?: string | null };

function isPipelineSummary(value: unknown): value is PipelineSummary {
	return (
		isRecord(value) &&
		typeof value.pipeline_id === 'string' &&
		(value.name === undefined || typeof value.name === 'string')
	);
}

function isPipelinesListResponse(value: unknown): value is PipelinesListResponse {
	return (
		isRecord(value) &&
		(value.statuses === undefined || Array.isArray(value.statuses)) &&
		(value.next_page_token === undefined ||
			value.next_page_token === null ||
			typeof value.next_page_token === 'string')
	);
}

async function fetchPipelinesPage(
	context: ILoadOptionsFunctions,
	credentialType: DatabricksCredentialType,
	host: string,
	pageToken?: string,
): Promise<PipelinesListResponse> {
	const qs: IDataObject = { max_results: PIPELINES_PAGE_SIZE };
	if (pageToken) qs.page_token = pageToken;
	const response: unknown = await withLegibleErrors(
		async () =>
			await databricksApiRequest(context, credentialType, {
				method: 'GET',
				url: `${host}/api/2.0/pipelines`,
				qs,
				headers: { Accept: 'application/json' },
				json: true,
			}),
	);
	if (!isPipelinesListResponse(response)) {
		throw new NodeOperationError(
			context.getNode(),
			'Databricks did not return a JSON list of pipelines',
			{ description: `Check that ${host} is the URL of a Databricks workspace.` },
		);
	}
	return response;
}

// The API's `name LIKE` filter is case-sensitive and ignores the ID, so search scans pages instead
export async function getPipelines(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);
	const term = filter ? filter.toLowerCase() : undefined;
	const matches = (pipeline: PipelineSummary) =>
		term === undefined ||
		(pipeline.name ?? '').toLowerCase().includes(term) ||
		pipeline.pipeline_id.toLowerCase().includes(term);
	const toListItem = (pipeline: PipelineSummary) => ({
		name: pipeline.name ?? pipeline.pipeline_id,
		value: pipeline.pipeline_id,
		url: `${host}/pipelines/${pipeline.pipeline_id}`,
	});

	const results: INodeListSearchResult['results'] = [];
	const maxPages = term === undefined ? 1 : PIPELINES_SEARCH_MAX_PAGES;
	let pageToken = paginationToken;
	for (let page = 0; page < maxPages && (page === 0 || pageToken); page++) {
		const response = await fetchPipelinesPage(this, credentialType, host, pageToken);
		results.push(
			...(response.statuses ?? []).filter(isPipelineSummary).filter(matches).map(toListItem),
		);
		pageToken = response.next_page_token || undefined;
	}
	return { results, paginationToken: pageToken };
}
