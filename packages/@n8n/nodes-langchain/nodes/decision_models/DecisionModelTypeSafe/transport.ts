import { sleep } from '@n8n/utils/sleep';
import type {
	IDataObject,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	ISupplyDataFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const CREDENTIAL_NAME = 'typeSafeApi';
export const SYSTEM_ONE_PATH = '/v1/systemone';
export const MODELS_PATH = '/v1/models';
export const DEFAULT_BASE_URL = 'https://api.typesafe.ai';

/** Retried statuses and backoff match the TypeSafe client SDK defaults. */
const RETRYABLE_STATUS_CODES = new Set([408, 429]);
const BACKOFF_INITIAL_MS = 500;
const BACKOFF_MAX_MS = 5_000;
const RETRY_AFTER_MAX_MS = 60_000;

const STATUS_MESSAGES: Record<number, string> = {
	422: 'TypeSafe could not process the request',
	529: 'TypeSafe is temporarily overloaded',
};

type Ctx = ISupplyDataFunctions | ILoadOptionsFunctions;

function isRetryableStatus(statusCode: number): boolean {
	return RETRYABLE_STATUS_CODES.has(statusCode) || statusCode >= 500;
}

/** Honours `Retry-After` and `retry-after-ms`, else exponential backoff. */
export function retryDelay(headers: IDataObject | undefined, attempt: number): number {
	const afterMs = Number(headers?.['retry-after-ms']);
	if (Number.isFinite(afterMs) && afterMs >= 0) {
		return Math.min(afterMs, RETRY_AFTER_MAX_MS);
	}

	const afterSeconds = Number(headers?.['retry-after']);
	if (Number.isFinite(afterSeconds) && afterSeconds >= 0) {
		return Math.min(afterSeconds * 1000, RETRY_AFTER_MAX_MS);
	}

	return Math.min(BACKOFF_INITIAL_MS * 2 ** attempt, BACKOFF_MAX_MS);
}

/**
 * Builds the error a failed call reports. Only the response body is passed on:
 * the request, and with it the `Authorization` header, never reaches the error
 * or the execution data.
 */
function apiError(ctx: Ctx, statusCode: number, body: unknown): NodeApiError {
	const errorResponse: JsonObject =
		typeof body === 'object' && body !== null ? (body as JsonObject) : { message: String(body) };

	return new NodeApiError(ctx.getNode(), errorResponse, {
		httpCode: String(statusCode),
		...(STATUS_MESSAGES[statusCode] === undefined ? {} : { message: STATUS_MESSAGES[statusCode] }),
	});
}

/** Wraps a connection failure, keeping only its message. */
function transportError(ctx: Ctx, error: Error): NodeApiError {
	const timedOut = /timeout|ETIMEDOUT|ECONNABORTED/i.test(error.message ?? '');

	return new NodeApiError(
		ctx.getNode(),
		{ message: error.message },
		{
			message: timedOut ? 'The request to TypeSafe timed out' : 'Could not reach TypeSafe',
			description: error.message,
		},
	);
}

export interface TypeSafeRequestOptions {
	method: 'GET' | 'POST';
	path: string;
	body?: IDataObject;
	timeout: number;
	maxRetries: number;
}

/**
 * Calls the TypeSafe API through n8n's authenticated HTTP helper, retrying the
 * statuses TypeSafe asks clients to retry.
 */
export async function typeSafeApiRequest<T>(
	ctx: Ctx,
	{ method, path, body, timeout, maxRetries }: TypeSafeRequestOptions,
): Promise<T> {
	const credentials = await ctx.getCredentials<{ url?: string }>(CREDENTIAL_NAME);

	const options: IHttpRequestOptions = {
		method,
		baseURL: credentials.url ?? DEFAULT_BASE_URL,
		url: path,
		headers: { 'Content-Type': 'application/json' },
		...(body === undefined ? {} : { body }),
		json: true,
		timeout,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};

	for (let attempt = 0; ; attempt++) {
		const isLastAttempt = attempt >= maxRetries;

		let response: IN8nHttpFullResponse;
		try {
			response = (await ctx.helpers.httpRequestWithAuthentication.call(
				ctx,
				CREDENTIAL_NAME,
				options,
			)) as IN8nHttpFullResponse;
		} catch (error) {
			// Connection failures and timeouts are transient.
			if (isLastAttempt) throw transportError(ctx, error as Error);
			await sleep(retryDelay(undefined, attempt));
			continue;
		}

		const { statusCode, body: responseBody, headers } = response;

		if (statusCode >= 200 && statusCode < 300) {
			return responseBody as T;
		}

		const error = apiError(ctx, statusCode, responseBody);
		if (!isRetryableStatus(statusCode) || isLastAttempt) throw error;

		await sleep(retryDelay(headers, attempt));
	}
}
