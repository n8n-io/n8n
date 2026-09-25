import type { AgentJsonConfig, AgentJsonWorkflowToolConfig } from '@n8n/api-types';

/**
 * Every workflow reference in an agent config. Only workflow tools carry one
 * today. Add a new location here and the runtime, the validation and the
 * dependency index pick it up together.
 */
export function extractAgentWorkflowRefs(
	config: AgentJsonConfig | null | undefined,
): AgentJsonWorkflowToolConfig[] {
	return (config?.tools ?? []).filter(
		(tool): tool is AgentJsonWorkflowToolConfig => tool.type === 'workflow',
	);
}
