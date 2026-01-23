/**
 * Script Execution Module
 *
 * Provides the execute_script tool for the builder agent to run TypeScript
 * scripts that orchestrate multiple workflow operations at once.
 */

// Main tool export
export { createExecuteScriptTool, EXECUTE_SCRIPT_TOOL } from './execute-script.tool';

// Types for external use
export type {
	AddNodeInput,
	AddNodeResult,
	ConnectNodesInput,
	ConnectNodesResult,
	RemoveNodeInput,
	RemoveNodeResult,
	RemoveConnectionInput,
	RemoveConnectionResult,
	RenameNodeInput,
	RenameNodeResult,
	ValidateStructureResult,
	ScriptTools,
	ScriptExecutionContext,
	WorkflowSnapshot,
	WorkflowNodeInfo,
	WorkflowConnectionInfo,
} from './tool-interfaces';

// Interface definitions for prompts
export { TOOL_INTERFACE_DEFINITIONS } from './tool-interfaces';

// Error types
export {
	ScriptExecutionError,
	ScriptValidationError,
	ScriptTimeoutError,
	ScriptToolError,
} from './errors';

// State provider (for testing)
export { ScriptStateProvider, OperationsCollector, createWorkflowSnapshot } from './state-provider';

// Tool wrappers (for testing)
export { createToolWrappers } from './tool-wrappers';
export type { ToolWrappersConfig } from './tool-wrappers';

// Sandbox (for testing)
export { executeScript, validateScriptSyntax } from './script-sandbox';
export type { ScriptSandboxConfig, ScriptExecutionResult } from './script-sandbox';
