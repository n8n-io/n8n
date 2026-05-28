import { tool } from '@langchain/core/tools';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';
import { validateConnections, validateTrigger } from '@/validation/checks';

import { ToolExecutionError, ValidationError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createErrorResponse, createSuccessResponse } from './helpers/response';
import { getEffectiveWorkflow } from './helpers/state';

const validateStructureSchema = z.object({}).strict().default({});

export const VALIDATE_STRUCTURE_TOOL: BuilderToolBase = {
	toolName: 'validate_structure',
	displayTitle: 'Validating structure',
};

/**
 * Validation tool for Builder subgraph.
 * Checks workflow structure: connections and trigger presence.
 */
export function createValidateStructureTool(parsedNodeTypes: INodeTypeDescription[]): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				VALIDATE_STRUCTURE_TOOL.toolName,
				VALIDATE_STRUCTURE_TOOL.displayTitle,
			);

			try {
				const validatedInput = validateStructureSchema.parse(input ?? {});
				reporter.start(validatedInput);

				// Get effective workflow (includes pending operations from this turn)
				const workflow = getEffectiveWorkflow();
				reportProgress(reporter, 'Validating structure');

				const connectionViolations = validateConnections(workflow, parsedNodeTypes);
				const triggerViolations = validateTrigger(workflow, parsedNodeTypes);
				const allViolations = [...connectionViolations, ...triggerViolations];

				let message: string;
				if (allViolations.length === 0) {
					message =
						'Workflow structure is valid. All connections are correct and trigger node is present.';
				} else {
					message = `Found ${allViolations.length} structure issues:\n${allViolations.map((v) => `- ${v.description}`).join('\n')}`;
				}

				reporter.complete({ message });

				const stateUpdates: Record<string, unknown> = {
					structureValidation: { connections: connectionViolations, trigger: triggerViolations },
				};

				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Failed to validate structure',
					{
						toolName: VALIDATE_STRUCTURE_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: VALIDATE_STRUCTURE_TOOL.toolName,
			description:
				'Validate workflow structure (connections, trigger). Call after creating nodes/connections to check for issues.',
			schema: validateStructureSchema,
		},
	);

	return {
		tool: dynamicTool,
		...VALIDATE_STRUCTURE_TOOL,
	};
}
