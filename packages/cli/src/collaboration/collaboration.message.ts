import { z } from 'zod';

export type CollaborationMessage =
	| WorkflowOpenedMessage
	| WorkflowClosedMessage
	| WriteAccessRequestedMessage
	| WriteAccessReleaseRequestedMessage
	| WriteAccessHeartbeatMessage;

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

export const workflowMessageSchema = z.discriminatedUnion('type', [
	workflowOpenedMessageSchema,
	workflowClosedMessageSchema,
	writeAccessRequestedMessageSchema,
	writeAccessReleaseRequestedMessageSchema,
	writeAccessHeartbeatMessageSchema,
]);

export type WorkflowOpenedMessage = z.infer<typeof workflowOpenedMessageSchema>;

export type WorkflowClosedMessage = z.infer<typeof workflowClosedMessageSchema>;

export type WriteAccessRequestedMessage = z.infer<typeof writeAccessRequestedMessageSchema>;

export type WriteAccessReleaseRequestedMessage = z.infer<
	typeof writeAccessReleaseRequestedMessageSchema
>;

export type WriteAccessHeartbeatMessage = z.infer<typeof writeAccessHeartbeatMessageSchema>;

export type WorkflowMessage = z.infer<typeof workflowMessageSchema>;

/**
 * Parses the given message and ensure it's of type WorkflowMessage
 */
export const parseWorkflowMessage = async (msg: unknown) => {
	return await workflowMessageSchema.parseAsync(msg);
};
