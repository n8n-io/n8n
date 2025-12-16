import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';
import { programmaticValidation } from '@/validation/programmatic';
import type {
	ProgrammaticViolation,
	ProgrammaticChecksResult,
	TelemetryValidationStatus,
} from '@/validation/types';
import { PROGRAMMATIC_VIOLATION_NAMES } from '@/validation/types';

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

/**
 * Creates a compacted validation result for use in telemetry
 * @returns `{ X: 'pass' | 'fail', Y: 'pass' | 'fail', ... }`
 */
function collectValidationResultForTelemetry(
	results: ProgrammaticChecksResult,
): TelemetryValidationStatus {
	const status = Object.fromEntries(
		PROGRAMMATIC_VIOLATION_NAMES.map((name) => [name, 'pass' as const]),
	) as TelemetryValidationStatus;

	Object.values(results).forEach((violations: ProgrammaticViolation[]) => {
		violations?.forEach((violation) => {
			status[violation.name] = 'fail';
		});
	});

	return status;
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

				const violations = programmaticValidation(
					{
						generatedWorkflow: state.workflowJSON,
					},
					parsedNodeTypes,
				);

				const validationResultForTelemetry = collectValidationResultForTelemetry(violations);

				const message = formatWorkflowValidation(violations);

				reporter.complete({ message });

				return createSuccessResponse(config, message, {
					workflowValidation: violations,
					validationHistory: [validationResultForTelemetry],
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
