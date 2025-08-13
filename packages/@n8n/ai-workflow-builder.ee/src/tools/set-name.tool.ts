import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '@/errors';
import { setWorkflowName } from '@/tools/helpers';

import { createSuccessResponse, createErrorResponse } from './helpers/response';

/**
 * Schema for the set name tool
 */
const setNameSchema = z.object({
	name: z
		.string()
		.min(10)
		.max(150)
		.describe('Name of the workflow based on the prompt and context'),
});

/**
 * Factory function to create the set name tool
 * (Used to auto-generate workflow name)
 */
export function createSetNameTool(_logger?: Logger) {
	return tool(
		(input, config) => {
			try {
				// Validate input using Zod schema
				const validatedInput = setNameSchema.parse(input);
				const { name } = validatedInput;

				return createSuccessResponse(
					config,
					'Successfully set the workflow name.',
					setWorkflowName(name),
				);
			} catch (error) {
				// Handle validation or unexpected errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});

					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: 'remove_node',
						cause: error instanceof Error ? error : undefined,
					},
				);

				return createErrorResponse(config, toolError);
			}
		},
		{
			name: 'set_name',
			description:
				'Set name of the workflow. Use this tool before you start building the workflow to give it a meaningful name based on the prompt and context.',
			schema: setNameSchema,
		},
	);
}
