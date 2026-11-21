import type {
	AgentJsonConfig,
	AgentToolGuardrailConfig,
	AgentJsonWorkflowToolConfig,
} from '@n8n/api-types';

/**
 * Every workflow reference in an agent config. Only workflow tools carry one
 * today. Add a new location here and the runtime, the validation and the
 * dependency index pick it up together.
 */
export function extractAgentWorkflowRefs(
	config: Pick<AgentJsonConfig, 'tools'> | null | undefined,
): AgentJsonWorkflowToolConfig[] {
	return (config?.tools ?? []).filter(
		(tool): tool is AgentJsonWorkflowToolConfig => tool.type === 'workflow',
	);
}

/**
 * The check-workflow ids of `workflow`-kind tool guardrails. Kept beside the
 * tool refs so the validation and the dependency index pick both up together.
 */
export function extractGuardrailCheckWorkflowIds(
	config: Pick<AgentJsonConfig, 'config'> | null | undefined,
): string[] {
	return (config?.config?.guardrails?.tools ?? [])
		.filter((guardrail): guardrail is Extract<AgentToolGuardrailConfig, { kind: 'workflow' }> => {
			return guardrail.kind === 'workflow';
		})
		.map((guardrail) => guardrail.workflowId);
}
