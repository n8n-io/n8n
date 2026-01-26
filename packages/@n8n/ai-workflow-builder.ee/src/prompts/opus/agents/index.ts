/**
 * Opus-optimized Agent Prompts
 *
 * Drastically reduced prompts for Claude Opus 4.5.
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
