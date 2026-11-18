import type { RuntimeCredentialRule, RuntimeCredentialRulesResponse } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export async function getRuntimeCredentialRules(
	context: IRestApiContext,
): Promise<RuntimeCredentialRulesResponse> {
	return await makeRestApiRequest(context, 'GET', '/runtime-credentials/rules');
}

/** Replaces every rule saved in the UI. Rules from the environment variable stay. */
export async function updateRuntimeCredentialRules(
	context: IRestApiContext,
	rules: RuntimeCredentialRule[],
): Promise<RuntimeCredentialRulesResponse> {
	return await makeRestApiRequest(context, 'PUT', '/runtime-credentials/rules', { rules });
}
