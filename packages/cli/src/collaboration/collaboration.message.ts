import { z } from 'zod';

export type CollaborationMessage =
	| WorkflowOpenedMessage
	| WorkflowClosedMessage
	| WriteAccessRequestedMessage
	| WriteAccessReleaseRequestedMessage
	| WriteAccessHeartbeatMessage
	| AgentOpenedMessage
	| AgentClosedMessage
	| AgentWriteAccessRequestedMessage
	| AgentWriteAccessReleaseRequestedMessage
	| AgentWriteAccessHeartbeatMessage;

export const workflowOpenedMessageSchema = z
	.object({
		type: z.literal('workflowOpened'),
		workflowId: z.string().min(1),
	})
	.strict();

export const workflowClosedMessageSchema = z
	.object({
		type: z.literal('workflowClosed'),
		workflowId: z.string().min(1),
	})
	.strict();

export const writeAccessRequestedMessageSchema = z
	.object({
		type: z.literal('writeAccessRequested'),
		workflowId: z.string().min(1),
		force: z.boolean().optional(),
	})
	.strict();

export const writeAccessReleaseRequestedMessageSchema = z
	.object({
		type: z.literal('writeAccessReleaseRequested'),
		workflowId: z.string().min(1),
	})
	.strict();

export const writeAccessHeartbeatMessageSchema = z
	.object({
		type: z.literal('writeAccessHeartbeat'),
		workflowId: z.string().min(1),
	})
	.strict();

export const agentOpenedMessageSchema = z
	.object({
		type: z.literal('agentOpened'),
		agentId: z.string().min(1),
	})
	.strict();

export const agentClosedMessageSchema = z
	.object({
		type: z.literal('agentClosed'),
		agentId: z.string().min(1),
	})
	.strict();

export const agentWriteAccessRequestedMessageSchema = z
	.object({
		type: z.literal('agentWriteAccessRequested'),
		agentId: z.string().min(1),
		force: z.boolean().optional(),
	})
	.strict();

export const agentWriteAccessReleaseRequestedMessageSchema = z
	.object({
		type: z.literal('agentWriteAccessReleaseRequested'),
		agentId: z.string().min(1),
	})
	.strict();

export const agentWriteAccessHeartbeatMessageSchema = z
	.object({
		type: z.literal('agentWriteAccessHeartbeat'),
		agentId: z.string().min(1),
	})
	.strict();

export const workflowMessageSchema = z.discriminatedUnion('type', [
	workflowOpenedMessageSchema,
	workflowClosedMessageSchema,
	writeAccessRequestedMessageSchema,
	writeAccessReleaseRequestedMessageSchema,
	writeAccessHeartbeatMessageSchema,
	agentOpenedMessageSchema,
	agentClosedMessageSchema,
	agentWriteAccessRequestedMessageSchema,
	agentWriteAccessReleaseRequestedMessageSchema,
	agentWriteAccessHeartbeatMessageSchema,
]);

export type WorkflowOpenedMessage = z.infer<typeof workflowOpenedMessageSchema>;

export type WorkflowClosedMessage = z.infer<typeof workflowClosedMessageSchema>;

export type WriteAccessRequestedMessage = z.infer<typeof writeAccessRequestedMessageSchema>;

export type WriteAccessReleaseRequestedMessage = z.infer<
	typeof writeAccessReleaseRequestedMessageSchema
>;

export type WriteAccessHeartbeatMessage = z.infer<typeof writeAccessHeartbeatMessageSchema>;

export type AgentOpenedMessage = z.infer<typeof agentOpenedMessageSchema>;

export type AgentClosedMessage = z.infer<typeof agentClosedMessageSchema>;

export type AgentWriteAccessRequestedMessage = z.infer<
	typeof agentWriteAccessRequestedMessageSchema
>;

export type AgentWriteAccessReleaseRequestedMessage = z.infer<
	typeof agentWriteAccessReleaseRequestedMessageSchema
>;

export type AgentWriteAccessHeartbeatMessage = z.infer<
	typeof agentWriteAccessHeartbeatMessageSchema
>;

export type WorkflowMessage = z.infer<typeof workflowMessageSchema>;

/**
 * Parses the given message and ensure it's of type WorkflowMessage
 */
export const parseWorkflowMessage = async (msg: unknown) => {
	return await workflowMessageSchema.parseAsync(msg);
};
