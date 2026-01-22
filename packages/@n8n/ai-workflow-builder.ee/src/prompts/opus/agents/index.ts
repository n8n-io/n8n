/**
 * Opus-optimized Agent Prompts
 *
 * Drastically reduced prompts for Claude Opus 4.5.
 * Total reduction: ~3,538 lines → ~350-500 lines (~86-90% reduction)
 */

export { buildSupervisorPrompt } from './supervisor.prompt';
export {
	buildDiscoveryPrompt,
	exampleCategorizations,
	formatTechniqueList,
	formatExampleCategorizations,
} from './discovery.prompt';
export type { DiscoveryPromptOptions } from './discovery.prompt';
export { buildBuilderPrompt } from './builder.prompt';
export {
	buildConfiguratorPrompt,
	buildRecoveryModeContext,
	INSTANCE_URL_PROMPT,
} from './configurator.prompt';
export {
	buildResponderPrompt,
	buildRecursionErrorWithWorkflowGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildGeneralErrorGuidance,
} from './responder.prompt';
