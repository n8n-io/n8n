// Main exports
export { ExpressionEvaluator } from './evaluator/expression-evaluator';

// Bridge exports — IsolatedVmBridge uses isolated-vm (native module).
// Kept as type-only to prevent loading the native binary when other consumers
// statically import this barrel (e.g. for error classes).
// Runtime consumers should use: await import('@n8n/expression-runtime/bridge/isolated-vm-bridge')
export type { IsolatedVmBridge } from './bridge/isolated-vm-bridge';

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
