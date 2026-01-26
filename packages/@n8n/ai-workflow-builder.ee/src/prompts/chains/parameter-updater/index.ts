// Registry system
export { getMatchingGuides, getMatchingExamples, matchesPattern } from './registry';
export type {
	NodeTypeGuide,
	NodeTypeExamples,
	NodeTypePattern,
	PromptContext,
} from './types';

// Utilities
export { hasResourceLocatorParameters } from './utils';
export { instanceUrlPrompt } from './instance-url';

// Base prompts
export {
	CORE_INSTRUCTIONS,
	EXPRESSION_RULES,
	COMMON_PATTERNS,
	OUTPUT_FORMAT,
} from './parameter-updater.prompt';

// Node type guides
export {
	SET_NODE_GUIDE,
	IF_NODE_GUIDE,
	SWITCH_NODE_GUIDE,
	HTTP_REQUEST_GUIDE,
	TOOL_NODES_GUIDE,
	GMAIL_GUIDE,
} from './guides';

// Parameter type guides
export {
	RESOURCE_LOCATOR_GUIDE,
	SYSTEM_MESSAGE_GUIDE,
	TEXT_FIELDS_GUIDE,
} from './guides';

// Examples
export {
	SET_NODE_EXAMPLES,
	IF_NODE_EXAMPLES,
	SWITCH_NODE_EXAMPLES,
	SIMPLE_UPDATE_EXAMPLES,
	TOOL_NODE_EXAMPLES,
	RESOURCE_LOCATOR_EXAMPLES,
} from './examples';
