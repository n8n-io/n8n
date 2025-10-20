import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { ToolExecutionError, ValidationError } from '../errors';
import { programmaticEvaluation } from '../programmatic/programmatic';
import type { ProgrammaticEvaluationResult, ProgrammaticViolation } from '../programmatic/types';
import { formatWorkflowValidation } from '../utils/workflow-validation';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createErrorResponse, createSuccessResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';

const validateWorkflowSchema = z
	.object({
		includeDetails: z
			.boolean()
			.optional()
			.describe('Include detailed category breakdown in the response'),
	})
	.strict()
	.default({});

export const VALIDATE_WORKFLOW_TOOL: BuilderToolBase = {
	toolName: 'validate_workflow',
	displayTitle: 'Validating workflow',
};

function buildValidationMessage(
	result: ProgrammaticEvaluationResult,
	includeDetails: boolean,
): string {
	if (!includeDetails) {
		return `Workflow validation completed. Overall score: ${Math.round(result.overallScore * 100)}%.`;
	}

	return `Workflow validation completed.\n${formatWorkflowValidation(result)}`;
}

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

				const evaluation = await programmaticEvaluation(
					{
						generatedWorkflow: state.workflowJSON,
					},
					parsedNodeTypes,
				);

				const blockingViolations: ProgrammaticViolation[] = [
					...evaluation.connections.violations,
					...evaluation.trigger.violations,
					...evaluation.agentPrompt.violations,
					...evaluation.tools.violations,
					...evaluation.fromAi.violations,
				].filter((violation) => violation.type === 'critical' || violation.type === 'major');

				if (blockingViolations.length > 0) {
					const summary = formatWorkflowValidation(evaluation);
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

				const message = buildValidationMessage(evaluation, validatedInput.includeDetails ?? true);

				reporter.complete({ message });

				return createSuccessResponse(config, message, {
					workflowValidation: evaluation,
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
				'Run programmatic checks against the current workflow. Call this after making changes to ensure the workflow is valid.',
			schema: validateWorkflowSchema,
		},
	);

	return {
		tool: dynamicTool,
		...VALIDATE_WORKFLOW_TOOL,
	};
}
