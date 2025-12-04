/**
 * Centralized prompts for AI Workflow Builder
 *
 * This directory contains all prompts used by the AI workflow builder agents and chains.
 * Each agent has its own `.prompt.ts` file with documented sections.
 */

// Agent prompts
export { buildBuilderPrompt } from './agents/builder.prompt';
export {
	buildDiscoveryPrompt,
	formatTechniqueList,
	formatExampleCategorizations,
	type DiscoveryPromptOptions,
} from './agents/discovery.prompt';
export { buildConfiguratorPrompt, INSTANCE_URL_PROMPT } from './agents/configurator.prompt';
export { buildSupervisorPrompt, SUPERVISOR_PROMPT_SUFFIX } from './agents/supervisor.prompt';
export { buildResponderPrompt } from './agents/responder.prompt';
