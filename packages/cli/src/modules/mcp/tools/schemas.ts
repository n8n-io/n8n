import type { IConnections, INode, IWorkflowSettings, WorkflowFEMeta } from 'n8n-workflow';
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

/**
 * Zod schema for workflow JSON input/output used by workflow builder MCP tools.
 * The MCP client holds state — tools accept this as input and return the modified version.
 */
export const workflowJsonSchema = z.object({
	nodes: z
		.array(z.custom<INode>((_value): _value is INode => true))
		.describe('Array of workflow nodes'),
	connections: z
		.custom<IConnections>((_value): _value is IConnections => true)
		.describe('Workflow connections object'),
});

export type WorkflowJson = z.infer<typeof workflowJsonSchema>;

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
			description: z.string().optional().describe('The description of the workflow'),
			scopes: z.array(z.string()).describe('User permissions for this workflow'),
			canExecute: z.boolean().describe('Whether the user has permission to execute this workflow'),
		})
		.passthrough()
		.describe('Sanitized workflow data safe for MCP consumption'),
	triggerInfo: z
		.string()
		.describe('Human-readable instructions describing how to trigger the workflow'),
});
