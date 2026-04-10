/**
 * Re-export shared types from @n8n/workflow-sdk/prompts.
 */
export {
	WorkflowTechnique,
	TechniqueDescription,
	type WorkflowTechniqueType,
} from '@n8n/workflow-sdk/prompts';

/**
 * Result of prompt categorization (framework-specific, stays local).
 */
export interface PromptCategorization {
	techniques: import('@n8n/workflow-sdk/prompts').WorkflowTechniqueType[];
	confidence?: number;
}
