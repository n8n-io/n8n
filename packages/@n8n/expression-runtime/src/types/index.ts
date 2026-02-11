/**
 * Expression Runtime Types
 *
 * This module exports all TypeScript interfaces and types for the expression runtime.
 */

// Bridge types
export type {
	RuntimeBridge,
	BridgeConfig,
	WorkflowDataProxy,
} from './bridge';

// Runtime types
export type {
	RuntimeHostInterface,
	RuntimeGlobals,
	RuntimeConfig,
	LazyProxyConfig,
} from './runtime';

export { RuntimeError } from './runtime';

// Evaluator types
export type {
	EvaluatorConfig,
	IExpressionEvaluator,
	WorkflowData,
	EvaluateOptions,
	TournamentInstance,
	ValidationResult,
	ObservabilityProvider,
	MetricsAPI,
	TracesAPI,
	Span,
	LogsAPI,
} from './evaluator';

export {
	ExpressionError,
	MemoryLimitError,
	TimeoutError,
	SecurityViolationError,
	SyntaxError,
} from './evaluator';
