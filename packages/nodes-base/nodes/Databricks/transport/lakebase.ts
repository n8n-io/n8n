import { retryabilityFromError } from '@n8n/backend-network';
import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	databricksApiRequest,
	getActiveCredentialType,
	type DatabricksContext,
} from '../actions/helpers';

// ponytail: single fixed delay; lengthen it if a real schema reload is observed to take more than 1 s.
const SCHEMA_CACHE_RETRY_DELAY_MS = 1_000;

function errorBody(error: unknown): Record<string, unknown> | undefined {
	return error instanceof NodeApiError && isRecord(error.context.data)
		? error.context.data
		: undefined;
}

function isExpiredToken(error: unknown, body: Record<string, unknown> | undefined): boolean {
	const { status } = retryabilityFromError(error);
	if (status !== 400 && status !== 401) return false;
	const text = [
		error instanceof NodeApiError ? error.description : undefined,
		body?.message,
		body?.error,
		body?.error_description,
	]
		.filter((part): part is string => typeof part === 'string')
		.join(' ');
	return /expired/i.test(text) && /jwt|token/i.test(text);
}

/** JSON bodies only: the helper resends the request after a refresh or schema-cache retry, so a stream or FormData body must not be passed. */
export async function lakebaseApiRequest(
	context: DatabricksContext,
	options: IHttpRequestOptions,
): ReturnType<IExecuteFunctions['helpers']['httpRequestWithAuthentication']> {
	if (getActiveCredentialType(context) === 'databricksApi') {
		throw new NodeOperationError(context.getNode(), 'Lakebase requires OAuth2 authentication', {
			description:
				'The Lakebase Data API does not accept personal access tokens. Set Authentication to OAuth2 and use a Databricks OAuth2 credential.',
		});
	}
	const abortSignal =
		'getExecutionCancelSignal' in context ? context.getExecutionCancelSignal() : undefined;

	let refreshed = false;
	let retriedSchemaCache = false;
	for (;;) {
		try {
			return await databricksApiRequest(context, 'databricksOAuth2Api', options);
		} catch (error) {
			const body = errorBody(error);
			// Core refreshes only on the credential's tokenExpiredStatusCode (403); Lakebase signals expiry with 400 or 401.
			if (!refreshed && isExpiredToken(error, body)) {
				refreshed = true;
				await context.helpers.refreshOAuth2Token.call(context, 'databricksOAuth2Api');
				continue;
			}
			if (!retriedSchemaCache && body?.code === 'PGRST205') {
				retriedSchemaCache = true;
				await sleep(SCHEMA_CACHE_RETRY_DELAY_MS, abortSignal);
				continue;
			}
			throw error;
		}
	}
}
