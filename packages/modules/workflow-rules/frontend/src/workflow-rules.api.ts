import type {
	EffectiveWorkflowRulesResponse,
	WorkflowRuleExemptionResponse,
	WorkflowRuleSetResponse,
	WorkflowRulesScanResponse,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';
import type { RuleSet, RulesExportBundle } from '@n8n/workflow-rules';

/** `null` is the instance rule set. */
export type RuleScopeId = string | null;

const base = (projectId: RuleScopeId) =>
	projectId === null ? '/workflow-rules' : `/projects/${projectId}/workflow-rules`;

export async function getRuleSet(context: IRestApiContext, projectId: RuleScopeId) {
	return await makeRestApiRequest<WorkflowRuleSetResponse>(
		context,
		'GET',
		projectId === null ? '/workflow-rules/instance' : `${base(projectId)}/`,
	);
}

export async function putRuleSet(
	context: IRestApiContext,
	projectId: RuleScopeId,
	ruleSet: RuleSet,
	version: number,
) {
	return await makeRestApiRequest<WorkflowRuleSetResponse>(
		context,
		'PUT',
		projectId === null ? '/workflow-rules/instance' : `${base(projectId)}/`,
		{ ruleSet, version },
	);
}

export async function getEffectiveRules(
	context: IRestApiContext,
	projectId: string,
	workflowId?: string,
) {
	const query = workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : '';
	return await makeRestApiRequest<EffectiveWorkflowRulesResponse>(
		context,
		'GET',
		`${base(projectId)}/effective${query}`,
	);
}

export async function scanRules(
	context: IRestApiContext,
	projectId: RuleScopeId,
	ruleSet?: RuleSet,
) {
	return await makeRestApiRequest<WorkflowRulesScanResponse>(
		context,
		'POST',
		`${base(projectId)}/scan`,
		ruleSet ? { ruleSet } : {},
	);
}

export async function listExemptions(context: IRestApiContext, projectId: RuleScopeId) {
	return await makeRestApiRequest<WorkflowRuleExemptionResponse[]>(
		context,
		'GET',
		`${base(projectId)}/exemptions`,
	);
}

export async function createExemption(
	context: IRestApiContext,
	projectId: RuleScopeId,
	exemption: { workflowId: string; ruleId: string; reason: string },
) {
	return await makeRestApiRequest<WorkflowRuleExemptionResponse>(
		context,
		'POST',
		`${base(projectId)}/exemptions`,
		exemption,
	);
}

export async function deleteExemption(
	context: IRestApiContext,
	projectId: RuleScopeId,
	exemptionId: number,
) {
	await makeRestApiRequest(context, 'DELETE', `${base(projectId)}/exemptions/${exemptionId}`);
}

export async function exportRules(context: IRestApiContext) {
	return await makeRestApiRequest<RulesExportBundle>(context, 'GET', '/workflow-rules/export');
}
