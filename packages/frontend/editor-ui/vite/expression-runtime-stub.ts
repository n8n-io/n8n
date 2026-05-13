/**
 * Browser shim for @n8n/expression-runtime.
 *
 * IsolatedVmBridge depends on isolated-vm (a Node.js-only native module),
 * so we stub it with a throwing class. QuickJsBridge runs on WASM and works
 * in the browser, so we re-export the real implementation from source.
 */

// Real exports from source — vite resolves these relative paths at build time.
// The @n8n/expression-runtime alias in vite.config.mts points to THIS file,
// so the relative paths here are relative to vite/expression-runtime-stub.ts,
// not to the original package consumers' viewpoint.
export { QuickJsBridge } from '../../../@n8n/expression-runtime/src/bridge/quickjs-bridge';
export { ExpressionEvaluator } from '../../../@n8n/expression-runtime/src/evaluator/expression-evaluator';

export {
	ExpressionError,
	MemoryLimitError,
	TimeoutError,
	SecurityViolationError,
	SyntaxError,
} from '../../../@n8n/expression-runtime/src/types';

export {
	extend,
	extendOptional,
	EXTENSION_OBJECTS,
} from '../../../@n8n/expression-runtime/src/extensions/extend';
export { ExpressionExtensionError } from '../../../@n8n/expression-runtime/src/extensions/expression-extension-error';
export { NoOpProvider } from '../../../@n8n/expression-runtime/src/observability/noop-provider';
export { EXPRESSION_METRICS } from '../../../@n8n/expression-runtime/src/observability/metrics';
export { classifyExpressionError } from '../../../@n8n/expression-runtime/src/evaluator/error-classification';

export { DEFAULT_BRIDGE_CONFIG, RuntimeError } from '../../../@n8n/expression-runtime/src/types';

export class IsolatedVmBridge {
	constructor(_config?: unknown) {
		throw new Error('IsolatedVmBridge is not available in browser environments');
	}
}

export { IsolateError } from '../../../@n8n/errors/src/isolate.error';

// Type-only exports (resolved by TypeScript, erased at runtime)
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
	ExecuteOptions,
} from '../../../@n8n/expression-runtime/src/types';
