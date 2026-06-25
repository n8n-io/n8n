import { getGoogleAccessToken } from 'n8n-nodes-base/dist/nodes/Google/GenericFunctions';
import type {
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
	ISupplyDataFunctions,
	LogMetadata,
} from 'n8n-workflow';

import { GOOGLE_CONTEXT_CACHE_RESPONSE_PREVIEW_MAX_CHARS } from './consts';
import { previewForLog } from '../utils';

/** Base for Vertex `cachedContents.create` failures surfaced to callers. */
export class GoogleContextCacheApiError extends Error {
	readonly status?: number;

	constructor(message: string, init?: { status?: number; cause?: unknown }) {
		super(message, init?.cause !== undefined ? { cause: init.cause } : undefined);
		this.name = 'GoogleContextCacheApiError';
		this.status = init?.status;
	}
}

/** Vertex returns 400 when cached payload is below the minimum token count for explicit caches. */
export class CacheMinimumTokenCountError extends GoogleContextCacheApiError {
	constructor(message: string, status = 400) {
		super(message, { status });
		this.name = 'CacheMinimumTokenCountError';
	}
}

/** OAuth/access token missing before calling the cachedContents endpoint. */
export class GoogleContextCacheAccessTokenMissingError extends GoogleContextCacheApiError {
	constructor(message = 'Google access token missing for Vertex context cache create') {
		super(message);
		this.name = 'GoogleContextCacheAccessTokenMissingError';
	}
}

/** API error response, unexpected body shape, or HTTP-layer failure (non–minimum-token cases). */
export class GoogleContextCacheCreateRejectedError extends GoogleContextCacheApiError {
	constructor(message: string, init?: { status?: number; cause?: unknown }) {
		super(message, init);
		this.name = 'GoogleContextCacheCreateRejectedError';
	}
}

/** Local wait limit for cache creation so the model call is not blocked indefinitely. */
export class GoogleContextCacheCreateTimeoutError extends GoogleContextCacheApiError {
	constructor(message = 'Vertex context cache creation timed out; continuing without a cache.') {
		super(message);
		this.name = 'GoogleContextCacheCreateTimeoutError';
	}
}

export type GoogleContextCacheCreateSuccess = { expireTime: string; name: string };

function isVertexMinimumTokenCacheError(status: number | undefined, errorMessage: string): boolean {
	if (status !== 400) return false;
	return errorMessage.toLowerCase().includes('minimum token count');
}

function rejectFromStatusAndMessage(
	status: number | undefined,
	message: string,
	cause?: unknown,
): never {
	if (isVertexMinimumTokenCacheError(status, message)) {
		throw new CacheMinimumTokenCountError(message, status ?? 400);
	}
	throw new GoogleContextCacheCreateRejectedError(message, { status, cause });
}

function logGoogleContextCacheCreateFailure(
	ctx: ISupplyDataFunctions,
	meta: LogMetadata & { url: string },
): void {
	ctx.logger.debug('VertexContextCache: cachedContents create endpoint error', meta);
}

function googleContextCacheApiHost(location: string): string {
	if (location === 'global') {
		return 'aiplatform.googleapis.com';
	}
	return `${location}-aiplatform.googleapis.com`;
}

export async function createGoogleContextCache(
	ctx: ISupplyDataFunctions,
	credentials: IDataObject,
	input: {
		body: Record<string, unknown>;
		location: string;
		projectId: string;
	},
): Promise<GoogleContextCacheCreateSuccess> {
	const host = googleContextCacheApiHost(input.location);
	const url = `https://${host}/v1/projects/${input.projectId}/locations/${input.location}/cachedContents`;

	const tokenResponse = await getGoogleAccessToken.call(ctx, credentials, 'vertex');
	const accessToken = tokenResponse.access_token as string;
	if (!accessToken) {
		const errorMessage = 'Google access token missing for Vertex context cache create';
		logGoogleContextCacheCreateFailure(ctx, { errorMessage, url });
		throw new GoogleContextCacheAccessTokenMissingError(errorMessage);
	}

	const options: IRequestOptions = {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		json: true,
		method: 'POST' as IHttpRequestMethods,
		body: input.body,
		uri: url,
	};

	try {
		const response = (await ctx.helpers.request(options)) as {
			name?: string;
			expireTime?: string;
			error?: { code?: number; message?: string; status?: string };
		};

		if (response?.name && response?.expireTime) {
			return { expireTime: response.expireTime, name: response.name };
		}

		const msg =
			response?.error?.message ??
			'Vertex cachedContents create returned an unexpected response (missing name or expireTime)';
		const status = typeof response?.error?.code === 'number' ? response.error.code : undefined;
		logGoogleContextCacheCreateFailure(ctx, {
			errorMessage: msg,
			responsePreview: previewForLog(response, GOOGLE_CONTEXT_CACHE_RESPONSE_PREVIEW_MAX_CHARS),
			status,
			url,
		});
		rejectFromStatusAndMessage(status, msg);
	} catch (caught) {
		if (caught instanceof GoogleContextCacheApiError) {
			throw caught;
		}
		const failure = caught as {
			statusCode?: number;
			message?: string;
			error?: unknown;
		};
		const message =
			typeof failure.error === 'object' &&
			failure.error !== null &&
			'message' in failure.error &&
			typeof failure.error.message === 'string'
				? (failure.error as { message: string }).message
				: (failure.message ?? 'Vertex cachedContents create request failed');
		const statusCode = failure.statusCode;
		logGoogleContextCacheCreateFailure(ctx, {
			errorMessage: message,
			responsePreview: previewForLog(
				failure.error,
				GOOGLE_CONTEXT_CACHE_RESPONSE_PREVIEW_MAX_CHARS,
			),
			status: statusCode,
			url,
		});
		rejectFromStatusAndMessage(statusCode, message, caught);
	}
}
