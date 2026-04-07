/**
 * Validate Tool Handler
 *
 * Handles the validate_workflow tool execution. Extracts the validation logic
 * from the code-builder-agent's executeValidateTool method.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { StreamOutput, ToolProgressChunk, WorkflowUpdateChunk } from '../../types/streaming';
import { FIX_VALIDATION_ERRORS_INSTRUCTION } from '../constants';
import type { WarningTracker } from '../state/warning-tracker';
import type { ParseAndValidateResult } from '../types';
import { formatWarnings } from '../utils/format-warnings';

/**
 * Parse and validate function type
 */
type ParseAndValidateFn = (
	code: string,
	currentWorkflow?: WorkflowJSON,
) => Promise<ParseAndValidateResult>;

/**
 * Get error context function type
 */
type GetErrorContextFn = (code: string, errorMessage: string) => string;

/**
 * Configuration for ValidateToolHandler
 */
export interface ValidateToolHandlerConfig {
	parseAndValidate: ParseAndValidateFn;
	getErrorContext: GetErrorContextFn;
}

/**
 * Parameters for executing the validate tool
 */
export interface ValidateToolParams {
	toolCallId: string;
	code: string | null;
	currentWorkflow: WorkflowJSON | undefined;
	iteration: number;
	messages: BaseMessage[];
	warningTracker: WarningTracker;
}

/**
 * Result of validate tool execution
 */
export interface ValidateToolResult {
	workflowReady: boolean;
	workflow?: WorkflowJSON;
	parseDuration?: number;
}

/**
 * Handles the validate_workflow tool execution.
 *
 * This handler:
 * 1. Validates workflow code using parseAndValidate
 * 2. Tracks warnings and filters duplicates
 * 3. Yields progress and workflow update chunks
 * 4. Returns whether the workflow is ready
 */
export class ValidateToolHandler {
	private parseAndValidate: ParseAndValidateFn;
	private getErrorContext: GetErrorContextFn;

	constructor(config: ValidateToolHandlerConfig) {
		this.parseAndValidate = config.parseAndValidate;
		this.getErrorContext = config.getErrorContext;
	}

	/**
	 * Execute the validate_workflow tool.
	 *
	 * @param params - Execution parameters
	 * @yields StreamOutput chunks for tool progress and workflow updates
	 * @returns ValidateToolResult with workflowReady status and optional workflow
	 */
	async *execute(
		params: ValidateToolParams,
	): AsyncGenerator<StreamOutput, ValidateToolResult, unknown> {
		const { toolCallId, code, currentWorkflow, messages, warningTracker } = params;

		// Stream tool progress - running
		yield this.createToolProgressChunk('running', toolCallId);

		// Check if code exists
		if (!code) {
			messages.push(
				new ToolMessage({
					tool_call_id: toolCallId,
					content:
						'No workflow code exists. You MUST create the workflow code using str_replace_based_edit_tool with command "create" before validating. Do NOT call validate_workflow again until you have written code. If empty workflow is expected, stop calling tools to finish.',
				}),
			);
			yield this.createToolProgressChunk('completed', toolCallId);
			return { workflowReady: false };
		}

		const parseStartTime = Date.now();
		try {
			const result = await this.parseAndValidate(code, currentWorkflow);
			const parseDuration = Date.now() - parseStartTime;

			// Handle warnings
			if (result.warnings.length > 0) {
				const newWarnings = warningTracker.filterNewWarnings(result.warnings);

				if (newWarnings.length > 0) {
					// Track new warnings
					warningTracker.markAsSeen(newWarnings);

					const warningText = formatWarnings(newWarnings, warningTracker);
					const errorContext = this.getErrorContext(code, newWarnings[0].message);

					messages.push(
						new ToolMessage({
							tool_call_id: toolCallId,
							content: `Validation warnings:\n${warningText}\n\n${errorContext}\n\n${FIX_VALIDATION_ERRORS_INSTRUCTION}`,
						}),
					);

					// Stream partial workflow for progressive rendering
					yield this.createWorkflowUpdateChunk(result.workflow);
					yield this.createToolProgressChunk('completed', toolCallId);

					return {
						workflowReady: false,
						workflow: result.workflow,
						parseDuration,
					};
				}
			}

			// Validation passed
			messages.push(
				new ToolMessage({
					tool_call_id: toolCallId,
					content:
						'Validation passed. Workflow code is valid.\n\nIMPORTANT: Stop calling tools now to finalize the workflow.',
				}),
			);

			// Stream workflow update
			yield this.createWorkflowUpdateChunk(result.workflow);
			yield this.createToolProgressChunk('completed', toolCallId);

			return {
				workflowReady: true,
				workflow: result.workflow,
				parseDuration,
			};
		} catch (error) {
			const parseDuration = Date.now() - parseStartTime;
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorContext = this.getErrorContext(code, errorMessage);

			messages.push(
				new ToolMessage({
					tool_call_id: toolCallId,
					content: `Parse error: ${errorMessage}\n\n${errorContext}\n\n${FIX_VALIDATION_ERRORS_INSTRUCTION}`,
				}),
			);

			yield this.createToolProgressChunk('completed', toolCallId);

			return {
				workflowReady: false,
				parseDuration,
			};
		}
	}

	/**
	 * Create a tool progress chunk
	 */
	private createToolProgressChunk(
		status: 'running' | 'completed',
		toolCallId: string,
	): StreamOutput {
		return {
			messages: [
				{
					type: 'tool',
					toolName: 'validate_workflow',
					toolCallId,
					displayTitle: 'Validating workflow',
					status,
				} as ToolProgressChunk,
			],
		};
	}

	/**
	 * Create a workflow update chunk
	 */
	private createWorkflowUpdateChunk(workflow: WorkflowJSON): StreamOutput {
		return {
			messages: [
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: JSON.stringify(workflow, null, 2),
				} as WorkflowUpdateChunk,
			],
		};
	}
}
