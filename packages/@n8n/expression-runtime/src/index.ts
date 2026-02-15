// Main exports
export { ExpressionEvaluator } from './evaluator/expression-evaluator';
export { NodeVmBridge } from './bridge/node-vm-bridge';

// Proxy exports
export { createWorkflowDataProxy, createProxyCallbacks, createDeepLazyProxy } from './proxy';
export type { ProxyCallbacks, ProxyOptions, ValueMetadata } from './proxy';

// Types
export type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
	RuntimeBridge,
	BridgeConfig,
	ObservabilityProvider,
	MetricsAPI,
	TracesAPI,
	Span,
	LogsAPI,
} from './types';

// Error types
export {
	ExpressionError,
	MemoryLimitError,
	TimeoutError,
	SecurityViolationError,
	SyntaxError,
} from './types';
