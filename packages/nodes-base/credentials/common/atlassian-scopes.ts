/**
 * Atlassian OAuth2 scope catalog, classic scopes first, then granular,
 * grouped by service. The `atlassianOAuth2Api` base credential defaults to the
 * full catalog; product credentials extending it restrict to their own
 * default list.
 *
 * Classic scope references:
 * https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/
 * https://developer.atlassian.com/cloud/confluence/scopes-for-oauth-2-3LO-and-forge-apps/
 */
export const offlineAccessScope = 'offline_access';

export const jiraClassicScopes = [
	'read:jira-user',
	'read:jira-work',
	'write:jira-work',
	'manage:jira-project',
	'manage:jira-configuration',
	'manage:jira-webhook',
];

// The Confluence v2 REST API rejects classic scopes, so the Confluence
// credential requests granular scopes only. The v1 survivor endpoints the
// node uses (CQL search, attachment upload, label writes) accept these
// granular scopes too
export const confluenceGranularScopes = [
	'read:page:confluence',
	'write:page:confluence',
	'read:hierarchical-content:confluence',
	'read:space:confluence',
	'read:attachment:confluence',
	'read:comment:confluence',
	'read:label:confluence',
	'read:content-details:confluence',
	'write:attachment:confluence',
	'delete:attachment:confluence',
	'write:comment:confluence',
	'delete:comment:confluence',
	'write:label:confluence',
	'delete:page:confluence',
];

export const jiraDefaultScopes = [
	'read:jira-user',
	'read:jira-work',
	'write:jira-work',
	'manage:jira-webhook',
	// Retired by Atlassian — silently dropped at consent, kept only to avoid churning the request string.
	'manage:jira-user',
	offlineAccessScope,
];

export const confluenceDefaultScopes = [...confluenceGranularScopes, offlineAccessScope];

export const atlassianScopes = [
	...jiraClassicScopes,
	...confluenceGranularScopes,
	offlineAccessScope,
];
