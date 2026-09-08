import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { getAtlassianApiBaseUrl, resolveAtlassianCloudId } from '@utils/atlassian';
export const CONFLUENCE_CREDENTIAL_NAME = 'confluenceCloudOAuth2Api';
export const SERVICE_ACCOUNT_CREDENTIAL_NAME = 'atlassianServiceAccountApi';
/**
 * Resolves which credential the node is configured with. Dual-context like
 * `getSiteParameter`: dropdown searches run in a load-options context, where only
 * `getCurrentNodeParameter` sees the NDV's unsaved value. Anything other than the
 * literal 'serviceAccount' — including the parameter being absent on workflows
 * saved before the selector existed — maps to Cloud OAuth2.
 */
export function getConfluenceCredentialName(ctx) {
    const raw = 'getCurrentNodeParameter' in ctx
        ? ctx.getCurrentNodeParameter('authentication')
        : ctx.getNodeParameter('authentication', 0, 'cloudOAuth2');
    return raw === 'serviceAccount' ? SERVICE_ACCOUNT_CREDENTIAL_NAME : CONFLUENCE_CREDENTIAL_NAME;
}
function extractApiMessage(body) {
    if (typeof body !== 'object' || body === null)
        return undefined;
    const data = body;
    const { errors: v2Errors, message: v1Message } = data;
    const first = Array.isArray(v2Errors)
        ? v2Errors[0]
        : undefined;
    if (typeof first?.title === 'string' && first.title !== '') {
        return {
            message: first.title,
            description: typeof first.detail === 'string' && first.detail !== '' ? first.detail : undefined,
            data,
        };
    }
    if (typeof v1Message === 'string' && v1Message !== '')
        return { message: v1Message, data };
    return undefined;
}
// NodeApiError's constructor short-circuits on re-wrap (returns the same
// instance, dropping any option overrides), so enrichment needs a fresh error.
function toConfluenceApiError(error) {
    const wrapped = error instanceof NodeApiError ? error : undefined;
    const body = wrapped ? wrapped.context.data : error.response?.data;
    const extracted = extractApiMessage(body);
    if (extracted !== undefined) {
        let httpCode;
        if (wrapped) {
            httpCode = wrapped.httpCode ?? undefined;
        }
        else {
            const status = error.response?.status;
            httpCode =
                typeof status === 'number' || typeof status === 'string' ? String(status) : undefined;
        }
        const sanitizedError = { message: extracted.message };
        const fresh = new NodeApiError(this.getNode(), sanitizedError, {
            message: extracted.message,
            description: extracted.description,
            httpCode,
        });
        // Keep the raw response body visible in the NDV's error-data pane
        fresh.context.data = extracted.data;
        return fresh;
    }
    if (wrapped)
        return wrapped;
    return new NodeApiError(this.getNode(), error);
}
/**
 * Reads the top-level Site parameter in both contexts: dropdown searches run in
 * a load-options context, where only `getCurrentNodeParameter` sees the NDV's
 * unsaved value. The selector is node-level, so execute contexts read it once
 * at item 0 — an expression on it cannot vary the site per item.
 */
function getSiteParameter(ctx) {
    const raw = 'getCurrentNodeParameter' in ctx
        ? ctx.getCurrentNodeParameter('site')
        : ctx.getNodeParameter('site', 0, null);
    return typeof raw === 'object' && raw !== null && 'value' in raw
        ? raw
        : undefined;
}
export async function getConfluenceCloudId() {
    return await resolveAtlassianCloudId.call(this, getConfluenceCredentialName(this), getSiteParameter(this), 'confluence');
}
export async function confluenceApiRequest(method, endpoint, body = {}, qs = {}) {
    const cloudId = await getConfluenceCloudId.call(this);
    // The URL is concatenated onto the api.atlassian.com base, so caller input can't
    // change the host; a future verbatim-URL param needs an origin check first.
    const options = {
        method,
        url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
        body,
        qs,
        json: true,
    };
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, getConfluenceCredentialName(this), options);
    }
    catch (error) {
        throw toConfluenceApiError.call(this, error);
    }
}
/**
 * Fetches a binary resource (e.g. an attachment's server-relative `downloadLink`)
 * through the gateway and returns its raw bytes. Same base-URL concatenation rule
 * as `confluenceApiRequest`: the endpoint can never change the host.
 */
export async function confluenceApiRequestBinary(endpoint) {
    const cloudId = await getConfluenceCloudId.call(this);
    // Downloads 302 to the Atlassian media host, which authenticates the hop via its
    // own signed token in the redirect URL; the OAuth header must not follow cross-origin.
    const options = {
        method: 'GET',
        url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
        encoding: 'arraybuffer',
        sendCredentialsOnCrossOriginRedirect: false,
    };
    let data;
    try {
        data = await this.helpers.httpRequestWithAuthentication.call(this, getConfluenceCredentialName(this), options);
    }
    catch (error) {
        throw toConfluenceApiError.call(this, error);
    }
    if (Buffer.isBuffer(data))
        return data;
    if (data instanceof ArrayBuffer)
        return Buffer.from(data);
    if (typeof data === 'string')
        return Buffer.from(data);
    throw new NodeOperationError(this.getNode(), 'Confluence returned an unexpected binary response');
}
/**
 * Uploads a multipart body (e.g. a file) through the gateway. PUT, not POST:
 * the same endpoint's POST is create-only and 400s on a filename that already
 * exists on the page, while PUT upserts (creates if new, new version if the
 * filename matches) so the delete+upload replace-a-file story becomes a single
 * call. No `json: true` and no explicit Content-Type: `form-data` sets its own
 * multipart boundary, and an explicit header would clobber it.
 */
export async function confluenceApiRequestUpload(endpoint, formData) {
    const cloudId = await getConfluenceCloudId.call(this);
    const options = {
        method: 'PUT',
        url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
        body: formData,
        // Bypasses XSRF checks on this v1 endpoint; without it the gateway answers
        // 403 "XSRF check failed" before the request ever reaches Confluence.
        headers: { 'X-Atlassian-Token': 'nocheck' },
    };
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, getConfluenceCredentialName(this), options);
    }
    catch (error) {
        throw toConfluenceApiError.call(this, error);
    }
}
//# sourceMappingURL=index.js.map