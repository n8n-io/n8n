import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { getAtlassianApiBaseUrl, getAtlassianCloudId } from '@utils/atlassian';

export const CONFLUENCE_CREDENTIAL_NAME = 'confluenceCloudOAuth2Api';

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

export async function confluenceApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials(CONFLUENCE_CREDENTIAL_NAME);
	// Keyed `domain` for backwards compatibility with Jira credentials; labeled "Site URL" in the UI
	const siteUrl = credentials.domain;
	if (typeof siteUrl !== 'string' || siteUrl === '') {
		throw new NodeOperationError(
			this.getNode(),
			'The Confluence credential is missing the Site URL field',
		);
	}
	const cloudId = await getAtlassianCloudId.call(
		this,
		CONFLUENCE_CREDENTIAL_NAME,
		siteUrl,
		'confluence',
	);

	// The URL is concatenated onto the api.atlassian.com base, so caller input can't
	// change the host; a future verbatim-URL param needs an origin check first.
	const options: IHttpRequestOptions = {
		method,
		url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
		body,
		qs,
		json: true,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			CONFLUENCE_CREDENTIAL_NAME,
			options,
		);
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
	const credentials = await this.getCredentials(CONFLUENCE_CREDENTIAL_NAME);
	const siteUrl = credentials.domain;
	if (typeof siteUrl !== 'string' || siteUrl === '') {
		throw new NodeOperationError(
			this.getNode(),
			'The Confluence credential is missing the Site URL field',
		);
	}
	const cloudId = await getAtlassianCloudId.call(
		this,
		CONFLUENCE_CREDENTIAL_NAME,
		siteUrl,
		'confluence',
	);

	// Downloads 302 to the Atlassian media host, which authenticates the hop via its
	// own signed token in the redirect URL; the OAuth header must not follow cross-origin.
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
		encoding: 'arraybuffer',
		sendCredentialsOnCrossOriginRedirect: false,
	};

	let data: unknown;
	try {
		data = await this.helpers.httpRequestWithAuthentication.call(
			this,
			CONFLUENCE_CREDENTIAL_NAME,
			options,
		);
	} catch (error) {
		throw toConfluenceApiError.call(this, error);
	}

	if (Buffer.isBuffer(data)) return data;
	if (data instanceof ArrayBuffer) return Buffer.from(data);
	if (typeof data === 'string') return Buffer.from(data);
	throw new NodeOperationError(this.getNode(), 'Confluence returned an unexpected binary response');
}
