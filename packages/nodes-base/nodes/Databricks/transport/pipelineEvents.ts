import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError, UnexpectedError } from 'n8n-workflow';

import {
	databricksApiRequest,
	getHost,
	type DatabricksContext,
	type DatabricksCredentialType,
} from '../actions/helpers';

const DEFAULT_MAX_PAGES = 40;
const PIPELINE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;

export const PIPELINE_EVENT_LEVELS = ['INFO', 'WARN', 'ERROR', 'METRICS'] as const;
export type PipelineEventLevel = (typeof PIPELINE_EVENT_LEVELS)[number];

export type PipelineEvent = {
	id?: string;
	sequence?: IDataObject;
	event_type?: string;
	level?: PipelineEventLevel;
	message?: string;
	/** ISO 8601 timestamp of the event. */
	timestamp?: string;
	maturity_level?: string;
	origin?: {
		pipeline_id?: string;
		pipeline_name?: string;
		update_id?: string;
		flow_id?: string;
		flow_name?: string;
		[key: string]: unknown;
	};
	details?: IDataObject;
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
};

export interface ListPipelineEventsParams {
	pipelineId: string;
	/** ISO 8601 UTC timestamp; only events strictly after this instant. */
	after?: string;
	levels?: PipelineEventLevel[];
	order?: 'asc' | 'desc';
	maxResults?: number;
	pageToken?: string;
}

export interface PipelineEventsPage {
	events: PipelineEvent[];
	nextPageToken?: string;
}

type PipelineEventsResponse = { events?: PipelineEvent[]; next_page_token?: string };

function isPipelineEventLevel(level: string): level is PipelineEventLevel {
	return (PIPELINE_EVENT_LEVELS as readonly string[]).includes(level);
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
	if (params.maxResults !== undefined) qs.max_results = params.maxResults;
	if (params.pageToken !== undefined) {
		qs.page_token = params.pageToken;
		return qs;
	}
	const filter = buildPipelineEventsFilter(params);
	if (filter !== undefined) qs.filter = filter;
	qs.order_by = `timestamp ${params.order ?? 'asc'}`;
	return qs;
}

export async function listPipelineEvents(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListPipelineEventsParams,
): Promise<PipelineEventsPage> {
	if (!PIPELINE_ID_PATTERN.test(params.pipelineId)) {
		throw new NodeOperationError(context.getNode(), 'Pipeline ID must be a UUID');
	}
	const host = await getHost(context, credentialType);
	const response: PipelineEventsResponse = await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/pipelines/${params.pipelineId}/events`,
		qs: toQuery(params),
		headers: { Accept: 'application/json' },
		json: true,
	});
	return { events: response.events ?? [], nextPageToken: response.next_page_token || undefined };
}

export async function listAllPipelineEvents(
	context: DatabricksContext,
	credentialType: DatabricksCredentialType,
	params: ListPipelineEventsParams,
	maxPages = DEFAULT_MAX_PAGES,
): Promise<PipelineEventsPage> {
	const events: PipelineEvent[] = [];
	let pageToken = params.pageToken;
	for (let page = 0; page < maxPages; page++) {
		const result = await listPipelineEvents(context, credentialType, { ...params, pageToken });
		events.push(...result.events);
		pageToken = result.nextPageToken;
		if (pageToken === undefined) break;
	}
	return { events, nextPageToken: pageToken };
}
