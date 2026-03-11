import { z } from 'zod';

export type CollaborationMessage =
	| WorkflowOpenedMessage
	| WorkflowClosedMessage
	| WriteAccessRequestedMessage
	| WriteAccessReleaseRequestedMessage
	| WriteAccessHeartbeatMessage;

export const workflowOpenedMessageSchema = z.strictObject({
	type: z.literal('workflowOpened'),
	workflowId: z.string().min(1),
});

export const workflowClosedMessageSchema = z.strictObject({
	type: z.literal('workflowClosed'),
	workflowId: z.string().min(1),
});

export const writeAccessRequestedMessageSchema = z.strictObject({
	type: z.literal('writeAccessRequested'),
	workflowId: z.string().min(1),
	force: z.boolean().optional(),
});

export const writeAccessReleaseRequestedMessageSchema = z.strictObject({
	type: z.literal('writeAccessReleaseRequested'),
	workflowId: z.string().min(1),
});

export const writeAccessHeartbeatMessageSchema = z.strictObject({
	type: z.literal('writeAccessHeartbeat'),
	workflowId: z.string().min(1),
});

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
