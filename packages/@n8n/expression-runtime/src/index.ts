// Main exports
export { ExpressionEvaluator } from './evaluator/expression-evaluator';
export { NodeVmBridge } from './bridge/node-vm-bridge';

// Types
export type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
	RuntimeBridge,
	BridgeConfig,
	TournamentInstance,
	ValidationResult,
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
