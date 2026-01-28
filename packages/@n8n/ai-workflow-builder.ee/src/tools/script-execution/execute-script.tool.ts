/**
 * Execute Script Tool
 *
 * Allows the builder agent to execute TypeScript scripts that orchestrate
 * multiple tool calls at once. This reduces latency by avoiding multiple
 * LLM inference cycles and keeps intermediate results in script context.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
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
import { createToolWrappers, type WorkflowContext } from './tool-wrappers';

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
 * Configuration for execute script tool
 */
export interface ExecuteScriptToolConfig {
	/** LLM for parameter updates (enables updateNodeParameters in scripts) */
	parameterUpdaterLLM?: BaseChatModel;
	/** n8n instance URL for resource locators */
	instanceUrl?: string;
	/** Workflow context for parameter updates */
	workflowContext?: WorkflowContext;
}

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
 * Run combined structure and configuration validation
 */
function runCombinedValidation(tools: Awaited<ReturnType<typeof createToolWrappers>>): {
	isValid: boolean;
	issues?: string[];
} {
	const structureResult = tools.validateStructure();
	const configResult = tools.validateConfiguration();

	const allIssues = [...(structureResult.issues ?? []), ...(configResult.issues ?? [])];

	return {
		isValid: structureResult.isValid && configResult.isValid,
		issues: allIssues.length > 0 ? allIssues : undefined,
	};
}

/**
 * Factory function to create the execute script tool
 */
export function createExecuteScriptTool(
	nodeTypes: INodeTypeDescription[],
	logger?: Logger,
	toolConfig?: ExecuteScriptToolConfig,
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
					parameterUpdaterLLM: toolConfig?.parameterUpdaterLLM,
					instanceUrl: toolConfig?.instanceUrl,
					workflowContext: toolConfig?.workflowContext,
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
					reportProgress(reporter, 'Validating workflow...');
					validationResult = runCombinedValidation(tools);
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

SHORT-FORM SYNTAX:
- Node: {t:'nodeType',n:'Name',p:{params}} - only t is required
- Connection: {s:source,d:dest,so:outputIndex,di:inputIndex}

AVAILABLE IN SCRIPT:
- tools.add({nodes:[...]}) - Add nodes
- tools.conn({connections:[...]}) - Connect nodes
- tools.updateAll({updates:[...]}) - REQUIRED: Configure all nodes (describe in natural language)
- tools.updateNodeParameters({nodeId,changes}) - Configure single node
- tools.set({nodeId,params}) - Only for simple params (AI Agent systemMessage)

EXAMPLE - Create nodes, connect them, then configure ALL with updateAll:
\`\`\`javascript
const r = await tools.add({nodes:[
  {t:'n8n-nodes-base.webhook',n:'Webhook',p:{httpMethod:'POST',path:'data'}},
  {t:'n8n-nodes-base.set',n:'Process'},
  {t:'n8n-nodes-base.slack',n:'Notify'}
]});
const [wh,proc,slack] = r.results;
await tools.conn({connections:[{s:wh,d:proc},{s:proc,d:slack}]});
// CRITICAL: Configure ALL nodes - describe what each should do
await tools.updateAll({updates:[
  {nodeId:proc.nodeId,changes:["Add field 'status' with value 'received'","Add field 'timestamp' with {{$now}}"]},
  {nodeId:slack.nodeId,changes:["Set message showing status and timestamp","Configure to send to notifications channel"]}
]});
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
