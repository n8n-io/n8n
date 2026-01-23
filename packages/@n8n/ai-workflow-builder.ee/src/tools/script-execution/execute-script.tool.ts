/**
 * Execute Script Tool
 *
 * Allows the builder agent to execute TypeScript scripts that orchestrate
 * multiple tool calls at once. This reduces latency by avoiding multiple
 * LLM inference cycles and keeps intermediate results in script context.
 */

import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { ToolExecutionError, ValidationError } from '@/errors';
import { createProgressReporter, reportProgress } from '@/tools/helpers/progress';
import { createErrorResponse, createSuccessResponse } from '@/tools/helpers/response';
import { getCurrentWorkflow, getWorkflowState } from '@/tools/helpers/state';
import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { ScriptExecutionError, ScriptValidationError } from './errors';
import { executeScript, validateScriptSyntax } from './script-sandbox';
import { ScriptStateProvider } from './state-provider';
import { createToolWrappers } from './tool-wrappers';

/**
 * Schema for execute script input
 */
const executeScriptSchema = z.object({
	script: z
		.string()
		.describe(
			'TypeScript/JavaScript code to execute. Has access to `tools` object with addNode, connectNodes, removeNode, removeConnection, renameNode methods. Also has `workflow` object with read-only workflow state and `console` for logging.',
		),
	description: z
		.string()
		.optional()
		.describe('Brief description of what this script does (for logging/debugging)'),
	validateStructure: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Automatically validate workflow structure after script execution (default: true). Set to false if you plan to make additional changes before validation.',
		),
});

export const EXECUTE_SCRIPT_TOOL: BuilderToolBase = {
	toolName: 'execute_script',
	displayTitle: 'Adding nodes and connections',
};

/**
 * Get custom display title based on script description
 */
function getCustomDisplayTitle(input: Record<string, unknown>): string {
	if ('description' in input && typeof input['description'] === 'string' && input['description']) {
		return input['description'];
	}
	return 'Executing workflow script';
}

/**
 * Build the result message including validation status and console output
 */
function buildResultMessage(
	description: string | undefined,
	operationCount: number,
	validationResult: { isValid: boolean; issues?: string[] } | undefined,
	consoleOutput: string[],
): string {
	let message = description
		? `${description}: Completed ${operationCount} operation(s)`
		: `Script completed with ${operationCount} operation(s)`;

	// Add validation results to message
	if (validationResult) {
		if (validationResult.isValid) {
			message += '\n\nWorkflow structure: ✓ Valid';
		} else {
			const issues = validationResult.issues?.map((i) => `- ${i}`).join('\n') ?? 'Unknown issues';
			message += `\n\nWorkflow structure: ✗ Invalid\nIssues:\n${issues}`;
		}
	}

	// Include console output if any
	if (consoleOutput.length > 0) {
		message += `\n\nConsole output:\n${consoleOutput.join('\n')}`;
	}

	return message;
}

/**
 * Factory function to create the execute script tool
 */
export function createExecuteScriptTool(
	nodeTypes: INodeTypeDescription[],
	logger?: Logger,
): BuilderTool {
	const builderToolBase = EXECUTE_SCRIPT_TOOL;

	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				builderToolBase.toolName,
				builderToolBase.displayTitle,
				getCustomDisplayTitle(input),
			);

			try {
				// Validate input using Zod schema
				const validatedInput = executeScriptSchema.parse(input);
				const { script, description, validateStructure: shouldValidate } = validatedInput;

				// Report tool start
				reporter.start({ description: description ?? 'Executing script' });

				// Validate script syntax before execution
				const syntaxValidation = validateScriptSyntax(script);
				if (!syntaxValidation.valid) {
					const error = new ScriptValidationError(syntaxValidation.error ?? 'Syntax error');
					reporter.error({
						message: error.message,
						code: 'SCRIPT_SYNTAX_ERROR',
					});
					return createErrorResponse(config, {
						message: error.message,
						code: 'SCRIPT_SYNTAX_ERROR',
					});
				}

				reportProgress(reporter, 'Script syntax valid, executing...');

				// Get current workflow state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Create state provider for script execution
				const stateProvider = new ScriptStateProvider(workflow);
				const operationsCollector = stateProvider.getOperationsCollector();
				const workflowSnapshot = stateProvider.getWorkflowSnapshot();

				// Create tool wrappers
				const tools = createToolWrappers({
					nodeTypes,
					workflow,
					operationsCollector,
					logger,
				});

				// Execute script in sandbox
				const result = await executeScript(
					script,
					{
						workflow: workflowSnapshot,
						tools,
						logger,
						timeout: 30000, // 30 second timeout
					},
					() => operationsCollector.getOperations(),
				);

				// Handle execution result
				if (!result.success) {
					const errorMessage =
						result.error instanceof ScriptExecutionError
							? result.error.formatForAgent()
							: (result.error?.message ?? 'Script execution failed');

					// If we have partial operations, we still want to return them
					if (result.operations.length > 0) {
						reportProgress(
							reporter,
							`Script failed with ${result.operations.length} partial operation(s)`,
						);

						const partialMessage = `Script execution failed but ${result.operations.length} operation(s) completed:\n${errorMessage}`;

						reporter.error({
							message: partialMessage,
							code: 'SCRIPT_PARTIAL_EXECUTION',
							details: {
								operationsCompleted: result.operations.length,
								consoleOutput: result.consoleOutput,
							},
						});

						// Return partial results so workflow isn't completely broken
						return createSuccessResponse(config, partialMessage, {
							workflowOperations: result.operations,
						});
					}

					reporter.error({
						message: errorMessage,
						code: 'SCRIPT_EXECUTION_ERROR',
						details: { consoleOutput: result.consoleOutput },
					});

					return createErrorResponse(config, {
						message: errorMessage,
						code: 'SCRIPT_EXECUTION_ERROR',
						details: { consoleOutput: result.consoleOutput },
					});
				}

				// Success - return all collected operations
				const operationCount = result.operations.length;

				// Run automatic validation if enabled
				let validationResult: { isValid: boolean; issues?: string[] } | undefined;
				if (shouldValidate) {
					reportProgress(reporter, 'Validating workflow structure...');
					validationResult = await tools.validateStructure();
				}

				// Build result message
				const fullMessage = buildResultMessage(
					description,
					operationCount,
					validationResult,
					result.consoleOutput,
				);

				reporter.complete({
					message: fullMessage,
					operationsCount: operationCount,
					operations: result.operations.map((op) => op.type),
					validation: validationResult,
				});

				logger?.debug(`Script executed successfully with ${operationCount} operations`);

				return createSuccessResponse(config, fullMessage, {
					workflowOperations: result.operations,
				});
			} catch (error) {
				// Handle validation or unexpected errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid script parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error executing script',
					{
						toolName: builderToolBase.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: builderToolBase.toolName,
			description: `Execute a TypeScript script to perform multiple workflow operations at once.

Use this tool when you need to:
- Create multiple nodes and connections in a single operation
- Perform complex workflow modifications with conditional logic
- Reduce the number of individual tool calls for efficiency

AVAILABLE IN SCRIPT:
- \`tools.addNode(input)\` - Add a node (returns object with success, nodeId, nodeName)
- \`tools.connectNodes(input)\` - Connect nodes (pass AddNodeResult objects directly as sourceNodeId/targetNodeId)
- \`tools.removeNode(input)\` - Remove a node (returns object with success)
- \`tools.removeConnection(input)\` - Remove a connection (returns object with success)
- \`tools.renameNode(input)\` - Rename a node (returns object with success, oldName, newName)
- \`workflow\` - Read-only workflow state with nodes, connections, and helper methods
- \`console.log/warn/error\` - Logging (output included in response)

AUTOMATIC VALIDATION:
- Workflow structure is automatically validated after script execution (unless validateStructure=false)
- No need to call validateStructure() in your script

SCRIPT EXECUTION:
- Scripts run in an isolated sandbox with no filesystem or network access
- All tool calls are async - use await (NEVER use .then() chains)
- Errors include line numbers and partial results
- 30 second timeout
- CRITICAL: Do NOT wrap code in (async () => {})() or any IIFE - write code directly

EXAMPLE - Create a simple AI workflow:
\`\`\`javascript
// Add nodes
const trigger = await tools.addNode({
  nodeType: 'n8n-nodes-base.manualTrigger',
  nodeVersion: 1,
  name: 'Manual Trigger',
  initialParametersReasoning: 'Manual trigger has no parameters',
  initialParameters: {}
});

const agent = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.agent',
  nodeVersion: 1.7,
  name: 'AI Agent',
  initialParametersReasoning: 'Agent without output parser',
  initialParameters: { hasOutputParser: false }
});

const chatModel = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  nodeVersion: 1,
  name: 'OpenAI Chat Model',
  initialParametersReasoning: 'Chat model has no special initial params',
  initialParameters: {}
});

// Connect nodes - pass result objects directly!
await tools.connectNodes({
  sourceNodeId: trigger,
  targetNodeId: agent
});

await tools.connectNodes({
  sourceNodeId: chatModel,
  targetNodeId: agent
});

// Validation happens automatically after script completes
console.log('Workflow created successfully');
\`\`\``,
			schema: executeScriptSchema,
		},
	);

	return {
		tool: dynamicTool,
		...builderToolBase,
		getCustomDisplayTitle,
	};
}
