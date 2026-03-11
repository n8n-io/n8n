// Main exports
export { ExpressionEvaluator } from './evaluator/expression-evaluator';

// Bridge exports — IsolatedVmBridge uses isolated-vm (native module).
// Kept as a type-only re-export to avoid loading the native binary at startup.
// Consumers needing the class at runtime should use:
//   const { IsolatedVmBridge } = await import('@n8n/expression-runtime/bridge/isolated-vm-bridge');
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
