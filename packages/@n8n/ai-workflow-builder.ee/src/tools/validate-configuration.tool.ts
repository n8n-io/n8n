import { tool } from '@langchain/core/tools';
import { workflow as workflowSdk } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
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
import { getEffectiveWorkflow } from './helpers/state';

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

				// Get effective workflow (includes pending operations from this turn)
				const workflow = getEffectiveWorkflow();
				reportProgress(reporter, 'Validating configuration');

				const agentViolations = validateAgentPrompt(workflow);
				const toolViolations = validateTools(workflow, parsedNodeTypes);
				const fromAiViolations = validateFromAi(workflow, parsedNodeTypes);
				const parameterViolations = validateParameters(workflow, parsedNodeTypes);

				// Run workflow-sdk graph validators (includes filterNodeValidator
				// which catches fixedCollection key mistakes like rules.rules vs rules.values)
				const graphViolationMessages: string[] = [];
				if (workflow.nodes.length > 0) {
					try {
						const builder = workflowSdk.fromJSON(workflow as unknown as WorkflowJSON);
						const graphValidation = builder.validate({
							// Instance AI builds workflows incrementally — nodes are added before
							// connections, so disconnected nodes and missing triggers are expected
							allowDisconnectedNodes: true,
							allowNoTrigger: true,
						});
						for (const error of graphValidation.errors) {
							graphViolationMessages.push(error.message);
						}
						for (const warning of graphValidation.warnings) {
							graphViolationMessages.push(warning.message);
						}
					} catch {
						// If fromJSON fails (e.g. incomplete workflow), skip graph validation
					}
				}

				const allViolations = [
					...agentViolations,
					...toolViolations,
					...fromAiViolations,
					...parameterViolations,
				];

				// Combine programmatic violations with graph validation messages
				const allMessages = [...allViolations.map((v) => v.description), ...graphViolationMessages];

				let message: string;
				if (allMessages.length === 0) {
					message =
						'Configuration is valid. Agent prompts, tools, $fromAI usage, and required parameters are correct.';
				} else {
					message = `Found ${allMessages.length} configuration issues:\n${allMessages.map((m) => `- ${m}`).join('\n')}`;
				}

				reporter.complete({ message });

				return createSuccessResponse(config, message, {
					configurationValidation: {
						agentPrompt: agentViolations,
						tools: toolViolations,
						fromAi: fromAiViolations,
						parameters: parameterViolations,
						graphValidation: graphViolationMessages,
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
