import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface ConsentDetails {
	clientName: string;
	clientId: string;
	redirectUri?: string;
	resourceName?: string;
	/**
	 * Scopes the user can grant (already capped by what the client requested).
	 * Empty = full user delegation (no picker shown).
	 */
	scopes: string[];
	/** Scopes this user granted to this client last time, used to preselect the picker. */
	previousScopes?: string[];
	/** Tool names each scope unlocks, shown per scope group in the picker. */
	scopeTools?: Record<string, string[]>;
}

export interface ConsentApprovalResponse {
	status: string;
	redirectUrl: string;
}

export async function getConsentDetails(context: IRestApiContext): Promise<ConsentDetails> {
	return await makeRestApiRequest(context, 'GET', '/consent/details');
}

export async function approveConsent(
	context: IRestApiContext,
	approved: boolean,
	scopes?: string[],
): Promise<ConsentApprovalResponse> {
	return await makeRestApiRequest(context, 'POST', '/consent/approve', { approved, scopes });
}
