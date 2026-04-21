export const WORKFLOW_AUTHORING_CHECK_IDS = {
	AiAgentRequiresGuardrail: 'ai-agent-requires-guardrail',
} as const;

export type WorkflowAuthoringCheckId =
	(typeof WORKFLOW_AUTHORING_CHECK_IDS)[keyof typeof WORKFLOW_AUTHORING_CHECK_IDS];
