import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createPatchWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'patch-workflow',
		description:
			'Patch a single node in a workflow: rename, update parameters, swap credentials, or enable/disable. ' +
			'Use for quick fixes (renaming, placeholder IDs, credential swaps, toggling nodes). ' +
			'For structural changes (add/remove nodes, rewire connections), use build-workflow-with-agent instead.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to patch'),
			nodeName: z.string().describe('Exact name of the node to patch'),
			newName: z.string().min(1).optional().describe('Rename the node to this value'),
			parameterPatch: z
				.record(z.unknown())
				.optional()
				.describe('Key-value pairs shallow-merged into node.parameters'),
			credentialPatch: z
				.record(z.object({ id: z.string(), name: z.string() }))
				.optional()
				.describe('Credential type → {id, name} to override on the node'),
			disabled: z.boolean().optional().describe('Set to true to disable the node, false to enable'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			workflowId: z.string(),
			nodeName: z.string(),
			error: z.string().optional(),
		}),
		execute: async (input) => {
			const { workflowId, nodeName, newName, parameterPatch, credentialPatch, disabled } = input;
			if (!context.workflowService.patchNode) {
				return {
					success: false,
					workflowId,
					nodeName,
					error: 'patchNode is not supported by the current workflow service',
				};
			}

			try {
				await context.workflowService.patchNode(workflowId, nodeName, {
					name: newName,
					parameters: parameterPatch,
					credentials: credentialPatch,
					disabled,
				});
				return { success: true, workflowId, nodeName: newName ?? nodeName };
			} catch (error) {
				return {
					success: false,
					workflowId,
					nodeName,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},
	});
}
