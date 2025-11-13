import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { ITelemetryTrackProperties } from 'n8n-workflow/src';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';
import { programmaticValidation } from '@/validation/programmatic';
import type { ProgrammaticChecksResult, ProgrammaticViolation } from '@/validation/types';

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

function collectTelemetryEventProps(results: ProgrammaticChecksResult) {
	const props = {
		validation_failed: [] as string[],
	};

	Object.values(results).forEach((violations: ProgrammaticViolation[]) => {
		violations.forEach((violation) => {
			if (violation?.name) {
				props.validation_failed.push(violation.name);
			}
		});
	});

	return props;
}

export function createValidateWorkflowTool(
	parsedNodeTypes: INodeTypeDescription[],
	logger?: Logger,
	onTelemetryEvent?: (event: string, properties: ITelemetryTrackProperties) => void,
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

				const telemetryProps = collectTelemetryEventProps(violations);
				onTelemetryEvent?.('Builder validation check failed', telemetryProps);

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
