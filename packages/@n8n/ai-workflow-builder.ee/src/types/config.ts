import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { WorkflowState } from '@/workflow-state';

/**
 * LLM configuration for the workflow builder
 */
export interface LLMConfig {
	openAIApiKey?: string;
	model: string;
	temperature?: number;
}

/**
 * Options for parameter updater chain
 */
export interface ParameterUpdaterOptions {
	nodeType: string;
	nodeDefinition: INodeTypeDescription;
	requestedChanges: string[];
}

/**
 * Configuration for mapping node types to required prompt sections
 */
export interface NodePromptConfig {
	/** Node type patterns that require specific guides */
	nodeTypePatterns: {
		set: string[];
		if: string[];
		httpRequest: string[];
		tool: string[];
	};

	/** Keywords that trigger inclusion of specific guides */
	parameterKeywords: {
		resourceLocator: string[];
		textExpressions: string[];
	};

	/** Maximum number of examples to include */
	maxExamples: number;

	/** Token budget for dynamic sections */
	targetTokenBudget: number;
}

/**
 * Advanced configuration for fine-tuning prompt generation
 */
export interface PromptGenerationOptions {
	/** Include examples in the prompt */
	includeExamples?: boolean;

	/** Override the maximum number of examples */
	maxExamples?: number;

	/** Force inclusion of specific guides */
	forceInclude?: {
		setNode?: boolean;
		ifNode?: boolean;
		httpRequest?: boolean;
		toolNodes?: boolean;
		resourceLocator?: boolean;
		textFields?: boolean;
	};

	/** Custom token budget */
	tokenBudget?: number;

	/** Enable verbose logging */
	verbose?: boolean;
}

/**
 * Context for building prompts
 */
export interface PromptBuilderContext {
	nodeType: string;
	nodeDefinition: INodeTypeDescription;
	requestedChanges: string[];
	hasResourceLocatorParams?: boolean;
	options?: PromptGenerationOptions;
	config?: NodePromptConfig;
}

/**
 * Options for tool executor
 */
export interface ToolExecutorOptions {
	state: typeof WorkflowState.State;
	toolMap: Map<string, DynamicStructuredTool>;
}
