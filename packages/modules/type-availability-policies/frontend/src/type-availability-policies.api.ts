import type {
	AvailableCredentialTypesResponse,
	AvailableTypesResponse,
	CredentialTransferPreview,
	CredentialTypePolicyEffectivePublicDto,
	FolderTransferPreview,
	PolicyEffectivePublicDto,
	PolicyEffectiveWriteResultPublicDto,
	SubWorkflowPolicyCheckResponse,
	WorkflowTransferPreview,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type { RestrictedTypeKind } from './type-availability-policies.constants';

type InstancePolicyByKind = {
	node: PolicyEffectivePublicDto;
	credential: CredentialTypePolicyEffectivePublicDto;
};

/** The composed instance policy of one kind. `version` is what a save sends back. */
export type InstancePolicy<K extends RestrictedTypeKind> = InstancePolicyByKind[K];

/** Rules that saved but deserve a second look. Both kinds return the same shape. */
export type PolicyRuleWarnings = PolicyEffectiveWriteResultPublicDto['warnings'];

export type InstancePolicyWriteResult<K extends RestrictedTypeKind> = InstancePolicy<K> & {
	warnings: PolicyRuleWarnings;
};

export type InstancePolicyContent<K extends RestrictedTypeKind> = Pick<
	InstancePolicy<K>,
	'rules' | 'defaultAction'
>;

const INSTANCE_POLICY_ENDPOINT = {
	node: '/node-type-policies/instance',
	credential: '/credential-type-policies/instance',
} as const satisfies Record<RestrictedTypeKind, string>;

export async function fetchInstancePolicy<K extends RestrictedTypeKind>(
	context: IRestApiContext,
	kind: K,
): Promise<InstancePolicy<K>> {
	return await makeRestApiRequest(context, 'GET', INSTANCE_POLICY_ENDPOINT[kind]);
}

/** Fails with 409 when `version` is not the current version of the policy. */
export async function saveInstancePolicy<K extends RestrictedTypeKind>(
	context: IRestApiContext,
	kind: K,
	policy: InstancePolicyContent<K> & { version: number },
): Promise<InstancePolicyWriteResult<K>> {
	return await makeRestApiRequest(context, 'PUT', INSTANCE_POLICY_ENDPOINT[kind], {
		rules: policy.rules,
		defaultAction: policy.defaultAction,
		version: policy.version,
	});
}

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

export async function fetchWorkflowTransferPreview(
	context: IRestApiContext,
	workflowId: string,
	destinationProjectId: string,
): Promise<WorkflowTransferPreview> {
	return await makeRestApiRequest(context, 'GET', `/workflows/${workflowId}/transfer-preview`, {
		destinationProjectId,
	});
}

export async function fetchFolderTransferPreview(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
	destinationProjectId: string,
): Promise<FolderTransferPreview> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/folders/${folderId}/transfer-preview`,
		{ destinationProjectId },
	);
}

export async function fetchCredentialTransferPreview(
	context: IRestApiContext,
	credentialId: string,
	destinationProjectId: string,
): Promise<CredentialTransferPreview> {
	return await makeRestApiRequest(context, 'GET', `/credentials/${credentialId}/transfer-preview`, {
		destinationProjectId,
	});
}
