/**
 * Centralized prompts for AI Workflow Builder
 *
 * This directory contains all prompts used by the AI workflow builder agents and chains.
 * Organization:
 * - builder/ - PromptBuilder utility for composing prompts
 * - agents/ - Agent prompts (supervisor, discovery, builder, responder)
 * - chains/ - Chain-level prompts (categorization, compact, workflow-name, parameter-updater)
 * - shared/ - Shared prompt fragments
 */

// Prompt builder utility
export {
	PromptBuilder,
	prompt,
	type ContentOrFactory,
	type MessageBlock,
	type PromptBuilderOptions,
	type SectionFormat,
	type SectionOptions,
} from './builder';

// Agent prompts
export {
	buildBuilderPrompt,
	INSTANCE_URL_PROMPT,
	buildRecoveryModeContext,
} from './agents/builder.prompt';
export {
	buildDiscoveryPrompt,
	exampleCategorizations,
	formatTechniqueList,
	formatExampleCategorizations,
	type DiscoveryPromptOptions,
} from './agents/discovery.prompt';
export { buildSupervisorPrompt } from './agents/supervisor.prompt';
export {
	buildResponderPrompt,
	buildRecursionErrorWithWorkflowGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildGeneralErrorGuidance,
	buildDataTableCreationGuidance,
} from './agents/responder.prompt';

// Chain prompts
export {
	promptCategorizationTemplate,
	examplePrompts,
	formatExamplePrompts,
	formatTechniqueList as formatCategorizationTechniqueList,
} from './chains/categorization.prompt';
export { compactPromptTemplate } from './chains/compact.prompt';
export { workflowNamingPromptTemplate } from './chains/workflow-name.prompt';

// Parameter updater prompts
export {
	// Registry system
	getMatchingGuides,
	getMatchingExamples,
	matchesPattern,
	// Utilities
	hasResourceLocatorParameters,
	instanceUrlPrompt,
	// Base prompts
	CORE_INSTRUCTIONS,
	EXPRESSION_RULES,
	COMMON_PATTERNS,
	OUTPUT_FORMAT,
	// Node-type guides
	SET_NODE_GUIDE,
	IF_NODE_GUIDE,
	SWITCH_NODE_GUIDE,
	HTTP_REQUEST_GUIDE,
	TOOL_NODES_GUIDE,
	RESOURCE_LOCATOR_GUIDE,
	SYSTEM_MESSAGE_GUIDE,
	TEXT_FIELDS_GUIDE,
} from './chains/parameter-updater';

export type {
	NodeTypeGuide,
	NodeTypeExamples,
	NodeTypePattern,
	PromptContext,
} from './chains/parameter-updater';
