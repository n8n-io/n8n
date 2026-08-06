import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// Owned by ENT-128 (parallel PR): coupled by name only, never import the class
export const CONFLUENCE_CREDENTIAL_NAME = 'confluenceCloudOAuth2Api';

// Bearer-token origin invariant: every request URL is string-concatenated onto this
// constant, so no caller input can change the host. Any future verbatim-URL param
// (paginator next-link, uri override) needs an origin check first, see
// nodes/Microsoft/SharePoint/v2/transport/index.ts:218-228. User-supplied path
// segments in future endpoints must be encodeURIComponent-ed.
const ATLASSIAN_API_BASE = 'https://api.atlassian.com';

export interface AccessibleResource {
	id: string;
	url: string;
	name?: string;
	scopes?: string[];
}

/**
 * Pure hostname matcher, exported so ENT-128's credential Test can reuse the exact
 * matching this node routes with (S10: don't build it twice). Case-insensitive,
 * never an exact-string comparison (the nodes/Jira/GenericFunctions.ts:33 trap).
 */
export function matchSiteByHostname(
	resources: AccessibleResource[],
	hostname: string,
): AccessibleResource | undefined {
	const target = hostname.toLowerCase();
	// Non-throwing on malformed entries: this is a reuse contract fed with an unvalidated API response
	return resources.find((resource) => {
		try {
			return new URL(resource.url).hostname.toLowerCase() === target;
		} catch {
			return false;
		}
	});
}

// Module-level cache: normalized hostname → cloudId (Jira parity, nodes/Jira/GenericFunctions.ts:18).
// A cloudId is a property of the site, not of the token, so sharing across credentials is safe.
// Lives for the n8n process; a moved/deleted site needs a restart to re-resolve (same ceiling as Jira).
// One asymmetry: a warm-cache hit skips the accessible-resources check, so a credential that
// cannot reach the cached site fails at the API call with Atlassian's 403, not the no-match error.
const cloudIdCache = new Map<string, string>();

/** Test-only escape hatch for the module-level cache. */
export function clearCloudIdCache(): void {
	cloudIdCache.clear();
}

/** Reduce any pasted site-URL form (scheme optional, `/wiki` or deeper paths, any casing) to its lowercased hostname. */
export function normalizeSiteUrl(siteUrl: string): string {
	const trimmed = siteUrl.trim();
	const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	return new URL(withScheme).hostname.toLowerCase();
}

export async function getConfluenceCloudId(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	siteUrl: string,
): Promise<string> {
	let hostname: string;
	try {
		hostname = normalizeSiteUrl(siteUrl);
	} catch {
		throw new NodeOperationError(this.getNode(), `"${siteUrl}" is not a valid Confluence site URL`);
	}

	const cached = cloudIdCache.get(hostname);
	if (cached) return cached;

	let resources: AccessibleResource[];
	try {
		resources = await this.helpers.httpRequestWithAuthentication.call(
			this,
			CONFLUENCE_CREDENTIAL_NAME,
			{
				method: 'GET',
				url: `${ATLASSIAN_API_BASE}/oauth/token/accessible-resources`,
				json: true,
			},
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	// A non-array body falls through to the no-match error instead of a raw TypeError
	if (!Array.isArray(resources)) resources = [];

	const site = matchSiteByHostname(resources, hostname);

	if (!site) {
		const reachable = resources.map((resource) => resource.url).join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`No Confluence site matched "${siteUrl}". This connection can access: ${reachable || 'no sites'}`,
		);
	}

	cloudIdCache.set(hostname, site.id);
	return site.id;
}

export async function confluenceApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials(CONFLUENCE_CREDENTIAL_NAME);
	// ENT-128 pins the label "Site URL" but not the key; this is the ONE place to touch if it lands under another name (D4)
	const siteUrl = credentials.siteUrl;
	if (typeof siteUrl !== 'string' || siteUrl === '') {
		throw new NodeOperationError(
			this.getNode(),
			'The Confluence credential is missing the Site URL field',
		);
	}
	const cloudId = await getConfluenceCloudId.call(this, siteUrl);

	const options: IHttpRequestOptions = {
		method,
		url: `${ATLASSIAN_API_BASE}/ex/confluence/${cloudId}${endpoint}`,
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
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
