// Core types
export type {
	// Workflow and node types
	WorkflowBuilder,
	WorkflowBuilderStatic,
	WorkflowBuilderOptions,
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
} from './types/base';

// Type guards
export { isNodeChain, isNodeInstance } from './types/base';

// Type aliases for convenience
export type { AnyNode, AnyChain, AnyTrigger, NodeParameters } from './types/aliases';

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
	switchCase,
	merge,
} from './workflow-builder/node-builders/node-builder';

// Export MergeFactoryConfig type for merge() factory
export type { MergeFactoryConfig } from './workflow-builder/node-builders/node-builder';

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
	fromAi, // Top-level function for $fromAI expressions
} from './workflow-builder/node-builders/subnode-builders';

// Merge nodes - use merge() factory and .input(n) syntax for connections
// Example: const mergeNode = merge({ version: 3 }); source.to(mergeNode.input(0))

// IF else types - use .onTrue()/.onFalse() fluent syntax
export type { IfElseTarget } from './workflow-builder/control-flow-builders/if-else';

// Switch case types - use .onCase() fluent syntax
export type { SwitchCaseTarget } from './workflow-builder/control-flow-builders/switch-case';

// Split in batches
export { splitInBatches } from './workflow-builder/control-flow-builders/split-in-batches';

// Note: fanOut() removed - use plain arrays for parallel connections
// Note: fanIn() removed - use multiple .to(node.input(n)) calls instead

// Loop-back helper for split in batches
export { nextBatch } from './workflow-builder/control-flow-builders/next-batch';

// Expression utilities
export {
	serializeExpression,
	parseExpression,
	isExpression,
	expr,
	createFromAIExpression,
} from './expression';

// Code helpers
export { runOnceForAllItems, runOnceForEachItem } from './utils/code-helpers';

// Utility functions
export { isPlainObject, getProperty, hasProperty } from './utils/safe-access';

// Validation
export {
	validateWorkflow,
	ValidationError,
	ValidationWarning,
	setSchemaBaseDirs,
	type ValidationResult,
	type ValidationOptions,
	type ValidationErrorCode,
} from './validation';

// Code generation
export { generateWorkflowCode } from './codegen/index';
export { parseWorkflowCode, parseWorkflowCodeToBuilder } from './codegen/parse-workflow-code';

// Type generation utilities (for runtime type generation in CLI)
export * from './generate-types';

// Plugin system
export {
	// Registry
	PluginRegistry,
	pluginRegistry,
	// Default registration
	registerDefaultPlugins,
	// Types
	type ValidationIssue,
	type PluginContext,
	type MutablePluginContext,
	type ValidatorPlugin,
	type CompositeHandlerPlugin,
	type SerializerPlugin,
} from './workflow-builder/plugins';

// Node type constants
export {
	NODE_TYPES,
	type NodeTypeValue,
	isIfNodeType,
	isSwitchNodeType,
	isMergeNodeType,
	isStickyNoteType,
	isSplitInBatchesType,
	isHttpRequestType,
	isWebhookType,
	isDataTableType,
} from './constants';
