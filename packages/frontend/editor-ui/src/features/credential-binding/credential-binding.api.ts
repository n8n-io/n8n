import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * A credential the incoming package depends on, plus its resolution state on
 * this instance. `sourceId` is the credential id from the dev instance; once an
 * operator binds it to a local credential, `boundTargetId` points at that
 * credential and `satisfied` flips to true.
 */
export interface CredentialRequirement {
	sourceId: string;
	expectedType: string | null;
	usedByWorkflows: string[];
	boundTargetId: string | null;
	satisfied: boolean;
}

/** A local credential offered as a bind target for a given type. */
export interface CredentialOption {
	id: string;
	name: string;
	type: string;
}

export interface CredentialBindingResponse {
	pr: string;
	requirements: CredentialRequirement[];
}

export interface CredentialBindingOptionsResponse {
	options: CredentialOption[];
}

export async function getCredentialBindingRequirements(
	context: IRestApiContext,
	pr: string,
): Promise<CredentialBindingResponse> {
	return await makeRestApiRequest(context, 'GET', `/credential-binding/${encodeURIComponent(pr)}`);
}

export async function getCredentialBindingOptions(
	context: IRestApiContext,
	pr: string,
	type: string,
): Promise<CredentialBindingOptionsResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/credential-binding/${encodeURIComponent(pr)}/options`,
		{ type },
	);
}

export async function bindCredential(
	context: IRestApiContext,
	pr: string,
	payload: { sourceId: string; targetId: string },
): Promise<{ ok: true }> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/credential-binding/${encodeURIComponent(pr)}/bind`,
		payload,
	);
}
