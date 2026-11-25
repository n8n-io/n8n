import type {
	AgentJsonConfig,
	AgentToolGuardrailConfig,
	AgentJsonWorkflowToolConfig,
} from '@n8n/api-types';

/**
 * Workflow-tool references in an agent config. Guardrail check workflows are
 * a separate list: {@link extractGuardrailCheckWorkflowIds}.
 */
export function extractAgentWorkflowRefs(
	config: Pick<AgentJsonConfig, 'tools'> | null | undefined,
): AgentJsonWorkflowToolConfig[] {
	return (config?.tools ?? []).filter(
		(tool): tool is AgentJsonWorkflowToolConfig => tool.type === 'workflow',
	);
}

/**
 * The check-workflow ids of `workflow`-kind tool guardrails. Callers that
 * walk workflow tools also walk this list: validation, draft save, the
 * dependency index, and package import and export.
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
