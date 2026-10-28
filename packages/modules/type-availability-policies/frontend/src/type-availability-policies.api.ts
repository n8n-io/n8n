import type {
	AvailableCredentialTypesResponse,
	AvailableTypesResponse,
	SubWorkflowPolicyCheckResponse,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export async function fetchAvailableTypes(
	context: IRestApiContext,
	projectId: string,
): Promise<AvailableTypesResponse> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/available-types`);
}

export async function fetchAvailableCredentialTypes(
	context: IRestApiContext,
	projectId: string,
): Promise<AvailableCredentialTypesResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/available-credential-types`,
	);
}

export async function fetchSubWorkflowPolicyCheck(
	context: IRestApiContext,
	parentWorkflowId: string,
	subWorkflowId: string,
): Promise<SubWorkflowPolicyCheckResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/workflows/${parentWorkflowId}/sub-workflows/${subWorkflowId}/policy-check`,
	);
}
