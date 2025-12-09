// Registry system
export { getMatchingGuides, getMatchingExamples, matchesPattern, clearRegistry } from './registry';
export type {
	NodeTypeGuide,
	NodeTypeExamples,
	NodeTypePattern,
	PromptContext,
	GuideConfig,
	ExamplesConfig,
} from './types';

// Legacy exports (kept for backwards compatibility)
export {
	buildParameterUpdatePrompt,
	hasResourceLocatorParameters,
	estimatePromptTokens,
} from './prompt-builder';
export { instanceUrlPrompt } from './instance-url';
export {
	DEFAULT_PROMPT_CONFIG,
	getNodeTypeCategory,
	mentionsResourceKeywords,
	mentionsTextKeywords,
} from './prompt-config';

// Base prompts
export { CORE_INSTRUCTIONS } from './base/core-instructions';
export { EXPRESSION_RULES } from './base/expression-rules';
export { COMMON_PATTERNS } from './base/common-patterns';
export { OUTPUT_FORMAT } from './base/output-format';

// Node type guides (import for side effects - registration)
export { SET_NODE_GUIDE } from './node-types/set-node';
export { IF_NODE_GUIDE } from './node-types/if-node';
export { SWITCH_NODE_GUIDE } from './node-types/switch-node';
export { HTTP_REQUEST_GUIDE } from './node-types/http-request';
export { TOOL_NODES_GUIDE } from './node-types/tool-nodes';

// Parameter type guides (import for side effects - registration)
export { RESOURCE_LOCATOR_GUIDE } from './parameter-types/resource-locator';
export { SYSTEM_MESSAGE_GUIDE } from './parameter-types/system-message';
export { TEXT_FIELDS_GUIDE } from './parameter-types/text-fields';

// Examples (import for side effects - registration)
export { SET_NODE_EXAMPLES } from './examples/basic/set-node-examples';
export { IF_NODE_EXAMPLES } from './examples/basic/if-node-examples';
export { SWITCH_NODE_EXAMPLES } from './examples/basic/switch-node-examples';
export { SIMPLE_UPDATE_EXAMPLES } from './examples/basic/simple-updates';
export { TOOL_NODE_EXAMPLES } from './examples/advanced/tool-node-examples';
export { RESOURCE_LOCATOR_EXAMPLES } from './examples/advanced/resource-locator-examples';
