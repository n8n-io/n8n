/**
 * AST Interpreter for SDK code.
 *
 * This module provides a secure, AST-based interpreter for evaluating
 * SDK code without using eval() or new Function().
 *
 * @example
 * ```typescript
 * import { interpretSDKCode } from './ast-interpreter';
 *
 * const code = `
 *   const wf = workflow('id', 'name');
 *   export default wf.add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }));
 * `;
 *
 * const result = interpretSDKCode(code, {
 *   workflow: workflowFn,
 *   trigger: triggerFn,
 *   // ... other SDK functions
 * });
 * ```
 */

export { interpretSDKCode } from './interpreter';
export type { SDKFunctions } from './interpreter';
export {
	InterpreterError,
	UnsupportedNodeError,
	SecurityError,
	UnknownIdentifierError,
} from './errors';
export { parseSDKCode } from './parser';
export {
	ALLOWED_SDK_FUNCTIONS,
	ALLOWED_METHODS,
	SDK_METHODS,
	FORBIDDEN_NODE_TYPES,
	SAFE_JSON_METHOD_NAMES,
	SAFE_STRING_METHOD_NAMES,
	BUILDER_BLOCKED_GLOBALS,
	SDK_INLINE_CONSTRAINTS,
	DANGEROUS_GLOBALS,
	isAllowedSDKFunction,
	isAllowedMethod,
} from './validators';
export type { BuilderBlockedGlobal, SdkMethodSpec, SdkMethodGroup } from './validators';
