/**
 * Mock TypeScript Types for Builder Pattern SDK Interface
 *
 * These types define the hypothetical builder-style SDK interface
 * for use with the TypeScript type checker during evaluation.
 *
 * This is NOT a real implementation - it's a type definition that
 * allows the code-typecheck evaluator to validate generated code.
 */

export const BUILDER_SDK_TYPES = `
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
// Node Instance Types
// =============================================================================

/** Node instance with chaining capability */
interface NodeInstance<TType extends string = string, TVersion extends string = string, TParams = unknown> {
  __nodeType: TType;
  __version: TVersion;
  __params: TParams;

  /** Chain another node after this one */
  then<T extends NodeInstance>(node: T): T;

  /** Mark this node for batch loop connection */
  nextBatch(): this;
}

/** Trigger instance */
interface TriggerInstance<TType extends string = string, TVersion extends string = string, TParams = unknown>
  extends NodeInstance<TType, TVersion, TParams> {}

/** Subnode instance (for AI nodes) */
interface SubnodeInstance {
  __isSubnode: true;
}

// =============================================================================
// Workflow Builder
// =============================================================================

/** Workflow builder instance */
interface WorkflowBuilder {
  /** Add a node or chain to the workflow */
  add<T extends NodeInstance | TriggerInstance | IfElseBuilder | SwitchCaseBuilder | MergeBuilder | SplitInBatchesBuilder>(
    node: T
  ): this;

  /** Chain the next node after the current position */
  then<T extends NodeInstance | IfElseBuilder | SwitchCaseBuilder | MergeBuilder | SplitInBatchesBuilder>(
    node: T
  ): this;
}

// =============================================================================
// Composite Pattern Builders
// =============================================================================

/** If/Else builder - returns builder, branches are terminal */
interface IfElseBuilder {
  __isIfElse: true;

  /** Connect the true branch */
  onTrue<T extends NodeInstance | MergeInput | SplitInBatchesBuilder>(target: T): this;

  /** Connect the false branch */
  onFalse<T extends NodeInstance | MergeInput | SplitInBatchesBuilder>(target: T): this;
}

/** Switch/Case builder */
interface SwitchCaseBuilder {
  __isSwitch: true;

  /** Connect a specific case */
  onCase<T extends NodeInstance | MergeInput>(caseIndex: number, target: T): this;

  /** Connect the fallback case */
  onFallback<T extends NodeInstance | MergeInput>(target: T): this;
}

/** Merge builder with input connections */
interface MergeBuilder {
  __isMerge: true;

  /** Get a specific input connector */
  input(index: number): MergeInput;

  /** Continue after merge */
  then<T extends NodeInstance>(node: T): T;
}

/** Merge input connection point */
interface MergeInput {
  __isMergeInput: true;
  __inputIndex: number;
}

/** Split in batches builder config */
interface SplitInBatchesConfig {
  name: string;
  parameters: {
    batchSize: number;
    [key: string]: unknown;
  };
  position?: PositionSpec;
}

/** Split in batches builder */
interface SplitInBatchesBuilder {
  __isSplitInBatches: true;

  /** Connect the "each batch" path (with loop back) */
  eachBatch<T extends NodeInstance>(target: T): this;

  /** Connect the "done" path (after all batches) */
  done<T extends NodeInstance>(target: T): this;
}

// =============================================================================
// Factory Functions
// =============================================================================

/** Create a workflow builder */
declare function workflow(
  id: string,
  name: string,
  settings?: Record<string, unknown>
): WorkflowBuilder;

/** Create a regular node */
declare function node<TInput extends NodeInput>(input: TInput): NodeInstance<TInput['type'], \`\${TInput['version']}\`, unknown>;

/** Create a trigger node */
declare function trigger<TInput extends TriggerInput>(input: TInput): TriggerInstance<TInput['type'], \`\${TInput['version']}\`, unknown>;

/** Create a sticky note */
declare function sticky(
  content: string,
  config?: { name?: string; position?: PositionSpec; width?: number; height?: number }
): NodeInstance;

/** Create an if/else builder */
declare function ifElse(ifNode: NodeInstance): IfElseBuilder;

/** Create a switch/case builder */
declare function switchCase(switchNode: NodeInstance): SwitchCaseBuilder;

/** Create a merge builder */
declare function merge(config: {
  name: string;
  parameters: { mode: string; [key: string]: unknown };
  position?: PositionSpec;
}): MergeBuilder;

/** Create a split in batches builder */
declare function splitInBatches(config: SplitInBatchesConfig): SplitInBatchesBuilder;

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
