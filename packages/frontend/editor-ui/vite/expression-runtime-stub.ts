/**
 * Browser stub for @n8n/expression-runtime.
 * The real implementation uses isolated-vm (a Node.js-only native module).
 * IS_FRONTEND guards in expression.ts prevent these from ever being instantiated.
 */

export class ExpressionEvaluator {
	constructor(_config?: unknown) {
		throw new Error('ExpressionEvaluator is not available in browser environments');
	}
}

export class IsolatedVmBridge {
	constructor(_config?: unknown) {
		throw new Error('IsolatedVmBridge is not available in browser environments');
	}
}

export class ExpressionError extends Error {
	constructor(
		message: string,
		public context: Record<string, unknown> = {},
	) {
		super(message);
	}
}
export class MemoryLimitError extends Error {}
export class TimeoutError extends Error {}
export class SecurityViolationError extends Error {}
// Note: SyntaxError not re-exported to avoid shadowing built-in

export class RuntimeError extends Error {}

export function extend() {}
export function extendOptional() {}
export const EXTENSION_OBJECTS: unknown[] = [];
export class ExpressionExtensionError extends Error {}

export const DEFAULT_BRIDGE_CONFIG = {};

// Type-only exports (resolved by TypeScript, erased at runtime)
export type IExpressionEvaluator = never;
export type EvaluatorConfig = never;
export type WorkflowData = Record<string, unknown>;
export type EvaluateOptions = never;
export type RuntimeBridge = never;
export type BridgeConfig = never;
export type ObservabilityProvider = never;
export type MetricsAPI = never;
export type TracesAPI = never;
export type Span = never;
export type LogsAPI = never;
