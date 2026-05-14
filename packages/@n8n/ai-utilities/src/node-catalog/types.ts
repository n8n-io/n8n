/**
 * Types for the node catalog (search/get) used by the AI workflow builder and MCP tools.
 */

import type { IDisplayOptions, INodeTypeDescription } from 'n8n-workflow';

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
	/** General hint message for workflow builders (from node-level builderHint.searchHint) */
	builderHintMessage?: string;
	/** Subnode requirements extracted from builderHint.inputs */
	subnodeRequirements?: SubnodeRequirement[];
}
