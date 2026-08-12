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
// (paginator next-link, uri override) needs an origin check first, see the one in
// `microsoftApiRequest` (SharePoint v2 transport). User-supplied path segments in
// future endpoints must be encodeURIComponent-ed.
const ATLASSIAN_API_BASE = 'https://api.atlassian.com';

export interface AccessibleResource {
	id: string;
	url: string;
	name?: string;
}

/**
 * Pure hostname matcher, exported so ENT-128's credential Test can reuse the exact
 * matching this node routes with. Case-insensitive, never an exact-string comparison
 * (the trap in Jira's `getCloudId`).
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

// Module-level cache: credentialId:hostname → cloudId (`_cloudIdCache` in Jira's
// GenericFunctions is the precedent, but keyed per credential here: a shared hostname-only
// key makes cold vs warm failures distinguishable, letting one user infer that another
// credential on the instance reaches a given site).
// Lives for the n8n process; a moved/deleted site needs a restart to re-resolve (same ceiling as Jira).
// One asymmetry: a warm-cache hit skips the accessible-resources check, so a credential that
// lost access to a site it once resolved fails at the API call with Atlassian's 403.
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

	const credentialId = this.getNode().credentials?.[CONFLUENCE_CREDENTIAL_NAME]?.id ?? '';
	const cacheKey = `${credentialId}:${hostname}`;
	const cached = cloudIdCache.get(cacheKey);
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
		// Same guard class as matchSiteByHostname: malformed entries must not break the error message.
		// Capped at 5 so the error stays readable and a bogus siteUrl cannot dump the full site list
		// into persisted execution data.
		const urls = resources
			.filter((resource) => typeof resource?.url === 'string' && resource.url !== '')
			.map((resource) => resource.url);
		const reachable =
			urls.slice(0, 5).join(', ') + (urls.length > 5 ? `, and ${urls.length - 5} more` : '');
		throw new NodeOperationError(
			this.getNode(),
			`No Confluence site matched "${siteUrl}". This connection can access: ${reachable || 'no sites'}`,
		);
	}

	cloudIdCache.set(cacheKey, site.id);
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
	// The key is `domain` (kept from Jira credentials for backwards compatibility)
	// while the user-facing label is "Site URL"; see AtlassianOAuth2Api (ENT-128)
	const siteUrl = credentials.domain;
	if (typeof siteUrl !== 'string' || siteUrl === '') {
		throw new NodeOperationError(
			this.getNode(),
			'The Confluence credential is missing the Site URL field',
		);
	}
	const cloudId = await getConfluenceCloudId.call(this, siteUrl);

	const options: IHttpRequestOptions = {
		method,
		url: `${ATLASSIAN_API_BASE}/ex/confluence/${encodeURIComponent(cloudId)}${endpoint}`,
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
