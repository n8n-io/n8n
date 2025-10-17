import type { IWorkflowSettings, WorkflowFEMeta } from 'n8n-workflow';
import z from 'zod';

export const nodeSchema = z
	.object({
		name: z.string(),
		type: z.string(),
	})
	.passthrough();

export const tagSchema = z.object({ id: z.string(), name: z.string() }).passthrough();

export const workflowSettingsSchema = z
	.custom<IWorkflowSettings>((_value): _value is IWorkflowSettings => true)
	.nullable();

export const workflowMetaSchema = z
	.custom<WorkflowFEMeta>((_value): _value is WorkflowFEMeta => true)
	.nullable();

export const workflowDetailsOutputSchema = z.object({
	workflow: z
		.object({
			id: z.string(),
			name: z.string().nullable(),
			active: z.boolean(),
			isArchived: z.boolean(),
			versionId: z.string(),
			triggerCount: z.number(),
			createdAt: z.string().nullable(),
			updatedAt: z.string().nullable(),
			settings: workflowSettingsSchema,
			connections: z.record(z.unknown()),
			nodes: z.array(nodeSchema),
			tags: z.array(tagSchema),
			meta: workflowMetaSchema,
			parentFolderId: z.string().nullable(),
		})
		.passthrough()
		.describe('Sanitized workflow data safe for MCP consumption'),
	triggerInfo: z
		.string()
		.describe('Human-readable instructions describing how to trigger the workflow'),
});
