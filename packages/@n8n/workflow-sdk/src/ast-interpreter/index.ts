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
	isAllowedSDKFunction,
	isAllowedMethod,
} from './validators';
