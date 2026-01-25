/**
 * Mock TypeScript Types for Graph-Based SDK Interface
 *
 * These types define the hypothetical graph-style SDK interface
 * for use with the TypeScript type checker during evaluation.
 *
 * This is NOT a real implementation - it's a type definition that
 * allows the code-typecheck evaluator to validate generated code.
 */

export const GRAPH_SDK_TYPES = `
// =============================================================================
// Core Types
// =============================================================================

/** Position specification [x, y] */
type PositionSpec = [number, number];

/** Placeholder function for user input values */
declare function placeholder(description: string): string;

/** Create a new credential marker */
declare function newCredential(name: string): { __credential: true; name: string };

// =============================================================================
// Node Configuration Types
// =============================================================================

/** Base node configuration */
interface NodeConfig<TParams = unknown> {
  name: string;
  parameters?: TParams;
  position?: PositionSpec;
  credentials?: Record<string, ReturnType<typeof newCredential>>;
  subnodes?: Record<string, SubnodeInstance>;
}

/** Node input specification */
interface NodeInput<TType extends string = string, TVersion extends number = number, TParams = unknown> {
  type: TType;
  version: TVersion;
  config: NodeConfig<TParams>;
}

/** Trigger input specification */
interface TriggerInput<TType extends string = string, TVersion extends number = number, TParams = unknown> {
  type: TType;
  version: TVersion;
  config: NodeConfig<TParams>;
}

// =============================================================================
// Node Instance Types (Simplified - no chaining, just identity)
// =============================================================================

/** Node instance - used as connection endpoints */
interface NodeInstance<TType extends string = string, TVersion extends string = string, TParams = unknown> {
  __nodeType: TType;
  __version: TVersion;
  __params: TParams;
  __nodeId: string;
}

/** Trigger instance */
interface TriggerInstance<TType extends string = string, TVersion extends string = string, TParams = unknown>
  extends NodeInstance<TType, TVersion, TParams> {}

/** Subnode instance (for AI nodes) */
interface SubnodeInstance {
  __isSubnode: true;
}

// =============================================================================
// Workflow Graph Builder
// =============================================================================

/** Workflow graph builder instance */
interface WorkflowGraph {
  /** Add a node to the workflow graph */
  addNode<T extends NodeInstance | TriggerInstance>(node: T): this;

  /**
   * Connect two nodes explicitly
   * @param source - The source node
   * @param outputIndex - Output index on the source node
   * @param target - The target node
   * @param inputIndex - Input index on the target node
   */
  connect(
    source: NodeInstance | TriggerInstance,
    outputIndex: number,
    target: NodeInstance,
    inputIndex: number
  ): this;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a workflow graph builder
 * Returns a graph object with addNode() and connect() methods
 */
declare function workflow(
  id: string,
  name: string,
  settings?: Record<string, unknown>
): WorkflowGraph;

/** Create a regular node */
declare function node<TInput extends NodeInput>(input: TInput): NodeInstance<TInput['type'], \`\${TInput['version']}\`, unknown>;

/** Create a trigger node */
declare function trigger<TInput extends TriggerInput>(input: TInput): TriggerInstance<TInput['type'], \`\${TInput['version']}\`, unknown>;

/** Create a sticky note */
declare function sticky(
  content: string,
  config?: { name?: string; position?: PositionSpec; width?: number; height?: number }
): NodeInstance;

// =============================================================================
// AI/LangChain Subnode Builders
// =============================================================================

/** Subnode input specification */
interface SubnodeInput<TType extends string = string, TVersion extends number = number, TParams = unknown> {
  type: TType;
  version: TVersion;
  config: NodeConfig<TParams>;
}

/** Create a language model subnode */
declare function languageModel(input: SubnodeInput): SubnodeInstance;

/** Create a memory subnode */
declare function memory(input: SubnodeInput): SubnodeInstance;

/** Create a tool subnode */
declare function tool(input: SubnodeInput): SubnodeInstance;

/** Create an output parser subnode */
declare function outputParser(input: SubnodeInput): SubnodeInstance;

/** Create an embedding subnode */
declare function embedding(input: SubnodeInput): SubnodeInstance;

/** Create a vector store subnode */
declare function vectorStore(input: SubnodeInput): SubnodeInstance;

/** Create a retriever subnode */
declare function retriever(input: SubnodeInput): SubnodeInstance;

/** Create a document loader subnode */
declare function documentLoader(input: SubnodeInput): SubnodeInstance;

/** Create a text splitter subnode */
declare function textSplitter(input: SubnodeInput): SubnodeInstance;
`;
