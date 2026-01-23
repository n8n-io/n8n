/**
 * Composite Tree Types
 *
 * Represents the nested structure of composites for code generation.
 */

import type { SemanticNode } from './types';

/**
 * Base for all composite node types
 */
interface CompositeNodeBase {
	kind: string;
}

/**
 * A leaf node - single node with no special composite structure
 */
export interface LeafNode extends CompositeNodeBase {
	kind: 'leaf';
	node: SemanticNode;
	/** Optional error handler for nodes with onError: 'continueErrorOutput' */
	errorHandler?: CompositeNode;
}

/**
 * A chain of nodes - linear sequence
 */
export interface ChainNode extends CompositeNodeBase {
	kind: 'chain';
	nodes: CompositeNode[];
}

/**
 * A variable reference - for cycles and convergence points
 */
export interface VariableReference extends CompositeNodeBase {
	kind: 'varRef';
	varName: string;
	nodeName: string;
}

/**
 * IF branch composite
 * trueBranch/falseBranch can be:
 * - null: no branch
 * - single CompositeNode: one target
 * - array of CompositeNode: fan-out to multiple parallel targets
 */
export interface IfBranchCompositeNode extends CompositeNodeBase {
	kind: 'ifBranch';
	ifNode: SemanticNode;
	trueBranch: CompositeNode | CompositeNode[] | null;
	falseBranch: CompositeNode | CompositeNode[] | null;
}

/**
 * Switch case composite
 * Each case can be:
 * - null: no branch
 * - single CompositeNode: one target
 * - array of CompositeNode: fan-out to multiple parallel targets
 */
export interface SwitchCaseCompositeNode extends CompositeNodeBase {
	kind: 'switchCase';
	switchNode: SemanticNode;
	cases: (CompositeNode | CompositeNode[] | null)[];
}

/**
 * Merge composite
 */
export interface MergeCompositeNode extends CompositeNodeBase {
	kind: 'merge';
	mergeNode: SemanticNode;
	branches: CompositeNode[];
}

/**
 * SplitInBatches composite
 * doneChain/loopChain can be:
 * - null: no branch
 * - single CompositeNode: one target
 * - array of CompositeNode: fan-out to multiple parallel targets
 */
export interface SplitInBatchesCompositeNode extends CompositeNodeBase {
	kind: 'splitInBatches';
	sibNode: SemanticNode;
	doneChain: CompositeNode | CompositeNode[] | null;
	loopChain: CompositeNode | CompositeNode[] | null;
}

/**
 * Fan-out composite - a node that connects to multiple parallel targets
 */
export interface FanOutCompositeNode extends CompositeNodeBase {
	kind: 'fanOut';
	sourceNode: CompositeNode;
	targets: CompositeNode[];
}

/**
 * An explicit connection between nodes with specific output/input indices.
 * Used when patterns require .connect() calls (e.g., same source node
 * feeding multiple inputs of the same merge node from different outputs).
 */
export interface ExplicitConnection {
	/** Source node name (variable reference) */
	sourceNode: string;
	/** Output index of the source node */
	sourceOutput: number;
	/** Target node name (variable reference) */
	targetNode: string;
	/** Input index of the target node */
	targetInput: number;
}

/**
 * Explicit connections composite - represents a group of nodes
 * connected via explicit .connect() calls rather than composite patterns.
 * Used for complex patterns like SIB→Merge where different outputs
 * of the same node go to different inputs of the same target.
 */
export interface ExplicitConnectionsNode extends CompositeNodeBase {
	kind: 'explicitConnections';
	/** Nodes that need to be added (as variable references) */
	nodes: SemanticNode[];
	/** Explicit connections between the nodes */
	connections: ExplicitConnection[];
}

/**
 * Union of all composite node types
 */
export type CompositeNode =
	| LeafNode
	| ChainNode
	| VariableReference
	| IfBranchCompositeNode
	| SwitchCaseCompositeNode
	| MergeCompositeNode
	| SplitInBatchesCompositeNode
	| FanOutCompositeNode
	| ExplicitConnectionsNode;

/**
 * The complete composite tree for a workflow
 */
export interface CompositeTree {
	/** Root chains (starting from triggers) */
	roots: CompositeNode[];
	/** Variable declarations needed (for cycles and convergence) */
	variables: Map<string, SemanticNode>;
}
