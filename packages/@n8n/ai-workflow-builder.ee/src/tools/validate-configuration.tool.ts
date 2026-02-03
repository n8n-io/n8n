import { tool } from '@langchain/core/tools';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';
import {
	validateAgentPrompt,
	validateTools,
	validateFromAi,
	validateParameters,
} from '@/validation/checks';

import { ToolExecutionError, ValidationError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createErrorResponse, createSuccessResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';

const validateConfigurationSchema = z.object({}).strict().default({});

export const VALIDATE_CONFIGURATION_TOOL: BuilderToolBase = {
	toolName: 'validate_configuration',
	displayTitle: 'Validating configuration',
};

/**
 * Validation tool for Builder subgraph.
 * Checks node configuration: agent prompts, tool parameters, $fromAI usage,
 * required parameters, and valid option values.
 */
export function createValidateConfigurationTool(
	parsedNodeTypes: INodeTypeDescription[],
): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				VALIDATE_CONFIGURATION_TOOL.toolName,
				VALIDATE_CONFIGURATION_TOOL.displayTitle,
			);

			try {
				const validatedInput = validateConfigurationSchema.parse(input ?? {});
				reporter.start(validatedInput);

				const state = getWorkflowState();
				reportProgress(reporter, 'Validating configuration');

				const agentViolations = validateAgentPrompt(state.workflowJSON);
				const toolViolations = validateTools(state.workflowJSON, parsedNodeTypes);
				const fromAiViolations = validateFromAi(state.workflowJSON, parsedNodeTypes);
				const parameterViolations = validateParameters(state.workflowJSON, parsedNodeTypes);

				const allViolations = [
					...agentViolations,
					...toolViolations,
					...fromAiViolations,
					...parameterViolations,
				];

				let message: string;
				if (allViolations.length === 0) {
					message =
						'Configuration is valid. Agent prompts, tools, $fromAI usage, and required parameters are correct.';
				} else {
					message = `Found ${allViolations.length} configuration issues:\n${allViolations.map((v) => `- ${v.description}`).join('\n')}`;
				}

				reporter.complete({ message });

				return createSuccessResponse(config, message, {
					configurationValidation: {
						agentPrompt: agentViolations,
						tools: toolViolations,
						fromAi: fromAiViolations,
						parameters: parameterViolations,
					},
				});
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Failed to validate configuration',
					{
						toolName: VALIDATE_CONFIGURATION_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: VALIDATE_CONFIGURATION_TOOL.toolName,
			description:
				'Validate node configuration (agent prompts, tool parameters, $fromAI usage, required parameters, option values). Call after configuring nodes to check for issues.',
			schema: validateConfigurationSchema,
		},
	);

	return {
		tool: dynamicTool,
		...VALIDATE_CONFIGURATION_TOOL,
	};
}
