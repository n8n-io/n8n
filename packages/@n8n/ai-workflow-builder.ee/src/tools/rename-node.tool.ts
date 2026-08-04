import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError } from '../errors';
import type { RenameNodeOutput } from '../types/tools';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, getWorkflowState, renameNodeInWorkflow } from './helpers/state';
import { createNodeNotFoundError, validateNodeExists } from './helpers/validation';

/**
 * Schema for renaming a node
 */
export const renameNodeSchema = z.object({
	nodeId: z.string().describe('The UUID of the node to rename'),
	newName: z.string().min(1).describe('The new name for the node'),
});

export const RENAME_NODE_TOOL: BuilderToolBase = {
	toolName: 'rename_node',
	displayTitle: 'Renaming node',
};

/**
 * Build the response message for the renamed node
 */
function buildResponseMessage(oldName: string, newName: string): string {
	return `Successfully renamed node from "${oldName}" to "${newName}"`;
}

/**
 * Factory function to create the rename node tool
 */
export function createRenameNodeTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input, config) => {
			const reporter = createProgressReporter(
				config,
				RENAME_NODE_TOOL.toolName,
				RENAME_NODE_TOOL.displayTitle,
			);

			try {
				const validatedInput = renameNodeSchema.parse(input);
				reporter.start(validatedInput);

				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				reportProgress(reporter, 'Finding node to rename...');
				const node = validateNodeExists(validatedInput.nodeId, workflow.nodes);

				if (!node) {
					const error = createNodeNotFoundError(validatedInput.nodeId);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				const oldName = node.name;
				const newName = validatedInput.newName;

				if (oldName === newName) {
					const validationError = new ValidationError(`Node "${oldName}" already has this name`, {
						field: 'newName',
						value: newName,
					});
					const error = {
						message: validationError.message,
						code: 'SAME_NAME',
						details: {
							nodeId: validatedInput.nodeId,
							currentName: oldName,
							newName,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				const existingNode = workflow.nodes.find(
					(n) => n.name === newName && n.id !== validatedInput.nodeId,
				);
				if (existingNode) {
					const validationError = new ValidationError(
						`A node with the name "${newName}" already exists`,
						{
							field: 'newName',
							value: newName,
						},
					);
					const error = {
						message: validationError.message,
						code: 'NAME_CONFLICT',
						details: {
							nodeId: validatedInput.nodeId,
							newName,
							conflictingNodeId: existingNode.id,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				logger?.debug('\n=== Rename Node Tool ===');
				logger?.debug(`Renaming node: "${oldName}" -> "${newName}"`);

				reportProgress(reporter, `Renaming "${oldName}" to "${newName}"...`);

				const message = buildResponseMessage(oldName, newName);

				logger?.debug('Node will be renamed');
				const output: RenameNodeOutput = {
					nodeId: validatedInput.nodeId,
					oldName,
					newName,
					message,
				};

				const stateUpdates = renameNodeInWorkflow(validatedInput.nodeId, oldName, newName);
				reporter.complete(output);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				let toolError;

				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid rename node parameters', {
						field: error.errors[0]?.path.join('.'),
						value: error.errors[0]?.message,
					});
					toolError = {
						message: validationError.message,
						code: 'VALIDATION_ERROR',
						details: error.errors,
					};
				} else {
					toolError = {
						message: error instanceof Error ? error.message : 'Unknown error occurred',
						code: 'EXECUTION_ERROR',
					};
				}

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: RENAME_NODE_TOOL.toolName,
			description: `Rename a node in the workflow. This updates the node's display name and automatically updates all connection references.

USAGE:
Use this tool when you need to give a node a more descriptive or meaningful name.

PARAMETERS:
- nodeId: The UUID of the node to rename
- newName: The new name for the node (must be unique in the workflow)

EXAMPLES:
1. Rename a generic node:
   nodeId: "abc-123", newName: "Process Customer Data"

2. Rename after duplicating:
   nodeId: "def-456", newName: "Send Welcome Email"

NOTES:
- The node must exist in the workflow
- The new name must not conflict with any other node name in the workflow
- All connections to/from this node will be automatically updated`,
			schema: renameNodeSchema,
		},
	);

	return {
		tool: dynamicTool,
		...RENAME_NODE_TOOL,
	};
}
