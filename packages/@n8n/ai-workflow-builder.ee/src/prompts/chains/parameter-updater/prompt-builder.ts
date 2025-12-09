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

export class ParameterUpdatePromptBuilder {
	/**
	 * Builds a dynamic system prompt based on the context
	 */
	static buildSystemPrompt(context: PromptBuilderContext): string {
		const options = context.options ?? {};

		// Determine which node-type specific guide to include (mutually exclusive)
		const hasSystemMessage = this.hasSystemMessageParameters(context.nodeDefinition);
		const isSet = this.isSetNode(context.nodeType);
		const isIf = this.isIfNode(context.nodeType);
		const isSwitch = this.isSwitchNode(context.nodeType);
		const isHttpRequest = this.isHttpRequestNode(context.nodeType);
		const isTool = this.isToolNode(context.nodeType);
		const needsResourceLocator =
			Boolean(context.hasResourceLocatorParams) || this.needsResourceLocatorGuide(context);
		const hasText = this.hasTextFields(context.nodeDefinition);

		// Build examples section lazily
		const buildExamplesSection = (): string | null => {
			const examples = this.selectRelevantExamples(context);
			if (examples.length === 0) return null;
			return '## Relevant Examples\n' + examples.join('\n');
		};

		return (
			prompt()
				.section('core_instructions', CORE_INSTRUCTIONS, { priority: 10 })
				.section('expression_rules', EXPRESSION_RULES, { priority: 20 })
				// Node-type specific guides (mutually exclusive)
				.sectionIf(hasSystemMessage, 'system_message_guide', SYSTEM_MESSAGE_GUIDE, { priority: 30 })
				.sectionIf(!hasSystemMessage && isSet, 'set_node_guide', SET_NODE_GUIDE, { priority: 30 })
				.sectionIf(!hasSystemMessage && !isSet && isIf, 'if_node_guide', IF_NODE_GUIDE, {
					priority: 30,
				})
				.sectionIf(
					!hasSystemMessage && !isSet && !isIf && isSwitch,
					'switch_node_guide',
					SWITCH_NODE_GUIDE,
					{ priority: 30 },
				)
				.sectionIf(
					!hasSystemMessage && !isSet && !isIf && !isSwitch && isHttpRequest,
					'http_request_guide',
					HTTP_REQUEST_GUIDE,
					{ priority: 30 },
				)
				// Additional guides (can be combined)
				.sectionIf(isTool, 'tool_nodes_guide', TOOL_NODES_GUIDE, { priority: 40 })
				.sectionIf(needsResourceLocator, 'resource_locator_guide', RESOURCE_LOCATOR_GUIDE, {
					priority: 50,
				})
				.sectionIf(hasText, 'text_fields_guide', TEXT_FIELDS_GUIDE, { priority: 60 })
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
	 * Checks if node has system message parameters based on node definition
	 * This applies to nodes like AI Agent, LLM Chain, Anthropic, OpenAI, etc.
	 */
	private static hasSystemMessageParameters(nodeDefinition: INodeTypeDescription): boolean {
		if (!nodeDefinition.properties) return false;

		// Check for common system message parameter patterns
		const hasSystemMessageParam = nodeDefinition.properties.some((prop) => {
			// Pattern 1 & 2: options.systemMessage (AI Agent) or options.system (Anthropic)
			if (prop.name === 'options' && prop.type === 'collection') {
				const collectionProp = prop;
				if (Array.isArray(collectionProp.options)) {
					return collectionProp.options.some(
						(opt) => opt.name === 'systemMessage' || opt.name === 'system',
					);
				}
			}

			// Pattern 3: messages parameter with role support (OpenAI, LLM Chain)
			if (
				prop.name === 'messages' &&
				(prop.type === 'fixedCollection' || prop.type === 'collection')
			) {
				return true; // Messages typically support system role
			}

			return false;
		});

		return hasSystemMessageParam;
	}

	/**
	 * Checks if node is a Set node
	 */
	private static isSetNode(nodeType: string): boolean {
		const category = getNodeTypeCategory(nodeType);
		return category === 'set';
	}

	/**
	 * Checks if node is an IF node
	 */
	private static isIfNode(nodeType: string): boolean {
		const category = getNodeTypeCategory(nodeType);
		return category === 'if';
	}

	/**
	 * Checks if node is a Switch node
	 */
	private static isSwitchNode(nodeType: string): boolean {
		const category = getNodeTypeCategory(nodeType);
		return category === 'switch';
	}

	/**
	 * Checks if node is an HTTP Request node
	 */
	private static isHttpRequestNode(nodeType: string): boolean {
		const category = getNodeTypeCategory(nodeType);
		return category === 'httpRequest';
	}

	/**
	 * Checks if node is a tool node (supports $fromAI)
	 */
	private static isToolNode(nodeType: string): boolean {
		const category = getNodeTypeCategory(nodeType);
		return category === 'tool';
	}

	/**
	 * Checks if any parameters are of type resourceLocator
	 */
	private static needsResourceLocatorGuide(context: PromptBuilderContext): boolean {
		return mentionsResourceKeywords(context.requestedChanges, context.config);
	}

	/**
	 * Checks if node has text/string fields that might use expressions
	 */
	private static hasTextFields(nodeDefinition: INodeTypeDescription): boolean {
		if (!nodeDefinition.properties) return false;

		return nodeDefinition.properties.some(
			(prop) => prop.type === 'string' && prop.typeOptions?.multipleValues !== true,
		);
	}

	/**
	 * Selects most relevant examples based on context
	 */
	private static selectRelevantExamples(context: PromptBuilderContext): string[] {
		const examples: string[] = [];
		const config = context.config ?? DEFAULT_PROMPT_CONFIG;
		const maxExamples = context.options?.maxExamples ?? config.maxExamples;

		// Priority order for example selection
		if (this.isToolNode(context.nodeType)) {
			examples.push(TOOL_NODE_EXAMPLES);
		} else if (this.isSetNode(context.nodeType)) {
			examples.push(SET_NODE_EXAMPLES);
		} else if (this.isIfNode(context.nodeType)) {
			examples.push(IF_NODE_EXAMPLES);
		} else if (this.isSwitchNode(context.nodeType)) {
			examples.push(SWITCH_NODE_EXAMPLES);
		}
		// Add resource locator examples if needed
		if (context.hasResourceLocatorParams) {
			examples.push(RESOURCE_LOCATOR_EXAMPLES);
		}

		// Add simple examples if we have room
		if (examples.length === 0) {
			examples.push(SIMPLE_UPDATE_EXAMPLES);
		}

		// Limit to max examples
		return examples.slice(0, maxExamples);
	}

	/**
	 * Analyzes node definition to determine if it has resource locator parameters
	 */
	static hasResourceLocatorParameters(nodeDefinition: INodeTypeDescription): boolean {
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
	 * Get token estimate for the built prompt
	 */
	static estimateTokens(prompt: string): number {
		// Rough estimate: 1 token ≈ 4 characters
		return Math.ceil(prompt.length / 4);
	}
}
