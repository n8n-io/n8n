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
 */
export interface IfBranchCompositeNode extends CompositeNodeBase {
	kind: 'ifBranch';
	ifNode: SemanticNode;
	trueBranch: CompositeNode | null;
	falseBranch: CompositeNode | null;
}

/**
 * Switch case composite
 */
export interface SwitchCaseCompositeNode extends CompositeNodeBase {
	kind: 'switchCase';
	switchNode: SemanticNode;
	cases: (CompositeNode | null)[];
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
 */
export interface SplitInBatchesCompositeNode extends CompositeNodeBase {
	kind: 'splitInBatches';
	sibNode: SemanticNode;
	doneChain: CompositeNode | null;
	loopChain: CompositeNode | null;
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
	| SplitInBatchesCompositeNode;

/**
 * The complete composite tree for a workflow
 */
export interface CompositeTree {
	/** Root chains (starting from triggers) */
	roots: CompositeNode[];
	/** Variable declarations needed (for cycles and convergence) */
	variables: Map<string, SemanticNode>;
}
