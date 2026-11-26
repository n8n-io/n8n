import type {
	AvailableCredentialTypesResponse,
	AvailableTypesResponse,
	CredentialTransferPreview,
	CredentialTypePolicyEffectivePublicDto,
	CredentialTypeUsageResponse,
	FolderTransferPreview,
	InstanceTypeAccessResponse,
	NodeTypeUsageResponse,
	PolicyEffectivePublicDto,
	PolicyEffectiveWriteResultPublicDto,
	ProjectPoliciesResponse,
	ProjectPolicySummary,
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

export async function fetchProjectPolicies(
	context: IRestApiContext,
): Promise<ProjectPoliciesResponse> {
	return await makeRestApiRequest(context, 'GET', '/project-policies');
}

/** Fails with 409 when the project already has a policy for both kinds. */
export async function createProjectPolicy(
	context: IRestApiContext,
	projectId: string,
): Promise<ProjectPolicySummary> {
	return await makeRestApiRequest(context, 'POST', '/project-policies', { projectId });
}

export async function fetchCredentialTypeUsage(
	context: IRestApiContext,
): Promise<CredentialTypeUsageResponse> {
	return await makeRestApiRequest(context, 'GET', '/credential-type-policies/usage');
}

export async function fetchNodeTypeUsage(context: IRestApiContext): Promise<NodeTypeUsageResponse> {
	return await makeRestApiRequest(context, 'GET', '/node-type-policies/usage');
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

/**
 * Reads the summaries of one kind once for each base URL. A type that a later package install adds
 * shows its name until the page reloads. A failed or empty read tries again on the next call.
 */
function readOncePerBaseUrl<T>(
	read: (baseUrl: string) => Promise<Map<string, T>>,
): (baseUrl: string) => Promise<Map<string, T>> {
	const byBaseUrl = new Map<string, Promise<Map<string, T>>>();
	return async (baseUrl) => {
		let summaries = byBaseUrl.get(baseUrl);
		if (!summaries) {
			summaries = read(baseUrl);
			byBaseUrl.set(baseUrl, summaries);
			void summaries.then(
				(result) => {
					if (result.size === 0) byBaseUrl.delete(baseUrl);
				},
				() => byBaseUrl.delete(baseUrl),
			);
		}
		return await summaries;
	};
}

/**
 * Reads a static type file that the editor also loads. The server frees the type descriptions from
 * memory after startup, so this file is the only place that still has them.
 */
async function readTypesFile(baseUrl: string, file: string): Promise<unknown[]> {
	let types: unknown;
	// Right after startup the server can still be writing the file, as the editor's own read allows.
	await retry(
		async () => {
			types = await get(baseUrl, file);
			return Array.isArray(types);
		},
		500,
		5,
	);
	return Array.isArray(types) ? types : [];
}

async function readCredentialTypeSummaries(
	baseUrl: string,
): Promise<Map<string, CredentialTypeSummary>> {
	const types = await readTypesFile(baseUrl, 'types/credentials.json');

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

export const fetchCredentialTypeSummaries = readOncePerBaseUrl(readCredentialTypeSummaries);

export type NodeTypeSummary = {
	displayName: string;
	hidden: boolean;
	icon?: Themed<string>;
	iconUrl?: Themed<string>;
	iconColor?: string;
};

/** The highest version of a node type description, which can list several. */
export function latestVersion(version: unknown): number {
	if (typeof version === 'number') return version;
	if (!Array.isArray(version)) return 0;
	return Math.max(0, ...version.filter((value): value is number => typeof value === 'number'));
}

async function readNodeTypeSummaries(baseUrl: string): Promise<Map<string, NodeTypeSummary>> {
	const types = await readTypesFile(baseUrl, 'types/nodes.json');

	const latest = new Map<string, { version: number; summary: NodeTypeSummary }>();
	for (const type of types) {
		if (!isRecord(type) || typeof type.name !== 'string' || typeof type.displayName !== 'string') {
			continue;
		}
		const version = latestVersion(type.version);
		const current = latest.get(type.name);
		if (current && current.version >= version) continue;

		latest.set(type.name, {
			version,
			summary: {
				displayName: type.displayName,
				hidden: type.hidden === true,
				icon: toThemed(type.icon),
				iconUrl: toThemed(type.iconUrl),
				iconColor: typeof type.iconColor === 'string' ? type.iconColor : undefined,
			},
		});
	}

	return new Map([...latest].map(([name, { summary }]) => [name, summary]));
}

export const fetchNodeTypeSummaries = readOncePerBaseUrl(readNodeTypeSummaries);

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
