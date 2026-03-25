/**
 * Agent Prompts
 *
 * Prompts for the multi-agent workflow builder system.
 */

export { buildSupervisorPrompt } from './supervisor.prompt';
export {
	buildDiscoveryPrompt,
	exampleCategorizations,
	formatTechniqueList,
	formatExampleCategorizations,
} from './discovery.prompt';
export type { DiscoveryPromptOptions } from './discovery.prompt';
export {
	buildBuilderPrompt,
	buildRecoveryModeContext,
	INSTANCE_URL_PROMPT,
} from './builder.prompt';
export type { BuilderPromptOptions } from './builder.prompt';
export {
	buildResponderPrompt,
	buildRecursionErrorWithWorkflowGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildGeneralErrorGuidance,
	buildDataTableCreationGuidance,
} from './responder.prompt';
