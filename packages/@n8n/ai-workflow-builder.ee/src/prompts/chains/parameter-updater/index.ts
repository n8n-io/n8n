export { ParameterUpdatePromptBuilder } from './prompt-builder';
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

// Node type guides
export { SET_NODE_GUIDE } from './node-types/set-node';
export { IF_NODE_GUIDE } from './node-types/if-node';
export { SWITCH_NODE_GUIDE } from './node-types/switch-node';
export { HTTP_REQUEST_GUIDE } from './node-types/http-request';
export { GMAIL_GUIDE } from './node-types/gmail';
export { TOOL_NODES_GUIDE } from './node-types/tool-nodes';

// Parameter type guides
export { RESOURCE_LOCATOR_GUIDE } from './parameter-types/resource-locator';
export { SYSTEM_MESSAGE_GUIDE } from './parameter-types/system-message';
export { TEXT_FIELDS_GUIDE } from './parameter-types/text-fields';
