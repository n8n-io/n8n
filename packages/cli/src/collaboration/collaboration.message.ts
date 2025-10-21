import { z } from 'zod';

export type CollaborationMessage =
	| WorkflowOpenedMessage
	| WorkflowClosedMessage
	| WriteAccessAcquiredMessage
	| WriteAccessReleasedMessage;

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

export const writeAccessAcquiredMessageSchema = z
	.object({
		type: z.literal('writeAccessAcquired'),
		workflowId: z.string().min(1),
		userId: z.string().min(1),
	})
	.strict();

export const writeAccessReleasedMessageSchema = z
	.object({
		type: z.literal('writeAccessReleased'),
		workflowId: z.string().min(1),
	})
	.strict();

export const workflowMessageSchema = z.discriminatedUnion('type', [
	workflowOpenedMessageSchema,
	workflowClosedMessageSchema,
	writeAccessAcquiredMessageSchema,
	writeAccessReleasedMessageSchema,
]);

export type WorkflowOpenedMessage = z.infer<typeof workflowOpenedMessageSchema>;

export type WorkflowClosedMessage = z.infer<typeof workflowClosedMessageSchema>;

export type WriteAccessAcquiredMessage = z.infer<typeof writeAccessAcquiredMessageSchema>;

export type WriteAccessReleasedMessage = z.infer<typeof writeAccessReleasedMessageSchema>;

export type WorkflowMessage = z.infer<typeof workflowMessageSchema>;

/**
 * Parses the given message and ensure it's of type WorkflowMessage
 */
export const parseWorkflowMessage = async (msg: unknown) => {
	return await workflowMessageSchema.parseAsync(msg);
};
