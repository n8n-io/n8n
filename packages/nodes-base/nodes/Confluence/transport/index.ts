import type FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeParameterResourceLocator,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	getAtlassianApiBaseUrl,
	resolveAtlassianCloudId,
	retryOnceIfTokenExpired,
} from '@utils/atlassian';

export const CONFLUENCE_CREDENTIAL_NAME = 'confluenceCloudOAuth2Api';
export const SERVICE_ACCOUNT_CREDENTIAL_NAME = 'atlassianServiceAccountApi';

/**
 * Resolves which credential the node is configured with. Dual-context like
 * `getSiteParameter`: dropdown searches run in a load-options context, where only
 * `getCurrentNodeParameter` sees the NDV's unsaved value. Anything other than the
 * literal 'serviceAccount' — including the parameter being absent on workflows
 * saved before the selector existed — maps to Cloud OAuth2.
 */
export function getConfluenceCredentialName(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
): string {
	const raw =
		'getCurrentNodeParameter' in ctx
			? ctx.getCurrentNodeParameter('authentication')
			: ctx.getNodeParameter('authentication', 0, 'cloudOAuth2');

	return raw === 'serviceAccount' ? SERVICE_ACCOUNT_CREDENTIAL_NAME : CONFLUENCE_CREDENTIAL_NAME;
}

interface CaughtRequestError {
	response?: { status?: unknown; data?: unknown };
}

interface ExtractedApiError {
	message: string;
	description?: string;
	data: IDataObject;
}

function extractApiMessage(body: unknown): ExtractedApiError | undefined {
	if (typeof body !== 'object' || body === null) return undefined;
	const data = body as IDataObject;
	const { errors: v2Errors, message: v1Message } = data as {
		errors?: unknown;
		message?: unknown;
	};

	const first = Array.isArray(v2Errors)
		? (v2Errors[0] as { title?: unknown; detail?: unknown } | undefined)
		: undefined;
	if (typeof first?.title === 'string' && first.title !== '') {
		return {
			message: first.title,
			description:
				typeof first.detail === 'string' && first.detail !== '' ? first.detail : undefined,
			data,
		};
	}

	if (typeof v1Message === 'string' && v1Message !== '') return { message: v1Message, data };

	return undefined;
}

// NodeApiError's constructor short-circuits on re-wrap (returns the same
// instance, dropping any option overrides), so enrichment needs a fresh error.
function toConfluenceApiError(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	error: unknown,
): NodeApiError {
	const wrapped = error instanceof NodeApiError ? error : undefined;
	const body = wrapped ? wrapped.context.data : (error as CaughtRequestError).response?.data;

	const extracted = extractApiMessage(body);
	if (extracted !== undefined) {
		let httpCode: string | undefined;
		if (wrapped) {
			httpCode = wrapped.httpCode ?? undefined;
		} else {
			const status = (error as CaughtRequestError).response?.status;
			httpCode =
				typeof status === 'number' || typeof status === 'string' ? String(status) : undefined;
		}

		const sanitizedError: JsonObject = { message: extracted.message };
		const fresh = new NodeApiError(this.getNode(), sanitizedError, {
			message: extracted.message,
			description: extracted.description,
			httpCode,
		});
		// Keep the raw response body visible in the NDV's error-data pane
		fresh.context.data = extracted.data;
		return fresh;
	}
	if (wrapped) return wrapped;
	return new NodeApiError(this.getNode(), error as JsonObject);
}

/**
 * Reads the top-level Site parameter in both contexts: dropdown searches run in
 * a load-options context, where only `getCurrentNodeParameter` sees the NDV's
 * unsaved value. The selector is node-level, so execute contexts read it once
 * at item 0 — an expression on it cannot vary the site per item.
 */
function getSiteParameter(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
): INodeParameterResourceLocator | undefined {
	const raw =
		'getCurrentNodeParameter' in ctx
			? ctx.getCurrentNodeParameter('site')
			: ctx.getNodeParameter('site', 0, null);

	return typeof raw === 'object' && raw !== null && 'value' in raw
		? (raw as INodeParameterResourceLocator)
		: undefined;
}

export async function getConfluenceCloudId(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
	return await resolveAtlassianCloudId.call(
		this,
		getConfluenceCredentialName(this),
		getSiteParameter(this),
		'confluence',
	);
}

export async function confluenceApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const cloudId = await getConfluenceCloudId.call(this);
	const credentialType = getConfluenceCredentialName(this);

	// The URL is concatenated onto the api.atlassian.com base, so caller input can't
	// change the host; a future verbatim-URL param needs an origin check first.
	const options: IHttpRequestOptions = {
		method,
		url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
		body,
		qs,
		json: true,
	};

	const makeRequest = async () =>
		await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);

	try {
		return await retryOnceIfTokenExpired(this, credentialType, makeRequest);
	} catch (error) {
		throw toConfluenceApiError.call(this, error);
	}
}

/**
 * Fetches a binary resource (e.g. an attachment's server-relative `downloadLink`)
 * through the gateway and returns its raw bytes. Same base-URL concatenation rule
 * as `confluenceApiRequest`: the endpoint can never change the host.
 */
export async function confluenceApiRequestBinary(
	this: IExecuteFunctions,
	endpoint: string,
): Promise<Buffer> {
	const cloudId = await getConfluenceCloudId.call(this);
	const credentialType = getConfluenceCredentialName(this);

	// Downloads 302 to the Atlassian media host, which authenticates the hop via its
	// own signed token in the redirect URL; the OAuth header must not follow cross-origin.
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
		encoding: 'arraybuffer',
		sendCredentialsOnCrossOriginRedirect: false,
	};

	const makeRequest = async () =>
		await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);

	let data: unknown;
	try {
		data = await retryOnceIfTokenExpired(this, credentialType, makeRequest);
	} catch (error) {
		throw toConfluenceApiError.call(this, error);
	}

	if (Buffer.isBuffer(data)) return data;
	if (data instanceof ArrayBuffer) return Buffer.from(data);
	if (typeof data === 'string') return Buffer.from(data);
	throw new NodeOperationError(this.getNode(), 'Confluence returned an unexpected binary response');
}

/**
 * Uploads a multipart body (e.g. a file) through the gateway. PUT, not POST:
 * the same endpoint's POST is create-only and 400s on a filename that already
 * exists on the page, while PUT upserts (creates if new, new version if the
 * filename matches) so the delete+upload replace-a-file story becomes a single
 * call. No `json: true` and no explicit Content-Type: `form-data` sets its own
 * multipart boundary, and an explicit header would clobber it.
 *
 * Deliberately not wrapped in `retryOnceIfTokenExpired`: `formData` is a
 * stream consumed by the first attempt, so replaying it on a retry would send
 * a truncated or empty body instead of the file (the ENT-320 failure class).
 */
export async function confluenceApiRequestUpload(
	this: IExecuteFunctions,
	endpoint: string,
	formData: FormData,
): Promise<IDataObject> {
	const cloudId = await getConfluenceCloudId.call(this);

	const options: IHttpRequestOptions = {
		method: 'PUT',
		url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
		body: formData,
		// Bypasses XSRF checks on this v1 endpoint; without it the gateway answers
		// 403 "XSRF check failed" before the request ever reaches Confluence.
		headers: { 'X-Atlassian-Token': 'nocheck' },
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			getConfluenceCredentialName(this),
			options,
		);
	} catch (error) {
		throw toConfluenceApiError.call(this, error);
	}
}
