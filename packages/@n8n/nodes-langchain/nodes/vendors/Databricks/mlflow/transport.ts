import { proxyFetch } from '@n8n/ai-utilities';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { createDatabricksAuthFetch } from '@utils/databricks/auth-fetch';
import { assertHttpsHost } from '@utils/databricks/constants';
import type { DatabricksOAuth2Credential } from '@utils/databricks/token-provider';

import type { MlflowRequest, SignedUpload } from './trace-writer';

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Builds the two transports the trace writer needs.
 *
 * Workspace calls reuse `createDatabricksAuthFetch`, so token minting, the
 * credential domain allowlist, the partner User-Agent and egress filtering are
 * all the shared Databricks behaviour rather than a second implementation.
 */
export function createMlflowTransport(
	ctx: IExecuteFunctions,
	credential: DatabricksOAuth2Credential,
): { request: MlflowRequest; upload: SignedUpload } {
	assertHttpsHost(ctx, credential.host);
	const host = credential.host.replace(/\/$/, '');
	const egressFilter = ctx.helpers.getSecureEgressFilter();
	const cancelSignal = ctx.getExecutionCancelSignal();

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

	const { fetch: authFetch } = createDatabricksAuthFetch(ctx, credential, {
		endpointUrl: host,
		egressFilter,
		baseFetch: withDeadline,
	});

	const request: MlflowRequest = async ({ method, path, qs, body }) => {
		const url = new URL(`${host}${path}`);
		for (const [key, value] of Object.entries(qs ?? {})) {
			url.searchParams.set(key, value);
		}

		// The status is reported rather than thrown: a missing experiment answers
		// 404, which the writer handles by creating it.
		const response = await authFetch(url.toString(), {
			method,
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		});

		const text = await response.text();
		let parsed: unknown = text;
		try {
			parsed = text.length > 0 ? JSON.parse(text) : {};
		} catch {
			// A non-JSON body is only ever used for the error message.
		}
		return { status: response.status, body: parsed };
	};

	const upload: SignedUpload = async ({ url, body }) => {
		// The signed URL points at a storage host and already carries its own SAS
		// credential in the query string, so it goes out with no bearer token - and
		// not through `authFetch`, whose allowlist is scoped to the workspace host.
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
			throw new Error(`Databricks trace data upload failed with HTTP ${response.status}`);
		}
	};

	return { request, upload };
}
