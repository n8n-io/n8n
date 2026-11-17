import type {
	AvailableCredentialTypesResponse,
	AvailableTypesResponse,
	CredentialTransferPreview,
	CredentialTypePolicyEffectivePublicDto,
	FolderTransferPreview,
	InstanceTypeAccessResponse,
	PolicyEffectivePublicDto,
	PolicyEffectiveWriteResultPublicDto,
	SubWorkflowPolicyCheckResponse,
	WorkflowTransferPreview,
} from '@n8n/api-types';
import { get, makeRestApiRequest } from '@n8n/rest-api-client';
import { isRecord } from '@n8n/utils/is-record';
import { retry } from '@n8n/utils/retry';
import type { Themed } from 'n8n-workflow';
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

export async function fetchInstanceAccess(
	context: IRestApiContext,
	kind: RestrictedTypeKind,
): Promise<InstanceTypeAccessResponse> {
	return await makeRestApiRequest(context, 'GET', `${INSTANCE_POLICY_ENDPOINT[kind]}/access`);
}

export type CredentialTypeSummary = {
	displayName: string;
	icon?: Themed<string>;
	iconUrl?: Themed<string>;
	iconColor?: string;
	extends?: string[];
};

function toThemed(value: unknown): Themed<string> | undefined {
	if (typeof value === 'string') return value;
	if (isRecord(value) && typeof value.light === 'string' && typeof value.dark === 'string') {
		return { light: value.light, dark: value.dark };
	}
	return undefined;
}

// A type that a later package install adds shows its name until the page reloads.
const summariesByBaseUrl = new Map<string, Promise<Map<string, CredentialTypeSummary>>>();

/**
 * Credential types by name. Reads the static file that the editor also loads, because the server
 * releases the type descriptions from memory after startup. Each page reads the file once.
 */
export async function fetchCredentialTypeSummaries(
	baseUrl: string,
): Promise<Map<string, CredentialTypeSummary>> {
	let summaries = summariesByBaseUrl.get(baseUrl);
	if (!summaries) {
		summaries = readCredentialTypeSummaries(baseUrl);
		summariesByBaseUrl.set(baseUrl, summaries);
		// A failed or empty read tries again on the next call.
		void summaries.then(
			(read) => {
				if (read.size === 0) summariesByBaseUrl.delete(baseUrl);
			},
			() => summariesByBaseUrl.delete(baseUrl),
		);
	}
	return await summaries;
}

async function readCredentialTypeSummaries(
	baseUrl: string,
): Promise<Map<string, CredentialTypeSummary>> {
	let types: unknown;
	// Right after startup the server can still be writing the file, as the editor's own read allows.
	await retry(
		async () => {
			types = await get(baseUrl, 'types/credentials.json');
			return Array.isArray(types);
		},
		500,
		5,
	);
	if (!Array.isArray(types)) return new Map();

	return new Map(
		types.flatMap((type: unknown) => {
			if (
				!isRecord(type) ||
				typeof type.name !== 'string' ||
				typeof type.displayName !== 'string'
			) {
				return [];
			}
			const summary: CredentialTypeSummary = {
				displayName: type.displayName,
				icon: toThemed(type.icon),
				iconUrl: toThemed(type.iconUrl),
				iconColor: typeof type.iconColor === 'string' ? type.iconColor : undefined,
				extends: Array.isArray(type.extends)
					? type.extends.filter((parent): parent is string => typeof parent === 'string')
					: undefined,
			};
			return [[type.name, summary] as const];
		}),
	);
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
