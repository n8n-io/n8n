import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import { promptCategorizationChain } from '@/chains/prompt-categorization';
import { ValidationError, ToolExecutionError } from '@/errors';
import { createProgressReporter } from '@/tools/helpers/progress';
import { createSuccessResponse, createErrorResponse } from '@/tools/helpers/response';
import type { PromptTaxonomy } from '@/types/taxonomy';
import type { CategorizePromptOutput } from '@/types/tools';
import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

/**
 * Schema for categorizing prompts
 */
const categorizePromptSchema = z.object({
	prompt: z.string().min(1).describe('The user prompt to categorize'),
});

/**
 * Build a human-readable message from categorization results
 */
function buildCategorizationMessage(taxonomy: PromptTaxonomy): string {
	const parts: string[] = [];

	parts.push('Prompt categorized successfully:');

	if (taxonomy.useCase) {
		parts.push(`- Use case: ${taxonomy.useCase}`);
	}

	if (taxonomy.techniques.length > 0) {
		parts.push(`- Techniques: ${taxonomy.techniques.join(', ')}`);
	}

	if (taxonomy.confidence !== undefined) {
		parts.push(`- Confidence: ${(taxonomy.confidence * 100).toFixed(0)}%`);
	}

	return parts.join('\n');
}

export const CATEGORIZE_PROMPT_TOOL: BuilderToolBase = {
	toolName: 'categorize_prompt',
	displayTitle: 'Categorizing prompt',
};

/**
 * Factory function to create the categorize prompt tool
 */
export function createCategorizePromptTool(llm: BaseChatModel, logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				CATEGORIZE_PROMPT_TOOL.toolName,
				CATEGORIZE_PROMPT_TOOL.displayTitle,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = categorizePromptSchema.parse(input);
				const { prompt } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Report progress
				logger?.debug('Categorizing user prompt using LLM...');
				reporter.progress('Analyzing prompt to identify use case and techniques...');

				// Use the categorization chain to analyze the prompt
				const taxonomy = await promptCategorizationChain(llm, prompt);

				logger?.debug('Prompt categorized', {
					useCase: taxonomy.useCase,
					techniques: taxonomy.techniques,
					confidence: taxonomy.confidence,
				});

				// Build response message
				const message = buildCategorizationMessage(taxonomy);

				// Report completion with taxonomy data
				const output: CategorizePromptOutput = {
					taxonomy,
					message,
				};
				reporter.complete(output);

				// Return the categorization as tool output
				// This will be available to the agent in the tool response
				return createSuccessResponse(config, message, {
					promptTaxonomy: taxonomy,
				});
			} catch (error) {
				// Handle validation or unexpected errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: CATEGORIZE_PROMPT_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: CATEGORIZE_PROMPT_TOOL.toolName,
			description: `Categorize a user's workflow request to identify the use case and required techniques.

This helps understand what type of workflow the user wants to build and which automation patterns will be needed.

Use this tool when you receive an initial workflow request to:
- Identify the primary use case (e.g., lead enrichment, customer support)
- Detect required techniques (e.g., scraping, data transformation, notifications)
- Better understand the user's needs and context

The categorization helps you provide more relevant guidance and select appropriate nodes.`,
			schema: categorizePromptSchema,
		},
	);

	return {
		tool: dynamicTool,
		...CATEGORIZE_PROMPT_TOOL,
	};
}
