import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';
import { programmaticValidation } from '@/validation/programmatic';
import type { ProgrammaticViolation } from '@/validation/types';

import { ToolExecutionError, ValidationError } from '../errors';
import { formatWorkflowValidation } from '../utils/workflow-validation';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createErrorResponse, createSuccessResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';

const validateWorkflowSchema = z.object({}).strict().default({});

export const VALIDATE_WORKFLOW_TOOL: BuilderToolBase = {
	toolName: 'validate_workflow',
	displayTitle: 'Validating workflow',
};

export function createValidateWorkflowTool(
	parsedNodeTypes: INodeTypeDescription[],
	logger?: Logger,
): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				VALIDATE_WORKFLOW_TOOL.toolName,
				VALIDATE_WORKFLOW_TOOL.displayTitle,
			);

			try {
				const validatedInput = validateWorkflowSchema.parse(input ?? {});
				reporter.start(validatedInput);

				const state = getWorkflowState();
				reportProgress(reporter, 'Running programmatic checks');

				const violations = programmaticValidation(
					{
						generatedWorkflow: state.workflowJSON,
					},
					parsedNodeTypes,
				);

				const blockingViolations: ProgrammaticViolation[] = [
					...violations.connections,
					...violations.trigger,
					...violations.agentPrompt,
					...violations.tools,
					...violations.fromAi,
				].filter((violation) => violation.type === 'critical' || violation.type === 'major');

				if (blockingViolations.length > 0) {
					const summary = formatWorkflowValidation(violations);
					const validationError = new ValidationError(
						`Workflow validation failed due to critical or major violations.\n${summary}`,
						{ extra: { violations: blockingViolations } },
					);

					reporter.error(validationError);
					logger?.warn('validate_workflow tool detected blocking violations', {
						violations: blockingViolations,
					});

					return createErrorResponse(config, validationError);
				}

				const message = formatWorkflowValidation(violations);

				reporter.complete({ message });

				return createSuccessResponse(config, message, {
					workflowValidation: violations,
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
					error instanceof Error ? error.message : 'Failed to validate workflow',
					{
						toolName: VALIDATE_WORKFLOW_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);

				logger?.warn('validate_workflow tool failed', { error: toolError });

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: VALIDATE_WORKFLOW_TOOL.toolName,
			description:
				'Run validation checks against the current workflow. Call this after making changes to ensure the workflow is valid.',
			schema: validateWorkflowSchema,
		},
	);

	return {
		tool: dynamicTool,
		...VALIDATE_WORKFLOW_TOOL,
	};
}
