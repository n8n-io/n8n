import { ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { Command, type LangGraphRunnableConfig } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { ProgressReporter } from './progress-reporter';
import { ResponseBuilder } from './response-builder';
import type { ToolContext, ToolError, ToolResult } from './types';

/**
 * Base class for all workflow builder tools with strong TypeScript support
 * @template TInput - The Zod schema type for input validation
 * @template TOutput - The output type of the tool
 */
export abstract class BaseWorkflowBuilderTool<
	TInput extends z.ZodType,
	TOutput extends Record<string, any>,
> {
	protected abstract readonly schema: TInput;
	protected abstract readonly name: string;
	protected abstract readonly description: string;

	constructor(protected readonly nodeTypes: INodeTypeDescription[]) {}

	/**
	 * Main execution method that must be implemented by derived classes
	 * @param input - Validated input matching the schema
	 * @param context - Tool execution context with utilities
	 * @returns Promise of tool execution result
	 */
	protected abstract execute(
		input: z.infer<TInput>,
		context: ToolContext,
	): Promise<ToolResult<TOutput>>;

	/**
	 * Creates a LangChain tool from this class instance
	 * @returns LangChain tool ready for use in the agent
	 */
	createLangChainTool() {
		return tool(
			async (input: unknown, config: LangGraphRunnableConfig) => {
				// Create progress reporter for this execution
				const reporter = new ProgressReporter(config, this.name);

				try {
					// Validate input using Zod schema
					const validatedInput = this.schema.parse(input);

					// Report tool start
					reporter.start(validatedInput);

					// Create context for tool execution
					const context: ToolContext = {
						reporter,
						responseBuilder: new ResponseBuilder(config),
						nodeTypes: this.nodeTypes,
					};

					// Execute the tool logic
					const result = await this.execute(validatedInput, context);

					// Handle success or error result
					if (result.success) {
						reporter.complete(result.data);
						return context.responseBuilder
							.withMessage(result.message || this.formatSuccessMessage(result.data))
							.withState(result.stateUpdates)
							.build();
					} else {
						reporter.error(result.error);
						return context.responseBuilder.withError(result.error).build();
					}
				} catch (error) {
					// Handle validation or unexpected errors
					const toolError: ToolError = {
						message: error instanceof Error ? error.message : 'Unknown error occurred',
						code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'EXECUTION_ERROR',
						details: error instanceof z.ZodError ? error.errors : undefined,
					};

					reporter.error(toolError);
					return new Command({
						update: {
							messages: [
								new ToolMessage({
									content: `Error: ${toolError.message}`,
									// @ts-ignore - tool_call_id exists but not in types
									tool_call_id: config.toolCall?.id,
								}),
							],
						},
					});
				}
			},
			{
				name: this.name,
				description: this.description,
				schema: this.schema,
			},
		);
	}

	/**
	 * Override this method to provide custom success message formatting
	 * @param _output - The successful output data
	 * @returns Formatted success message
	 */
	protected formatSuccessMessage(_output: TOutput): string {
		return 'Operation completed successfully';
	}
}
