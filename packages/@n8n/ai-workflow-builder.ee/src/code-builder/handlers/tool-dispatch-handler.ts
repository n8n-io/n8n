/**
 * Tool Dispatch Handler
 *
 * Handles the routing of tool calls to appropriate handlers during the chat loop.
 * Extracts tool call processing logic to reduce cyclomatic complexity in chat().
 */

import type { BaseMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { TextEditorHandler } from './text-editor-handler';
import type { TextEditorToolHandler } from './text-editor-tool-handler';
import type { StrReplacement } from './text-editor.types';
import type { ValidateToolHandler } from './validate-tool-handler';
import type { StreamOutput, ToolProgressChunk } from '../../types/streaming';
import type { WarningTracker } from '../state/warning-tracker';

/**
 * Parse and validate the `replacements` argument from LLM tool calls.
 * Handles the case where the LLM sends a JSON string instead of an array.
 */
export function parseReplacements(raw: unknown): StrReplacement[] {
	let parsed: unknown = raw;

	if (typeof parsed === 'string') {
		try {
			parsed = JSON.parse(parsed);
		} catch {
			throw new Error(
				'replacements must be a JSON array of {old_str, new_str} objects, but received an invalid JSON string.',
			);
		}
	}

	if (!Array.isArray(parsed)) {
		throw new Error(
			'replacements must be an array of {old_str, new_str} objects. Example: {"replacements": [{"old_str": "foo", "new_str": "bar"}]}',
		);
	}

	for (let i = 0; i < parsed.length; i++) {
		const item = parsed[i] as Record<string, unknown>;
		if (typeof item?.old_str !== 'string') {
			throw new Error(
				`replacements[${i}] is missing a valid "old_str" string. Each replacement must have {old_str: string, new_str: string}.`,
			);
		}
		if (typeof item?.new_str !== 'string') {
			throw new Error(
				`replacements[${i}] is missing a valid "new_str" string. Each replacement must have {old_str: string, new_str: string}.`,
			);
		}
	}

	return parsed as StrReplacement[];
}

/**
 * Tool call structure from LLM response
 */
export interface ToolCall {
	name: string;
	args: Record<string, unknown>;
	id?: string;
}

/**
 * Configuration for ToolDispatchHandler
 */
export interface ToolDispatchHandlerConfig {
	toolsMap: Map<string, StructuredToolInterface>;
	toolDisplayTitles?: Map<string, string>;
	validateToolHandler: ValidateToolHandler;
}

/**
 * Parameters for dispatching tool calls
 */
export interface ToolDispatchParams {
	toolCalls: ToolCall[];
	messages: BaseMessage[];
	currentWorkflow?: WorkflowJSON;
	iteration: number;
	textEditorHandler?: TextEditorHandler;
	textEditorToolHandler?: TextEditorToolHandler;
	warningTracker: WarningTracker;
}

/**
 * Result of tool dispatch
 */
export interface ToolDispatchResult {
	workflow?: WorkflowJSON;
	workflowReady: boolean;
	sourceCode?: string;
	parseDuration?: number;
	validatePassedThisIteration: boolean;
	/** undefined = no edits or validations this iteration */
	hasUnvalidatedEdits?: boolean;
}

/**
 * Handles the routing of tool calls to appropriate handlers.
 *
 * This handler:
 * 1. Routes tool calls to appropriate handlers (text editor, validate, or general)
 * 2. Tracks workflow state updates from tool results
 * 3. Yields progress chunks for each tool call
 * 4. Returns aggregated result with workflow state
 */
export class ToolDispatchHandler {
	private toolsMap: Map<string, StructuredToolInterface>;
	private toolDisplayTitles?: Map<string, string>;
	private validateToolHandler: ValidateToolHandler;

	constructor(config: ToolDispatchHandlerConfig) {
		this.toolsMap = config.toolsMap;
		this.toolDisplayTitles = config.toolDisplayTitles;
		this.validateToolHandler = config.validateToolHandler;
	}

	/**
	 * Dispatch tool calls to appropriate handlers.
	 *
	 * @param params - Dispatch parameters
	 * @yields StreamOutput chunks for tool progress
	 * @returns ToolDispatchResult with workflow state
	 */
	async *dispatch(
		params: ToolDispatchParams,
	): AsyncGenerator<StreamOutput, ToolDispatchResult, unknown> {
		const {
			toolCalls,
			messages,
			currentWorkflow,
			iteration,
			textEditorHandler,
			textEditorToolHandler,
			warningTracker,
		} = params;

		let workflow: WorkflowJSON | undefined;
		let workflowReady = false;
		let sourceCode: string | undefined;
		let parseDuration: number | undefined;
		let validatePassedThisIteration = false;
		let hasUnvalidatedEdits: boolean | undefined;

		for (const toolCall of toolCalls) {
			// Skip tool calls without an ID (shouldn't happen but handle gracefully)
			if (!toolCall.id) {
				continue;
			}

			const result = yield* this.executeToolCall({
				toolCall,
				messages,
				currentWorkflow,
				iteration,
				textEditorHandler,
				textEditorToolHandler,
				warningTracker,
			});

			// Track hasUnvalidatedEdits based on tool call type
			if (toolCall.name === 'str_replace_based_edit_tool') {
				const command = toolCall.args.command as string;
				if (command === 'create') {
					hasUnvalidatedEdits = false; // create auto-validates
				} else if (command !== 'view') {
					hasUnvalidatedEdits = true; // str_replace, insert modify code
				}
			}
			if (toolCall.name === 'batch_str_replace') {
				hasUnvalidatedEdits = true;
			}
			if (toolCall.name === 'validate_workflow') {
				hasUnvalidatedEdits = false;
			}

			// Update state from result
			if (result.workflow) {
				workflow = result.workflow;
			}
			if (result.parseDuration !== undefined) {
				parseDuration = result.parseDuration;
			}
			if (result.workflowReady) {
				workflowReady = true;
				break;
			}
			if (result.validatePassed) {
				validatePassedThisIteration = true;
			}
		}

		return {
			workflow,
			workflowReady,
			sourceCode,
			parseDuration,
			validatePassedThisIteration,
			hasUnvalidatedEdits,
		};
	}

	/**
	 * Execute a single tool call
	 */
	private async *executeToolCall(params: {
		toolCall: ToolCall;
		messages: BaseMessage[];
		currentWorkflow?: WorkflowJSON;
		iteration: number;
		textEditorHandler?: TextEditorHandler;
		textEditorToolHandler?: TextEditorToolHandler;
		warningTracker: WarningTracker;
	}): AsyncGenerator<
		StreamOutput,
		{
			workflow?: WorkflowJSON;
			workflowReady?: boolean;
			parseDuration?: number;
			validatePassed?: boolean;
		},
		unknown
	> {
		const {
			toolCall,
			messages,
			currentWorkflow,
			iteration,
			textEditorHandler,
			textEditorToolHandler,
			warningTracker,
		} = params;

		// Handle text editor tool calls
		if (toolCall.name === 'str_replace_based_edit_tool' && textEditorToolHandler) {
			const result = yield* textEditorToolHandler.execute({
				toolCallId: toolCall.id!,
				args: toolCall.args,
				currentWorkflow,
				iteration,
				messages,
				warningTracker,
			});

			if (result) {
				return {
					workflow: result.workflow,
					workflowReady: result.workflowReady,
				};
			}
			return {};
		}

		// Handle batch str_replace tool calls
		if (toolCall.name === 'batch_str_replace' && textEditorHandler) {
			yield* this.executeBatchStrReplace({
				toolCall,
				textEditorHandler,
				messages,
				textEditorToolHandler,
				currentWorkflow,
			});
			return {};
		}

		// Handle validate tool calls
		if (toolCall.name === 'validate_workflow' && textEditorToolHandler && textEditorHandler) {
			const result = yield* this.validateToolHandler.execute({
				toolCallId: toolCall.id!,
				code: textEditorHandler.getWorkflowCode(),
				currentWorkflow,
				iteration,
				messages,
				warningTracker,
			});

			return {
				workflow: result.workflow,
				workflowReady: result.workflowReady,
				parseDuration: result.parseDuration,
				validatePassed: result.workflowReady,
			};
		}

		// Execute other tools
		yield* this.executeGeneralToolCall(toolCall, messages);
		return {};
	}

	/**
	 * Execute a general tool call (not text editor or validate)
	 */
	private async *executeGeneralToolCall(
		toolCall: ToolCall,
		messages: BaseMessage[],
	): AsyncGenerator<StreamOutput, void, unknown> {
		const displayTitle = this.toolDisplayTitles?.get(toolCall.name);

		// Stream tool progress
		yield {
			messages: [
				{
					type: 'tool',
					toolName: toolCall.name,
					toolCallId: toolCall.id,
					displayTitle,
					status: 'running',
					args: toolCall.args,
				} as ToolProgressChunk,
			],
		};

		const tool = this.toolsMap.get(toolCall.name);
		if (!tool) {
			const errorMessage = `Tool '${toolCall.name}' not found`;
			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id!,
					content: errorMessage,
				}),
			);

			// Yield error status to update UI (was missing - tool left in 'running' state)
			yield {
				messages: [
					{
						type: 'tool',
						toolName: toolCall.name,
						toolCallId: toolCall.id,
						displayTitle,
						status: 'error',
						error: errorMessage,
					} as ToolProgressChunk,
				],
			};
			return;
		}

		try {
			const result: unknown = await tool.invoke(toolCall.args);
			const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

			// Add tool result to messages
			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id!,
					content: resultStr,
				}),
			);

			// Stream tool completion
			yield {
				messages: [
					{
						type: 'tool',
						toolName: toolCall.name,
						toolCallId: toolCall.id,
						displayTitle,
						status: 'completed',
					} as ToolProgressChunk,
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id!,
					content: `Error: ${errorMessage}`,
				}),
			);

			yield {
				messages: [
					{
						type: 'tool',
						toolName: toolCall.name,
						toolCallId: toolCall.id,
						displayTitle,
						status: 'error',
						error: errorMessage,
					} as ToolProgressChunk,
				],
			};
		}
	}

	/**
	 * Execute a batch_str_replace tool call
	 */
	private async *executeBatchStrReplace(params: {
		toolCall: ToolCall;
		textEditorHandler: TextEditorHandler;
		messages: BaseMessage[];
		textEditorToolHandler?: TextEditorToolHandler;
		currentWorkflow?: WorkflowJSON;
	}): AsyncGenerator<StreamOutput, void, unknown> {
		const { toolCall, textEditorHandler, messages, textEditorToolHandler, currentWorkflow } =
			params;
		const displayTitle = 'Editing workflow';

		yield {
			messages: [
				{
					type: 'tool',
					toolName: toolCall.name,
					toolCallId: toolCall.id,
					displayTitle,
					status: 'running',
					args: toolCall.args,
				} as ToolProgressChunk,
			],
		};

		try {
			const replacements = parseReplacements(toolCall.args.replacements);
			const result = textEditorHandler.executeBatch(replacements);
			const content = typeof result === 'string' ? result : JSON.stringify(result);

			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id!,
					content,
				}),
			);

			// Preview parse after successful batch edit for progressive canvas rendering
			if (typeof result === 'string' && textEditorToolHandler) {
				const preview = await textEditorToolHandler.tryParseForPreview(currentWorkflow);
				if (preview.chunk) {
					yield preview.chunk;
				}
				if (preview.parseError) {
					const lastMsg = messages[messages.length - 1] as ToolMessage;
					lastMsg.content = `${lastMsg.content as string}\n\nParse error: ${preview.parseError}`;
				}
			}

			yield {
				messages: [
					{
						type: 'tool',
						toolName: toolCall.name,
						toolCallId: toolCall.id,
						displayTitle,
						status: 'completed',
					} as ToolProgressChunk,
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id!,
					content: `Error: ${errorMessage}`,
				}),
			);

			yield {
				messages: [
					{
						type: 'tool',
						toolName: toolCall.name,
						toolCallId: toolCall.id,
						displayTitle,
						status: 'error',
						error: errorMessage,
					} as ToolProgressChunk,
				],
			};
		}
	}
}
