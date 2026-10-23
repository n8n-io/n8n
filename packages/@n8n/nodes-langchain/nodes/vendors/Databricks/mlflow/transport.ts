import { proxyFetch } from '@n8n/ai-utilities';
import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import {
	getCredentialAllowedDomains,
	NodeApiError,
	NodeOperationError,
	OperationalError,
	type IExecuteFunctions,
} from 'n8n-workflow';

import { assertHttpsHost } from '@utils/databricks/constants';
import {
	DATABRICKS_CREDENTIAL_TYPE,
	type DatabricksOAuth2Credential,
} from '@utils/databricks/token-provider';

import type { MlflowRequest, MlflowResponse, SignedUpload } from './trace-writer';

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Not `ignoreHttpStatusErrors`: a non-2xx must reject for core's OAuth2
 * refresh-and-retry to run (it only fires on a rejection). This turns the
 * `NodeApiError` that rejection produces back into the `{status, body}` shape
 * `request` reports to its caller.
 */
function toMlflowResponse(error: unknown): MlflowResponse {
	if (error instanceof NodeApiError && error.httpCode) {
		return { status: Number(error.httpCode), body: error.context.data ?? {} };
	}
	throw error;
}

/**
 * `request` goes through core's `httpRequestWithAuthentication` - a plain REST
 * call, not an SDK handoff like the chat model, so core's own OAuth2 refresh
 * covers it. `upload` stays on `proxyFetch`: the signed URL is unauthenticated
 * and points at a storage host, not the workspace.
 */
export function createMlflowTransport(
	ctx: IExecuteFunctions,
	credential: DatabricksOAuth2Credential,
): { request: MlflowRequest; upload: SignedUpload } {
	assertHttpsHost(ctx, credential.host);
	const host = credential.host.replace(/\/$/, '');
	const egressFilter = ctx.helpers.getSecureEgressFilter();
	const cancelSignal = ctx.getExecutionCancelSignal();

	const allowedDomains = getCredentialAllowedDomains({
		node: ctx.getNode(),
		credentialData: credential,
		credentialOwnedSurface: true,
		nodeEndpointUrl: host,
	});

	const request: MlflowRequest = async ({ method, path, qs, body }) => {
		try {
			const response = await ctx.helpers.httpRequestWithAuthentication.call(
				ctx,
				DATABRICKS_CREDENTIAL_TYPE,
				{
					method,
					url: `${host}${path}`,
					qs,
					body,
					headers: { 'User-Agent': DATABRICKS_PARTNER_USER_AGENT },
					timeout: REQUEST_TIMEOUT_MS,
					allowedDomains,
					returnFullResponse: true,
				},
			);
			return { status: response.statusCode, body: response.body };
		} catch (error) {
			return toMlflowResponse(error);
		}
	};

	const withDeadline: typeof fetch = async (input, init) => {
		const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
		if (init?.signal) signals.push(init.signal);
		if (cancelSignal) signals.push(cancelSignal);
		return await proxyFetch({
			input,
			init: { ...init, signal: AbortSignal.any(signals) },
			egressFilter,
		});
	};

	const upload: SignedUpload = async ({ url, body }) => {
		// The signed URL points at a storage host and already carries its own SAS
		// credential in the query string, so it goes out with no bearer token and
		// not through the credential's own domain allowlist, which is scoped to
		// the workspace host.
		if (!URL.canParse(url) || new URL(url).protocol !== 'https:') {
			throw new NodeOperationError(ctx.getNode(), 'Databricks upload URL must use https');
		}

		const response = await withDeadline(url, {
			method: 'PUT',
			body,
			// A plain PUT: the URL is the Databricks Files API, not Azure Blob, so the
			// `x-ms-blob-type` header MLflow's own client sends is not needed.
			headers: { 'Content-Type': 'application/json' },
		});
		if (!response.ok) {
			throw new OperationalError(
				`Databricks trace data upload failed with HTTP ${response.status}`,
			);
		}
	};

	return { request, upload };
}
