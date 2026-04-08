/**
 * Apply Workflow Credentials Tool
 *
 * Atomically applies real credentials to nodes that were mocked during build.
 * Uses the mockedCredentialsByNode mapping from the build outcome to target
 * only the right nodes.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

export const applyWorkflowCredentialsInputSchema = z.object({
	workItemId: z.string().describe('The work item ID from the build (wi_XXXXXXXX)'),
	workflowId: z.string().describe('The workflow ID to update'),
	credentials: z.record(z.string()).describe('Map of credentialType → credentialId to apply'),
});

export function createApplyWorkflowCredentialsTool(context: OrchestrationContext) {
	return createTool({
		id: 'apply-workflow-credentials',
		description:
			'Apply real credentials to a workflow that was built with mocked credentials. ' +
			'Only updates nodes that were mocked — never overwrites existing real credentials.',
		inputSchema: applyWorkflowCredentialsInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			appliedNodes: z.array(z.string()).optional(),
			error: z.string().optional(),
		}),
		execute: async (input: z.infer<typeof applyWorkflowCredentialsInputSchema>) => {
			if (!context.workflowTaskService || !context.domainContext) {
				return { success: false, error: 'Credential application support not available.' };
			}

			const buildOutcome = await context.workflowTaskService.getBuildOutcome(input.workItemId);
			if (!buildOutcome?.mockedCredentialsByNode) {
				return {
					success: false,
					error: `No mocked credential mapping found for work item ${input.workItemId}.`,
				};
			}

			const { mockedCredentialsByNode } = buildOutcome;
			const { credentialService, workflowService } = context.domainContext;

			// Load the workflow
			let json;
			try {
				json = await workflowService.getAsWorkflowJSON(input.workflowId);
			} catch {
				return { success: false, error: `Workflow ${input.workflowId} not found.` };
			}

			const appliedNodes: string[] = [];

			for (const node of json.nodes ?? []) {
				const nodeName = node.name ?? '';
				const mockedTypes = mockedCredentialsByNode[nodeName];
				if (!mockedTypes?.length) continue;

				node.credentials ??= {};

				for (const credType of mockedTypes) {
					const credId = input.credentials[credType];
					if (!credId) continue;

					try {
						const credDetail = await credentialService.get(credId);
						node.credentials[credType] = { id: credDetail.id, name: credDetail.name };
					} catch {
						return {
							success: false,
							error: `Credential ${credId} for type ${credType} no longer exists.`,
						};
					}
				}
				appliedNodes.push(nodeName);
			}

			if (appliedNodes.length === 0) {
				return { success: true, appliedNodes: [] };
			}

			// Save the workflow with applied credentials
			try {
				await workflowService.updateFromWorkflowJSON(input.workflowId, json);
			} catch (error) {
				return {
					success: false,
					error: `Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
				};
			}

			// Clear verification context from the build outcome
			await context.workflowTaskService.updateBuildOutcome(input.workItemId, {
				mockedCredentialsByNode: undefined,
				verificationPinData: undefined,
				mockedNodeNames: undefined,
				mockedCredentialTypes: undefined,
			});

			return { success: true, appliedNodes };
		},
	});
}
