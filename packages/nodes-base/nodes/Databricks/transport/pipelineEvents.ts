import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError, UnexpectedError } from 'n8n-workflow';

import {
	databricksApiRequest,
	getHost,
	type DatabricksContext,
	type DatabricksCredentialType,
} from '../actions/helpers';
import { clampPageSize, collectPages, toPage, type Page, type PageLimits } from './pagination';

export const PIPELINE_EVENTS_MAX_PAGE_SIZE = 1000;
const PIPELINE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;

export const PIPELINE_EVENT_LEVELS = ['INFO', 'WARN', 'ERROR', 'METRICS'] as const;
export type PipelineEventLevel = (typeof PIPELINE_EVENT_LEVELS)[number];
export type IsoUtcTimestamp = string;

export type PipelineEvent = {
	id?: string;
	sequence?: {
		control_plane_seq_no?: number;
		data_plane_id?: { instance?: string; seq_no?: number };
	};
	event_type?: string;
	level?: PipelineEventLevel;
	message?: string;
	timestamp?: IsoUtcTimestamp;
	maturity_level?: string;
	origin?: {
		pipeline_id?: string;
		pipeline_name?: string;
		update_id?: string;
		flow_id?: string;
		flow_name?: string;
		[key: string]: unknown;
	};
	details?: { update_progress?: { state?: string }; [key: string]: unknown };
	error?: {
		fatal?: boolean;
		exceptions?: Array<{
			class_name?: string;
			error_class?: string;
			sql_state?: string;
			message?: string;
			stack?: Array<{
				declaring_class?: string;
				method_name?: string;
				file_name?: string;
				line_number?: number;
			}>;
		}>;
	};
	truncation?: { truncated_fields?: Array<{ field_name?: string }> };
};

export interface ListPipelineEventsParams {
	pipelineId: string;
	after?: IsoUtcTimestamp;
	levels?: readonly PipelineEventLevel[];
	order?: 'asc' | 'desc';
	pageSize?: number;
	pageToken?: string;
}

type PipelineEventsResponse = { events?: PipelineEvent[]; next_page_token?: string };

function isPipelineEventsResponse(value: unknown): value is PipelineEventsResponse {
	return isRecord(value) && (value.events === undefined || Array.isArray(value.events));
}

export function isPipelineEventLevel(level: string): level is PipelineEventLevel {
	return PIPELINE_EVENT_LEVELS.some((known) => known === level);
}

function isIsoUtcTimestamp(value: string): boolean {
	if (!ISO_TIMESTAMP_PATTERN.test(value)) return false;
	const parsed = new Date(value);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value.slice(0, 19));
}

export function buildPipelineEventsFilter(
	params: Pick<ListPipelineEventsParams, 'after' | 'levels'>,
): string | undefined {
	const clauses: string[] = [];
	if (params.levels?.length) {
		const invalid = params.levels.filter((level) => !isPipelineEventLevel(level));
		if (invalid.length > 0) {
			throw new UnexpectedError('Pipeline event level is not one of INFO, WARN, ERROR, METRICS', {
				extra: { levels: invalid },
			});
		}
		clauses.push(`level in (${params.levels.map((level) => `'${level}'`).join(', ')})`);
	}
	if (params.after !== undefined) {
		if (!isIsoUtcTimestamp(params.after)) {
			throw new UnexpectedError('Pipeline events cursor must be an ISO 8601 UTC timestamp', {
				extra: { after: params.after },
			});
		}
		clauses.push(`timestamp > '${params.after}'`);
	}
	return clauses.length > 0 ? clauses.join(' AND ') : undefined;
}

// The API rejects any field other than max_results next to page_token
function toQuery(params: ListPipelineEventsParams): IDataObject {
	const qs: IDataObject = {};
	const pageSize = clampPageSize(params.pageSize, PIPELINE_EVENTS_MAX_PAGE_SIZE);
	if (pageSize !== undefined) qs.max_results = pageSize;
	if (params.pageToken) {
		qs.page_token = params.pageToken;
		return qs;
	}
	const filter = buildPipelineEventsFilter(params);
	if (filter !== undefined) qs.filter = filter;
	qs.order_by = `timestamp ${params.order ?? 'asc'}`;
	return qs;
}

async function fetchPipelineEventsPage(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	host: string,
	params: ListPipelineEventsParams,
): Promise<Page<PipelineEvent>> {
	if (!PIPELINE_ID_PATTERN.test(params.pipelineId)) {
		throw new NodeOperationError(context.getNode(), 'Pipeline ID must be a UUID');
	}
	const response: unknown = await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/pipelines/${params.pipelineId}/events`,
		qs: toQuery(params),
		headers: { Accept: 'application/json' },
		json: true,
	});
	if (!isPipelineEventsResponse(response)) {
		throw new NodeOperationError(
			context.getNode(),
			'Databricks did not return a JSON list of pipeline events',
			{ description: `Check that ${host} is the URL of a Databricks workspace.` },
		);
	}
	return toPage(response.events, response.next_page_token);
}

export async function listPipelineEvents(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListPipelineEventsParams,
): Promise<Page<PipelineEvent>> {
	return await fetchPipelineEventsPage(
		context,
		credentialType,
		await getHost(context, credentialType),
		params,
	);
}

export async function listAllPipelineEvents(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListPipelineEventsParams,
	limits: PageLimits,
): Promise<Page<PipelineEvent>> {
	const host = await getHost(context, credentialType);
	return await collectPages(
		async (pageToken) =>
			await fetchPipelineEventsPage(context, credentialType, host, { ...params, pageToken }),
		limits,
		params.pageToken,
	);
}
