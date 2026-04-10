/**
 * Re-export shared types from @n8n/workflow-sdk.
 */
import type { WorkflowTechniqueType } from '@n8n/workflow-sdk/prompts/best-practices';

export {
	WorkflowTechnique,
	TechniqueDescription,
	type WorkflowTechniqueType,
} from '@n8n/workflow-sdk/prompts/best-practices';

/**
 * Result of prompt categorization (framework-specific, stays local).
 */
export interface PromptCategorization {
	techniques: WorkflowTechniqueType[];
	confidence?: number;
}
