import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createPatchWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'patch-workflow',
		description:
			'Patch a single node in a workflow: update parameters, swap credentials, or enable/disable. ' +
			'Use for quick fixes (placeholder IDs, credential swaps, toggling nodes). ' +
			'For structural changes (add/remove nodes, rewire connections), use build-workflow-with-agent instead.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to patch'),
			nodeName: z.string().describe('Exact name of the node to patch'),
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
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { workflowId, nodeName, parameterPatch, credentialPatch, disabled } = input;
			const { resumeData, suspend } = ctx?.agent ?? {};
			if (!context.workflowService.patchNode) {
				return {
					success: false,
					workflowId,
					nodeName,
					error: 'patchNode is not supported by the current workflow service',
				};
			}

			const needsApproval = context.permissions?.patchWorkflow !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Patch node "${input.nodeName}" in workflow "${input.workflowId}"?`,
					severity: 'warning' as const,
				});
				return { success: false, workflowId, nodeName };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return {
					success: false,
					workflowId,
					nodeName,
					denied: true,
					reason: 'User denied the action',
				};
			}

			// State 3: Approved or always_allow — execute
			try {
				await context.workflowService.patchNode(workflowId, nodeName, {
					parameters: parameterPatch,
					credentials: credentialPatch,
					disabled,
				});
				return { success: true, workflowId, nodeName };
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
