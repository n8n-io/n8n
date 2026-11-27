import type {
	CreateRuntimeCredentialRuleDto,
	ProjectRuntimeCredentialRule,
	RuntimeCredentialRule,
	RuntimeCredentialRuleImpact,
	UpdateRuntimeCredentialRuleDto,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export type {
	ProjectRuntimeCredentialRule,
	RuntimeCredentialRule,
	RuntimeCredentialRuleImpact,
	RuntimeCredentialRuleImpactWorkflow,
} from '@n8n/api-types';

/** Shared with the backend. The rule DTO classes are values, so they are used as types here. */
export type CreateRuntimeCredentialRule = CreateRuntimeCredentialRuleDto;
export type UpdateRuntimeCredentialRule = UpdateRuntimeCredentialRuleDto;
export type RuntimeCredentialTransform = NonNullable<RuntimeCredentialRule['transform']>;

const RULES_ENDPOINT = '/runtime-credential-rules';

export async function fetchRules(context: IRestApiContext): Promise<RuntimeCredentialRule[]> {
	const response = await makeRestApiRequest<{ rules: RuntimeCredentialRule[] }>(
		context,
		'GET',
		RULES_ENDPOINT,
	);
	return response.rules;
}

/**
 * The rules with their access in one project. A project admin can read it. Fails with 403 when the
 * feature is off, the license is missing, or the user lacks the project scope.
 */
export async function fetchProjectRules(
	context: IRestApiContext,
	projectId: string,
): Promise<ProjectRuntimeCredentialRule[]> {
	const response = await makeRestApiRequest<{ rules: ProjectRuntimeCredentialRule[] }>(
		context,
		'GET',
		`/projects/${encodeURIComponent(projectId)}/runtime-credential-rules`,
	);
	return response.rules;
}

/** Fails with 409 for a duplicate alias and 400 for an invalid rule. */
export async function createRule(
	context: IRestApiContext,
	rule: CreateRuntimeCredentialRule,
): Promise<RuntimeCredentialRule> {
	return await makeRestApiRequest(context, 'POST', RULES_ENDPOINT, rule);
}

/** Fails with 403 for a rule that the environment sets. */
export async function updateRule(
	context: IRestApiContext,
	alias: string,
	update: UpdateRuntimeCredentialRule,
): Promise<RuntimeCredentialRule> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`${RULES_ENDPOINT}/${encodeURIComponent(alias)}`,
		update,
	);
}

/** Lists the workflows that read the value at the path in an expression. */
export async function fetchRuleImpact(
	context: IRestApiContext,
	body: { nodeType: string; path: string },
): Promise<RuntimeCredentialRuleImpact> {
	return await makeRestApiRequest(context, 'POST', `${RULES_ENDPOINT}/impact`, body);
}

/** Fails with 403 for a rule that the environment sets. */
export async function deleteRule(context: IRestApiContext, alias: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${RULES_ENDPOINT}/${encodeURIComponent(alias)}`);
}

// Project policy kind "request-fed credential types". Modeled on the credential type policy client.
// The backend sets this path. Change it here only.
const projectPolicyEndpoint = (projectId: string) =>
	`/projects/${encodeURIComponent(projectId)}/request-fed-credential-type-policies/project`;

export type PolicySelector = { kind: 'name' | 'package' | 'extends'; value: string };

export type PolicyRule = {
	id: string;
	action: 'allow' | 'deny' | 'delegate';
	selector: PolicySelector;
};

export type RequestFedPolicy = {
	rules: PolicyRule[];
	defaultAction: 'allow' | 'deny';
	/** What a save sends back. A stale version fails with 409. */
	version: number;
};

export async function fetchProjectPolicy(
	context: IRestApiContext,
	projectId: string,
): Promise<RequestFedPolicy> {
	return await makeRestApiRequest(context, 'GET', projectPolicyEndpoint(projectId));
}

export async function saveProjectPolicy(
	context: IRestApiContext,
	projectId: string,
	policy: RequestFedPolicy,
): Promise<RequestFedPolicy> {
	return await makeRestApiRequest(context, 'PUT', projectPolicyEndpoint(projectId), {
		rules: policy.rules,
		defaultAction: policy.defaultAction,
		version: policy.version,
	});
}
