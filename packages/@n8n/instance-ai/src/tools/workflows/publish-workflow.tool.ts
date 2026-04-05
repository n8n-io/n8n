import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createPublishWorkflowTool(context: InstanceAiContext) {
	const hasNamedVersions = !!context.workflowService.updateVersion;

	const baseSchema = z.object({
		workflowId: z.string().describe('ID of the workflow'),
		workflowName: z.string().optional().describe('Name of the workflow (for confirmation message)'),
		versionId: z
			.string()
			.optional()
			.describe('Specific version to publish (omit to publish the latest draft)'),
	});

	const inputSchema = hasNamedVersions
		? baseSchema.extend({
				name: z
					.string()
					.optional()
					.describe('Name for this published version (e.g. "v1.2 — added retry logic")'),
				description: z
					.string()
					.optional()
					.describe('Description of what this version does or what changed'),
			})
		: baseSchema;

	return createTool({
		id: 'publish-workflow',
		description:
			'Publish a workflow version to production. Publishing makes the specified version active — ' +
			'it will run on its triggers. If the workflow has been edited since last publish, you must ' +
			're-publish for changes to take effect. Omit versionId to publish the latest draft.',
		inputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			activeVersionId: z
				.string()
				.optional()
				.describe('The now-active version ID. Confirms the workflow is published.'),
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
			const { resumeData, suspend } = ctx?.agent ?? {};

			const needsApproval = context.permissions?.publishWorkflow !== 'always_allow';

			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				const label = input.workflowName ?? input.workflowId;

				await suspend?.({
					requestId: nanoid(),
					message: input.versionId
						? `Publish version "${input.versionId}" of workflow "${label}"?`
						: `Publish workflow "${label}"?`,
					severity: 'warning' as const,
				});
				return { success: false };
			}

			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			try {
				const result = await context.workflowService.publish(input.workflowId, {
					versionId: input.versionId,
					...(hasNamedVersions
						? {
								name: (input as { name?: string }).name,
								description: (input as { description?: string }).description,
							}
						: {}),
				});
				return { success: true, activeVersionId: result.activeVersionId };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Publish failed',
				};
			}
		},
	});
}
