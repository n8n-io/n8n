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

const COLLABORATION_MESSAGE_TYPES = new Set<WorkflowMessage['type']>([
	'workflowOpened',
	'workflowClosed',
	'writeAccessRequested',
	'writeAccessReleaseRequested',
	'writeAccessHeartbeat',
]);

/**
 * Whether the message's `type` is a collaboration message type. The push
 * `message` channel is multiplexed across features, so this lets the
 * collaboration consumer skip messages meant for other consumers before
 * attempting (and reporting) a strict parse.
 */
export const isCollaborationMessage = (msg: unknown): boolean =>
	typeof msg === 'object' &&
	msg !== null &&
	'type' in msg &&
	COLLABORATION_MESSAGE_TYPES.has((msg as { type: WorkflowMessage['type'] }).type);

/**
 * Parses the given message and ensure it's of type WorkflowMessage
 */
export const parseWorkflowMessage = async (msg: unknown) => {
	return await workflowMessageSchema.parseAsync(msg);
};
