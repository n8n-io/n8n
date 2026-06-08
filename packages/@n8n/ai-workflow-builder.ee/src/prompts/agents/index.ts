/**
 * Agent Prompts
 *
 * Prompts for the multi-agent workflow builder system.
 */

export { buildSupervisorPrompt } from './supervisor.prompt.js';
export {
	buildDiscoveryPrompt,
	exampleCategorizations,
	formatTechniqueList,
	formatExampleCategorizations,
<<<<<<< HEAD
} from './discovery.prompt';
=======
} from './discovery.prompt.js';
export type { DiscoveryPromptOptions } from './discovery.prompt.js';
>>>>>>> 566376fa25 (chore: switch to NodeNext module resolution + add import extensions (no-changelog))
export {
	buildResponderPrompt,
	buildRecursionErrorWithWorkflowGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildGeneralErrorGuidance,
	buildDataTableCreationGuidance,
} from './responder.prompt.js';
