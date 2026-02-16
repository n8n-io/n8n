/**
 * Types for the Code Builder Agent
 *
 * Extracted from code-builder-agent.ts for better organization and testability.
 */

import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type {
	IDisplayOptions,
	INodeTypeDescription,
	ITelemetryTrackProperties,
} from 'n8n-workflow';

// ============================================================================
// Forked types from types/nodes.ts for code-builder specific features
// ============================================================================

/**
 * Represents a subnode requirement for AI nodes
 * Extracted from builderHint.inputs on node type descriptions
 */
export interface SubnodeRequirement {
	/** The connection type (e.g., 'ai_languageModel', 'ai_memory') */
	connectionType: string;
	/** Whether this subnode is required */
	required: boolean;
	/** Conditions under which this subnode is required (e.g., when hasOutputParser is true) */
	displayOptions?: IDisplayOptions;
}

/**
 * Node search result with scoring and subnode requirements
 *
 * This is an extended version of the base NodeSearchResult that includes
 * builder hints and subnode requirements for the code-builder agent.
 */
export interface CodeBuilderNodeSearchResult {
	name: string;
	displayName: string;
	description: string;
	version: number;
	score: number;
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
	/** General hint message for workflow builders (from builderHint.message) */
	builderHintMessage?: string;
	/** Subnode requirements extracted from builderHint.inputs */
	subnodeRequirements?: SubnodeRequirement[];
}

// ============================================================================
// Code Builder Agent Types
// ============================================================================

/**
 * Structured output type for the LLM response
 */
export interface WorkflowCodeOutput {
	workflowCode: string;
}

/**
 * Validation warning with optional location info
 */
export interface ValidationWarning {
	code: string;
	message: string;
	nodeName?: string;
	parameterPath?: string;
}

/**
 * Result from parseAndValidate including workflow and any warnings
 */
export interface ParseAndValidateResult {
	workflow: WorkflowJSON;
	warnings: ValidationWarning[];
}

/**
 * Token usage data reported by callback
 */
export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
	thinkingTokens: number;
}

/**
 * Configuration for the code builder agent
 */
export interface CodeBuilderAgentConfig {
	/** LLM for generation */
	llm: BaseChatModel;
	/** Parsed node types from n8n */
	nodeTypes: INodeTypeDescription[];
	/** Optional logger */
	logger?: Logger;
	/**
	 * Ordered list of directories to search for built-in node definitions.
	 */
	nodeDefinitionDirs?: string[];
	/**
	 * Enable the text editor tool for targeted code edits.
	 * If not specified, auto-enabled for Claude 4.x models.
	 */
	enableTextEditor?: boolean;
	/**
	 * Optional callback to receive token usage data from each LLM invocation.
	 * Called after each LLM call completes. Callers can accumulate for totals.
	 */
	onTokenUsage?: (usage: TokenUsage) => void;
	/**
	 * Optional LangChain callbacks (e.g., LangSmith tracer) for LLM invocations.
	 */
	callbacks?: Callbacks;
	/**
	 * Optional metadata to include in LangSmith traces.
	 */
	runMetadata?: Record<string, unknown>;
	/**
	 * Optional callback for emitting telemetry events.
	 */
	onTelemetryEvent?: (event: string, properties: ITelemetryTrackProperties) => void;
	/**
	 * Whether to generate pin data for new nodes. Defaults to true.
	 */
	generatePinData?: boolean;
}
