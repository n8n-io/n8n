import type { TeamsFileAccessConsentState } from '@n8n/api-types';

/**
 * Where Microsoft sends an administrator after they approve the app's
 * permissions: the agent's page in n8n. Entra accepts only HTTPS, or plain
 * HTTP on localhost, so an instance on any other HTTP address gets none.
 */
export function adminConsentRedirectUri(
	instanceBaseUrl: string,
	scope: { projectId: string; agentId: string },
): string | undefined {
	const url = URL.parse(
		`${instanceBaseUrl}/projects/${encodeURIComponent(scope.projectId)}/agents/${encodeURIComponent(scope.agentId)}`,
	);
	if (!url) return undefined;
	const localhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localhost)) return undefined;
	return url.href;
}

const CONSENT_STATE: TeamsFileAccessConsentState = 'teams-file-access';

/**
 * One screen on which an administrator approves every permission the app
 * declares. It works only for an app that registered `redirectUri`.
 */
export function adminConsentUrl(tenantId: string, clientId: string, redirectUri: string): string {
	const query = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		state: CONSENT_STATE,
	});
	return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/adminconsent?${query.toString()}`;
}
