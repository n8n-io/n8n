// Main exports
export { ExpressionEvaluator } from './evaluator/expression-evaluator';

// Bridge exports — IsolatedVmBridge lazy-loads isolated-vm internally,
// so this value re-export does NOT pull in the native binary at import time.
export { IsolatedVmBridge } from './bridge/isolated-vm-bridge';

// Types
export type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
	ExecuteOptions,
	RuntimeBridge,
	BridgeConfig,
	Logger,
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
export { IsolateError } from '@n8n/errors';

export { NoOpProvider } from './observability/noop-provider';
export { EXPRESSION_METRICS } from './observability/metrics';
export type { ExpressionMetricDef, ExpressionMetricKey, MetricDef } from './observability/metrics';
export { classifyExpressionError } from './evaluator/error-classification';
export type { ExpressionErrorType } from './evaluator/error-classification';

// Extension runtime exports
export { extend, extendOptional, EXTENSION_OBJECTS } from './extensions/extend';
export { ExpressionExtensionError } from './extensions/expression-extension-error';
