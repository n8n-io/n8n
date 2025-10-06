import type { INodeTypeDescription, INodeProperties } from 'n8n-workflow';

import { COMMON_PATTERNS } from './base/common-patterns';
import { CORE_INSTRUCTIONS } from './base/core-instructions';
import { EXPRESSION_RULES } from './base/expression-rules';
import { OUTPUT_FORMAT } from './base/output-format';
import { RESOURCE_LOCATOR_EXAMPLES } from './examples/advanced/resource-locator-examples';
import { TOOL_NODE_EXAMPLES } from './examples/advanced/tool-node-examples';
import { IF_NODE_EXAMPLES } from './examples/basic/if-node-examples';
import { SET_NODE_EXAMPLES } from './examples/basic/set-node-examples';
import { SIMPLE_UPDATE_EXAMPLES } from './examples/basic/simple-updates';
import { HTTP_REQUEST_GUIDE } from './node-types/http-request';
import { IF_NODE_GUIDE } from './node-types/if-node';
import { SET_NODE_GUIDE } from './node-types/set-node';
import { TOOL_NODES_GUIDE } from './node-types/tool-nodes';
import { RESOURCE_LOCATOR_GUIDE } from './parameter-types/resource-locator';
import { TEXT_FIELDS_GUIDE } from './parameter-types/text-fields';
import {
	DEFAULT_PROMPT_CONFIG,
	getNodeTypeCategory,
	mentionsResourceKeywords,
} from './prompt-config';
import type { PromptBuilderContext } from '../../types/config';

export class ParameterUpdatePromptBuilder {
	/**
	 * Builds a dynamic system prompt based on the context
	 */
	static buildSystemPrompt(context: PromptBuilderContext): string {
		const options = context.options ?? {};
		const sections: string[] = [];

		// Always include base sections
		sections.push(CORE_INSTRUCTIONS);
		sections.push(EXPRESSION_RULES);

		// Add node-type specific guides
		if (this.isSetNode(context.nodeType)) {
			sections.push(SET_NODE_GUIDE);
		} else if (this.isIfNode(context.nodeType)) {
			sections.push(IF_NODE_GUIDE);
		} else if (this.isHttpRequestNode(context.nodeType)) {
			sections.push(HTTP_REQUEST_GUIDE);
		}

		// Add tool node guide if applicable
		if (this.isToolNode(context.nodeType)) {
			sections.push(TOOL_NODES_GUIDE);
		}

		// Add resource locator guide if needed
		if (context.hasResourceLocatorParams || this.needsResourceLocatorGuide(context)) {
			sections.push(RESOURCE_LOCATOR_GUIDE);
		}

		// Add text field guide if dealing with text parameters
		if (this.hasTextFields(context.nodeDefinition)) {
			sections.push(TEXT_FIELDS_GUIDE);
		}

		// Add common patterns
		sections.push(COMMON_PATTERNS);

		// Add relevant examples if enabled
		if (options.includeExamples !== false) {
			const examples = this.selectRelevantExamples(context);
			if (examples.length > 0) {
				sections.push('\n## Relevant Examples');
				sections.push.apply(sections, examples);
			}
		}

		// Always include output format at the end
		sections.push(OUTPUT_FORMAT);

		const finalPrompt = sections.join('\n');

		return finalPrompt;
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
