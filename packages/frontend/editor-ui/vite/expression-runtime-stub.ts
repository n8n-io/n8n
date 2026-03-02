/**
 * Browser stub for @n8n/expression-runtime.
 * The real implementation uses isolated-vm (a Node.js-only native module).
 * IS_FRONTEND guards in expression.ts prevent these from ever being instantiated.
 */

export class ExpressionEvaluator {
	constructor() {
		throw new Error('ExpressionEvaluator is not available in browser environments');
	}
}

export class IsolatedVmBridge {
	constructor() {
		throw new Error('IsolatedVmBridge is not available in browser environments');
	}
}

export class ExpressionError extends Error {}
export class MemoryLimitError extends Error {}
export class TimeoutError extends Error {}
export class SecurityViolationError extends Error {}
// Note: SyntaxError not re-exported to avoid shadowing built-in

export function extend() {}
export function extendOptional() {}
export const EXTENSION_OBJECTS: unknown[] = [];
export class ExpressionExtensionError extends Error {}
