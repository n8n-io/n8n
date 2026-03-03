// Main exports
export { ExpressionEvaluator } from './evaluator/expression-evaluator';

// Bridge exports
export { IsolatedVmBridge } from './bridge/isolated-vm-bridge';

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

// Extension runtime exports
export { extend, extendOptional, EXTENSION_OBJECTS } from './extensions/extend';
export { ExpressionExtensionError } from './extensions/expression-extension-error';
