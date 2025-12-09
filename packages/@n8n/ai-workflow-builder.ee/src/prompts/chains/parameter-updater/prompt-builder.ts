/**
 * Parameter Update Prompt Builder
 *
 * Functions for building dynamic prompts for the parameter updater chain.
 * Uses the PromptBuilder API for type-safe, conditional prompt composition.
 */

import type { INodeTypeDescription, INodeProperties } from 'n8n-workflow';

import { prompt } from '@/prompts/builder';
import type { PromptBuilderContext } from '@/types/config';

import { COMMON_PATTERNS } from './base/common-patterns';
import { CORE_INSTRUCTIONS } from './base/core-instructions';
import { EXPRESSION_RULES } from './base/expression-rules';
import { OUTPUT_FORMAT } from './base/output-format';
import { RESOURCE_LOCATOR_EXAMPLES } from './examples/advanced/resource-locator-examples';
import { TOOL_NODE_EXAMPLES } from './examples/advanced/tool-node-examples';
import { IF_NODE_EXAMPLES } from './examples/basic/if-node-examples';
import { SET_NODE_EXAMPLES } from './examples/basic/set-node-examples';
import { SIMPLE_UPDATE_EXAMPLES } from './examples/basic/simple-updates';
import { SWITCH_NODE_EXAMPLES } from './examples/basic/switch-node-examples';
import { HTTP_REQUEST_GUIDE } from './node-types/http-request';
import { IF_NODE_GUIDE } from './node-types/if-node';
import { SET_NODE_GUIDE } from './node-types/set-node';
import { SWITCH_NODE_GUIDE } from './node-types/switch-node';
import { TOOL_NODES_GUIDE } from './node-types/tool-nodes';
import { RESOURCE_LOCATOR_GUIDE } from './parameter-types/resource-locator';
import { SYSTEM_MESSAGE_GUIDE } from './parameter-types/system-message';
import { TEXT_FIELDS_GUIDE } from './parameter-types/text-fields';
import {
	DEFAULT_PROMPT_CONFIG,
	getNodeTypeCategory,
	mentionsResourceKeywords,
} from './prompt-config';

// ============================================================================
// Node Type Detection Helpers
// ============================================================================

function isSetNode(nodeType: string): boolean {
	return getNodeTypeCategory(nodeType) === 'set';
}

function isIfNode(nodeType: string): boolean {
	return getNodeTypeCategory(nodeType) === 'if';
}

function isSwitchNode(nodeType: string): boolean {
	return getNodeTypeCategory(nodeType) === 'switch';
}

function isHttpRequestNode(nodeType: string): boolean {
	return getNodeTypeCategory(nodeType) === 'httpRequest';
}

function isToolNode(nodeType: string): boolean {
	return getNodeTypeCategory(nodeType) === 'tool';
}

// ============================================================================
// Node Definition Analysis Helpers
// ============================================================================

/**
 * Checks if node has system message parameters based on node definition.
 * This applies to nodes like AI Agent, LLM Chain, Anthropic, OpenAI, etc.
 */
function hasSystemMessageParameters(nodeDefinition: INodeTypeDescription): boolean {
	if (!nodeDefinition.properties) return false;

	return nodeDefinition.properties.some((prop) => {
		// Pattern 1 & 2: options.systemMessage (AI Agent) or options.system (Anthropic)
		if (prop.name === 'options' && prop.type === 'collection') {
			if (Array.isArray(prop.options)) {
				return prop.options.some((opt) => opt.name === 'systemMessage' || opt.name === 'system');
			}
		}

		// Pattern 3: messages parameter with role support (OpenAI, LLM Chain)
		if (
			prop.name === 'messages' &&
			(prop.type === 'fixedCollection' || prop.type === 'collection')
		) {
			return true;
		}

		return false;
	});
}

/**
 * Checks if node has text/string fields that might use expressions
 */
function hasTextFields(nodeDefinition: INodeTypeDescription): boolean {
	if (!nodeDefinition.properties) return false;

	return nodeDefinition.properties.some(
		(prop) => prop.type === 'string' && prop.typeOptions?.multipleValues !== true,
	);
}

/**
 * Checks if resource locator guide is needed based on requested changes
 */
function needsResourceLocatorGuide(context: PromptBuilderContext): boolean {
	return mentionsResourceKeywords(context.requestedChanges, context.config);
}

// ============================================================================
// Example Selection
// ============================================================================

/**
 * Selects the most relevant examples based on context
 */
function selectRelevantExamples(context: PromptBuilderContext): string[] {
	const examples: string[] = [];
	const config = context.config ?? DEFAULT_PROMPT_CONFIG;
	const maxExamples = context.options?.maxExamples ?? config.maxExamples;

	// Priority order for example selection
	if (isToolNode(context.nodeType)) {
		examples.push(TOOL_NODE_EXAMPLES.content);
	} else if (isSetNode(context.nodeType)) {
		examples.push(SET_NODE_EXAMPLES.content);
	} else if (isIfNode(context.nodeType)) {
		examples.push(IF_NODE_EXAMPLES.content);
	} else if (isSwitchNode(context.nodeType)) {
		examples.push(SWITCH_NODE_EXAMPLES.content);
	}

	// Add resource locator examples if needed
	if (context.hasResourceLocatorParams) {
		examples.push(RESOURCE_LOCATOR_EXAMPLES.content);
	}

	// Add simple examples if we have room
	if (examples.length === 0) {
		examples.push(SIMPLE_UPDATE_EXAMPLES.content);
	}

	return examples.slice(0, maxExamples);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Builds a dynamic system prompt based on the context.
 * Uses conditional sections to include only relevant guides and examples.
 */
export function buildParameterUpdatePrompt(context: PromptBuilderContext): string {
	const options = context.options ?? {};

	// Determine which node-type specific guide to include (mutually exclusive)
	const hasSystemMessage = hasSystemMessageParameters(context.nodeDefinition);
	const isSet = isSetNode(context.nodeType);
	const isIf = isIfNode(context.nodeType);
	const isSwitch = isSwitchNode(context.nodeType);
	const isHttpRequest = isHttpRequestNode(context.nodeType);
	const isTool = isToolNode(context.nodeType);
	const needsResourceLocator =
		Boolean(context.hasResourceLocatorParams) || needsResourceLocatorGuide(context);
	const hasText = hasTextFields(context.nodeDefinition);

	// Build examples section lazily
	const buildExamplesSection = (): string | null => {
		const examples = selectRelevantExamples(context);
		if (examples.length === 0) return null;
		return '## Relevant Examples\n' + examples.join('\n');
	};

	return (
		prompt()
			.section('core_instructions', CORE_INSTRUCTIONS, { priority: 10 })
			.section('expression_rules', EXPRESSION_RULES, { priority: 20 })
			// Node-type specific guides (mutually exclusive)
			.sectionIf(hasSystemMessage, 'system_message_guide', SYSTEM_MESSAGE_GUIDE.content, {
				priority: 30,
			})
			.sectionIf(!hasSystemMessage && isSet, 'set_node_guide', SET_NODE_GUIDE.content, {
				priority: 30,
			})
			.sectionIf(!hasSystemMessage && !isSet && isIf, 'if_node_guide', IF_NODE_GUIDE.content, {
				priority: 30,
			})
			.sectionIf(
				!hasSystemMessage && !isSet && !isIf && isSwitch,
				'switch_node_guide',
				SWITCH_NODE_GUIDE.content,
				{
					priority: 30,
				},
			)
			.sectionIf(
				!hasSystemMessage && !isSet && !isIf && !isSwitch && isHttpRequest,
				'http_request_guide',
				HTTP_REQUEST_GUIDE.content,
				{ priority: 30 },
			)
			// Additional guides (can be combined)
			.sectionIf(isTool, 'tool_nodes_guide', TOOL_NODES_GUIDE.content, { priority: 40 })
			.sectionIf(needsResourceLocator, 'resource_locator_guide', RESOURCE_LOCATOR_GUIDE.content, {
				priority: 50,
			})
			.sectionIf(hasText, 'text_fields_guide', TEXT_FIELDS_GUIDE.content, { priority: 60 })
			// Common patterns
			.section('common_patterns', COMMON_PATTERNS, { priority: 70 })
			// Examples (conditional with lazy evaluation)
			.sectionIf(options.includeExamples !== false, 'examples', buildExamplesSection, {
				priority: 80,
			})
			// Output format always last
			.section('output_format', OUTPUT_FORMAT, { priority: 90 })
			.build()
	);
}

/**
 * Analyzes node definition to determine if it has resource locator parameters.
 */
export function hasResourceLocatorParameters(nodeDefinition: INodeTypeDescription): boolean {
	if (!nodeDefinition.properties) return false;

	const checkProperties = (properties: INodeProperties[]): boolean => {
		for (const prop of properties) {
			if (prop.type === 'resourceLocator' || prop.type === 'fixedCollection') return true;
		}
		return false;
	};

	return checkProperties(nodeDefinition.properties);
}

/**
 * Estimates token count for a prompt string.
 * Uses rough estimate of ~4 characters per token.
 */
export function estimatePromptTokens(promptText: string): number {
	return Math.ceil(promptText.length / 4);
}
