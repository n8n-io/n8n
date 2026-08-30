import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface CodexOAuthFlow {
	flowId: string;
	authUrl: string;
	/**
	 * Whether the backend captured the loopback callback itself. When false the
	 * user must paste the redirect URL back — the only option when n8n does not
	 * share a host with the browser (containers, remote instances).
	 */
	listening: boolean;
}

/** Begins a sign-in and returns the URL the browser must open. */
export async function startCodexOAuth(
	context: IRestApiContext,
	credentialId: string,
): Promise<CodexOAuthFlow> {
	return await makeRestApiRequest(context, 'POST', '/openai-codex-oauth/start', { credentialId });
}

/**
 * Finishes a sign-in. With no `redirectInput` this waits on the loopback
 * listener and may stay open for as long as the sign-in takes.
 */
export async function completeCodexOAuth(
	context: IRestApiContext,
	flowId: string,
	redirectInput?: string,
): Promise<{ credentialId: string }> {
	return await makeRestApiRequest(context, 'POST', '/openai-codex-oauth/complete', {
		flowId,
		...(redirectInput ? { redirectInput } : {}),
	});
}
