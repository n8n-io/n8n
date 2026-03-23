import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface ConsentDetails {
	clientName: string;
	clientId: string;
	requestedScopes?: string[];
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
	approvedScopes?: string[],
): Promise<ConsentApprovalResponse> {
	return await makeRestApiRequest(context, 'POST', '/consent/approve', {
		approved,
		approvedScopes,
	});
}
