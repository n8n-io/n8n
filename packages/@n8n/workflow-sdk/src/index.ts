// Core types
export type {
	// Workflow and node types
	WorkflowBuilder,
	WorkflowBuilderStatic,
	WorkflowSettings,
	WorkflowJSON,
	NodeJSON,
	NodeInstance,
	TriggerInstance,
	NodeChain,
	NodeConfig,
	NodeInput,
	TriggerInput,
	SubnodeConfig,
	CredentialReference,
	OnError,
	DeclaredConnection,
	// Subnode instance types
	SubnodeInstance,
	LanguageModelInstance,
	MemoryInstance,
	ToolInstance,
	OutputParserInstance,
	EmbeddingInstance,
	VectorStoreInstance,
	RetrieverInstance,
	DocumentLoaderInstance,
	TextSplitterInstance,
	// Expression types
	Expression,
	ExpressionContext,
	BinaryContext,
	BinaryField,
	InputContext,
	ExecutionContext,
	WorkflowContext,
	// Merge types
	MergeComposite,
	MergeConfig,
	MergeMode,
	// IF else types
	IfElseComposite,
	// Switch case types
	SwitchCaseComposite,
	// Sticky note types
	StickyNoteConfig,
	// Split in batches types
	SplitInBatchesBuilder,
	// Other types
	PlaceholderValue,
	NewCredentialValue,
	AllItemsContext,
	EachItemContext,
	CodeResult,
	ConnectionTarget,
	GraphNode,
	// Factory function types
	WorkflowFn,
	NodeFn,
	TriggerFn,
	StickyFn,
	PlaceholderFn,
	NewCredentialFn,
	// MergeFn removed - merge() is internal only, use node() + .input(n) syntax
	IfElseFn,
	IfElseConfig,
	SwitchCaseFn,
	SwitchCaseConfig,
	SplitInBatchesFn,
	SplitInBatchesConfig,
	RunOnceForAllItemsFn,
	RunOnceForEachItemFn,
	// n8n-workflow type duplicates (self-contained in SDK)
	GenericValue,
	IDataObject,
	IConnection,
	NodeInputConnections,
	INodeConnections,
	IConnections,
	// $fromAI types for tool nodes
	FromAIArgumentType,
	ToolConfigContext,
	ToolConfigInput,
	ToolInput,
} from './types/base';

// Type guard for NodeChain
export { isNodeChain } from './types/base';

// Workflow builder
export { workflow } from './workflow-builder';

// Node builders
export {
	node,
	trigger,
	sticky,
	placeholder,
	newCredential,
	ifElse,
	ifNode,
	switchCase,
	merge,
} from './node-builder';

// Export MergeFactoryConfig type for merge() factory
export type { MergeFactoryConfig } from './node-builder';

// Subnode builders (for AI/LangChain nodes)
export {
	languageModel,
	memory,
	tool,
	outputParser,
	embedding,
	embeddings, // Alias for embedding()
	vectorStore,
	retriever,
	documentLoader,
	textSplitter,
} from './subnode-builders';

// Merge nodes - use merge() factory and .input(n) syntax for connections
// Example: const mergeNode = merge({ version: 3 }); source.then(mergeNode.input(0))

// IF else types - use .onTrue()/.onFalse() fluent syntax
export type { IfElseTarget } from './if-else';

// Switch case types - use .onCase() fluent syntax
export type { SwitchCaseTarget } from './switch-case';

// Split in batches
export { splitInBatches } from './split-in-batches';

// Note: fanOut() removed - use plain arrays for parallel connections
// Note: fanIn() removed - use multiple .then(node.input(n)) calls instead

// Loop-back helper for split in batches
export { nextBatch, isNextBatch, type NextBatchMarker } from './next-batch';

// Expression utilities
export {
	serializeExpression,
	parseExpression,
	isExpression,
	expr,
	createFromAIExpression,
} from './expression';

// Code helpers
export { runOnceForAllItems, runOnceForEachItem } from './code-helpers';

// Validation
export {
	validateWorkflow,
	ValidationError,
	ValidationWarning,
	type ValidationResult,
	type ValidationOptions,
	type ValidationErrorCode,
} from './validation';

// Code generation
export { generateWorkflowCode } from './codegen/index';
export { parseWorkflowCode, parseWorkflowCodeToBuilder } from './parse-workflow-code';

// Embedded SDK API content (for runtime use without disk reads)
export { SDK_API_CONTENT } from './types/sdk-api-content';

// Type generation utilities (for runtime type generation in CLI)
export * from './generate-types';
