/**
 * Types for Codegen Pipeline
 *
 * These types define the intermediate representations used during
 * the transformation from WorkflowJSON to SDK code.
 */

import type { NodeJSON } from '../types/base';

/**
 * AI connection types that connect subnodes to parent nodes
 */
export const AI_CONNECTION_TYPES = [
	'ai_languageModel',
	'ai_memory',
	'ai_tool',
	'ai_outputParser',
	'ai_embedding',
	'ai_vectorStore',
	'ai_retriever',
	'ai_document',
	'ai_textSplitter',
	'ai_reranker',
] as const;

export type AiConnectionType = (typeof AI_CONNECTION_TYPES)[number];

/**
 * Connection to a subnode (for AI nodes)
 */
export interface SubnodeConnection {
	/** Connection type (e.g., 'ai_languageModel', 'ai_tool') */
	connectionType: AiConnectionType;
	/** Name of the subnode */
	subnodeName: string;
}

/**
 * Semantic connection from one node to another
 */
export interface SemanticConnection {
	/** Target node name */
	target: string;
	/** Semantic name of the target's input slot (e.g., 'branch0', 'input') */
	targetInputSlot: string;
}

/**
 * Source info for an input slot
 */
export interface SourceInfo {
	/** Source node name */
	from: string;
	/** Semantic name of the source's output slot */
	outputSlot: string;
}

/**
 * Annotations added during graph analysis
 */
export interface NodeAnnotations {
	/** Is this a trigger node? */
	isTrigger: boolean;
	/** Is this node a target of a cycle (loop back)? */
	isCycleTarget: boolean;
	/** Is this node reachable from multiple branches (convergence point)? */
	isConvergencePoint: boolean;
}

/**
 * A node with semantic connection information
 */
export interface SemanticNode {
	/** Node name (unique identifier in workflow) */
	name: string;
	/** Node type (e.g., 'n8n-nodes-base.if') */
	type: string;
	/** Original JSON representation */
	json: NodeJSON;
	/** Semantic outputs: output name → target connections */
	outputs: Map<string, SemanticConnection[]>;
	/** Semantic inputs: input slot name → source info */
	inputSources: Map<string, SourceInfo[]>;
	/** AI subnodes attached to this node */
	subnodes: SubnodeConnection[];
	/** Annotations added during analysis */
	annotations: NodeAnnotations;
}

/**
 * The semantic graph representation
 */
export interface SemanticGraph {
	/** All nodes in the graph */
	nodes: Map<string, SemanticNode>;
	/** Root nodes (triggers and orphans) */
	roots: string[];
	/** Cycle edges discovered during analysis: source → targets */
	cycleEdges: Map<string, string[]>;
}

/**
 * A resolved expression value from frontend execution
 */
export interface ExpressionValue {
	/** The original expression string (e.g., '={{ $json.name }}') */
	expression: string;
	/** The resolved value after evaluation */
	resolvedValue: unknown;
	/** Optional node type context */
	nodeType?: string;
	/** Parameter path where the expression is located (e.g., 'url', 'parameters.body') */
	parameterPath?: string;
}
