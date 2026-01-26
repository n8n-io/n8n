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
	SplitInBatchesDoneChain,
	SplitInBatchesEachChain,
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
	MergeFn,
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
export { node, trigger, sticky, placeholder, newCredential } from './node-builder';

// Subnode builders (for AI/LangChain nodes)
export {
	languageModel,
	memory,
	tool,
	outputParser,
	embedding,
	vectorStore,
	retriever,
	documentLoader,
	textSplitter,
} from './subnode-builders';

// Merge composite
export {
	merge,
	isMergeNamedInputSyntax,
	type MergeInputSource,
	type MergeNamedInputs,
} from './merge';

// IF else composite
export {
	ifElse,
	isIfElseNamedSyntax,
	type IfElseTarget,
	type IfElseNamedInputs,
} from './if-else';

// Switch case composite
export {
	switchCase,
	isSwitchCaseNamedSyntax,
	type SwitchCaseTarget,
	type SwitchCaseNamedInputs,
} from './switch-case';

// Split in batches
export { splitInBatches } from './split-in-batches';

// Fan-out / Fan-in helpers for explicit parallel connections
export { fanOut, isFanOut, type FanOutTargets } from './fan-out';
export { fanIn, isFanIn, type FanInSources } from './fan-in';

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
