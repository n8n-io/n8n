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
	const { errors, message } = data as { errors?: unknown; message?: unknown };

	// Atlassian's v2 error envelope: errors[0].title/detail
	const first = Array.isArray(errors)
		? (errors[0] as { title?: unknown; detail?: unknown } | undefined)
		: undefined;
	if (typeof first?.title === 'string' && first.title !== '') {
		return {
			message: first.title,
			description:
				typeof first.detail === 'string' && first.detail !== '' ? first.detail : undefined,
			data,
		};
	}

	// v1 endpoints (e.g. search) put the real cause in a top-level message,
	// such as "Could not parse cql : ..."
	if (typeof message === 'string' && message !== '') return { message, data };

	return undefined;
}

/**
 * `httpRequestWithAuthentication` wraps failures in a NodeApiError, whose
 * constructor short-circuits on re-wrap (returning the same instance and
 * dropping any overrides) — so enrichment must go on a fresh error. The
 * response body survives on the wrapped error's `context.data`; without this,
 * the API's own message only reaches `error.description` while `error.message`
 * stays the generic status text, which is all continue-on-fail keeps.
 */
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
