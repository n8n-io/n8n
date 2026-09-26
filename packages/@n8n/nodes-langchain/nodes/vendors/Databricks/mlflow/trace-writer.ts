import { isRecord } from '@n8n/utils/is-record';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { OperationalError, type IDataObject } from 'n8n-workflow';

import type { CollectedTrace, MlflowSpan } from './types';
import { MLFLOW_ATTRIBUTE, MLFLOW_TRACE_METADATA } from './types';

/**
 * Endpoints, as verified live against a workspace. The generations are mixed on
 * purpose: experiments and upload credentials are 2.0, trace creation is 3.0.
 * `POST /api/2.0/mlflow/traces` is the older StartTrace API and rejects this
 * payload with "`experiment_id` is missing".
 */
const EXPERIMENT_GET_BY_NAME = '/api/2.0/mlflow/experiments/get-by-name';
const EXPERIMENT_CREATE = '/api/2.0/mlflow/experiments/create';
const TRACE_CREATE = '/api/3.0/mlflow/traces';
const uploadCredentialsPath = (traceId: string) =>
	`/api/2.0/mlflow/traces/${encodeURIComponent(traceId)}/credentials-for-data-upload`;

const MAX_PREVIEW_CHARS = 1_000;
const MAX_FAILURE_DETAIL_CHARS = 500;

export interface MlflowResponse {
	status: number;
	body: unknown;
}

/**
 * A request against the workspace API, already carrying auth and the partner
 * User-Agent. It reports the status instead of throwing, because a missing
 * experiment is a 404 that this module handles rather than an error.
 */
export type MlflowRequest = (options: {
	method: 'GET' | 'POST';
	path: string;
	qs?: Record<string, string>;
	body?: IDataObject;
}) => Promise<MlflowResponse>;

/**
 * A PUT to the signed URL the workspace hands back. Deliberately separate from
 * `MlflowRequest`: the URL already carries its own SAS credential in the query
 * string and points at a storage host, not the workspace, so the workspace
 * bearer token must not be attached to it.
 */
export type SignedUpload = (options: { url: string; body: string }) => Promise<void>;

export interface TraceWriterOptions {
	request: MlflowRequest;
	upload: SignedUpload;
	/** Resolved experiment id; see `ensureExperiment`. */
	experimentId: string;
}

/** Pulls the workspace's own error code and message out of a failure body. */
function describeFailure(body: unknown): string {
	if (!isRecord(body)) return '';
	const code = typeof body.error_code === 'string' ? body.error_code : '';
	const message = typeof body.message === 'string' ? body.message : '';
	return sanitizeErrorDetail([code, message].filter(Boolean).join(': '), MAX_FAILURE_DETAIL_CHARS);
}

function assertOk(response: MlflowResponse, what: string): unknown {
	if (response.status < 200 || response.status >= 300) {
		const detail = describeFailure(response.body);
		throw new OperationalError(
			`Databricks ${what} failed with HTTP ${response.status}${detail ? ` (${detail})` : ''}`,
		);
	}
	return response.body;
}

/**
 * The default experiment for a workflow, matching the path the RFC settled on.
 */
export function defaultExperimentName(workflowId: string): string {
	return `/Shared/n8n-workflows-${workflowId}`;
}

/**
 * Looks the experiment up by name and creates it when it does not exist.
 *
 * A missing experiment answers 404 `RESOURCE_DOES_NOT_EXIST` rather than an
 * empty result, so the create is driven off that error.
 */
export async function ensureExperiment(
	request: MlflowRequest,
	experimentName: string,
): Promise<string> {
	const found = await request({
		method: 'GET',
		path: EXPERIMENT_GET_BY_NAME,
		qs: { experiment_name: experimentName },
	});

	if (found.status === 200 && isRecord(found.body) && isRecord(found.body.experiment)) {
		const id = found.body.experiment.experiment_id;
		if (typeof id === 'string') return id;
	}
	// Anything other than "not found" is a real problem - a permission failure
	// must not be mistaken for a missing experiment and answered with a create.
	if (found.status !== 404) assertOk(found, 'experiment lookup');

	const createResponse = await request({
		method: 'POST',
		path: EXPERIMENT_CREATE,
		body: { name: experimentName },
	});

	// Two first runs of the same workflow can both see 404 above and race to
	// create the shared experiment. The loser gets this error rather than a
	// missing experiment, so look up the id the winner created instead of
	// failing the run.
	if (
		createResponse.status >= 400 &&
		isRecord(createResponse.body) &&
		createResponse.body.error_code === 'RESOURCE_ALREADY_EXISTS'
	) {
		const afterRace = await request({
			method: 'GET',
			path: EXPERIMENT_GET_BY_NAME,
			qs: { experiment_name: experimentName },
		});
		if (
			afterRace.status === 200 &&
			isRecord(afterRace.body) &&
			isRecord(afterRace.body.experiment)
		) {
			const id = afterRace.body.experiment.experiment_id;
			if (typeof id === 'string') return id;
		}
	}

	const created = assertOk(createResponse, 'experiment create');
	if (isRecord(created) && typeof created.experiment_id === 'string') {
		return created.experiment_id;
	}
	throw new OperationalError('Databricks did not return an experiment id');
}

/**
 * The previews are the two columns of the trace list, so they carry the question
 * and the answer as plain text. The serialized span attribute is the fallback
 * for a run that ended before the agent produced either.
 */
function preview(
	text: string | undefined,
	span: MlflowSpan | undefined,
	attribute: string,
): string {
	return (text ?? span?.attributes[attribute] ?? '').slice(0, MAX_PREVIEW_CHARS);
}

/**
 * Builds the TraceInfo. `request_time` is an ISO timestamp and
 * `execution_duration` a duration string such as `1.5s` - the workspace
 * normalises them to `...Z` and `1.500s` in its reply.
 */
export function buildTraceInfo(trace: CollectedTrace, experimentId: string) {
	const root = trace.spans.find((span) => span.span_id === trace.rootSpanId);
	const tags: Record<string, string> = { 'n8n.source': 'n8n' };
	if (trace.workflowId) tags['n8n.workflowId'] = trace.workflowId;
	if (trace.nodeName) tags['n8n.node'] = trace.nodeName;

	// The run total, so the trace list shows cost per run without opening a span.
	const usage = trace.tokenUsage;
	const traceMetadata: Record<string, string> = {};
	if (usage) {
		traceMetadata[MLFLOW_TRACE_METADATA.TokenUsage] = JSON.stringify({
			input_tokens: usage.inputTokens,
			output_tokens: usage.outputTokens,
			total_tokens: usage.totalTokens,
		});
	}

	return {
		trace_id: trace.traceId,
		// The n8n execution, so a run in the workspace maps back to one here.
		client_request_id: trace.executionId,
		trace_location: {
			type: 'MLFLOW_EXPERIMENT',
			mlflow_experiment: { experiment_id: experimentId },
		},
		request_preview: preview(trace.requestPreview, root, MLFLOW_ATTRIBUTE.SpanInputs),
		response_preview: preview(trace.responsePreview, root, MLFLOW_ATTRIBUTE.SpanOutputs),
		request_time: new Date(trace.startTimeMs).toISOString(),
		execution_duration: `${(trace.endTimeMs - trace.startTimeMs) / 1000}s`,
		state: trace.state,
		trace_metadata: traceMetadata,
		tags,
	};
}

/**
 * Writes one trace, in the three steps the workspace requires:
 *
 * 1. `POST /api/3.0/mlflow/traces` registers the TraceInfo.
 * 2. `GET .../credentials-for-data-upload` returns a signed URL for the spans.
 * 3. A plain `PUT` of `{ spans: [...] }` to that URL.
 *
 * Step 3 is a plain PUT even though the credential type reads `AZURE_SAS_URI`:
 * the signed URL points at the Databricks Files API, not Azure Blob storage, so
 * the `x-ms-blob-type` header that MLflow's own client sends is not needed.
 */
export async function writeTrace(
	options: TraceWriterOptions,
	trace: CollectedTrace,
): Promise<void> {
	const { request, upload, experimentId } = options;

	assertOk(
		await request({
			method: 'POST',
			path: TRACE_CREATE,
			body: { trace: { trace_info: buildTraceInfo(trace, experimentId) } },
		}),
		'trace create',
	);

	const credentials = assertOk(
		await request({ method: 'GET', path: uploadCredentialsPath(trace.traceId) }),
		'upload credentials',
	);

	const signedUri =
		isRecord(credentials) && isRecord(credentials.credential_info)
			? credentials.credential_info.signed_uri
			: undefined;
	if (typeof signedUri !== 'string' || signedUri.length === 0) {
		throw new OperationalError('Databricks did not return an upload URL for the trace data');
	}

	await upload({
		url: signedUri,
		body: JSON.stringify({ spans: trace.spans }),
	});
}
