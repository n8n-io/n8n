import { z } from 'zod';

export type CollaborationMessage =
	| WorkflowOpenedMessage
	| WorkflowClosedMessage
	| WorkflowEditMessage
	| WorkflowCursorMessage;

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

// Schema for workflow editing operations
export const workflowEditOperationSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('addNode'),
		nodeData: z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
			typeVersion: z.number(),
			position: z.array(z.number()).length(2),
			parameters: z.record(z.any()).optional(),
		}),
		position: z.number().optional(), // Operation position for conflict resolution
	}),
	z.object({
		action: z.literal('removeNode'),
		nodeId: z.string(),
		position: z.number().optional(),
	}),
	z.object({
		action: z.literal('updateNode'),
		nodeId: z.string(),
		changes: z.record(z.any()),
		position: z.number().optional(),
	}),
	z.object({
		action: z.literal('addConnection'),
		connection: z.object({
			source: z.string(),
			sourceIndex: z.number(),
			destination: z.string(),
			destinationIndex: z.number(),
			type: z.string().optional(),
		}),
		position: z.number().optional(),
	}),
	z.object({
		action: z.literal('removeConnection'),
		connection: z.object({
			source: z.string(),
			sourceIndex: z.number(),
			destination: z.string(),
			destinationIndex: z.number(),
		}),
		position: z.number().optional(),
	}),
]);

export const workflowEditMessageSchema = z
	.object({
		type: z.literal('workflowEdit'),
		workflowId: z.string().min(1),
		operation: workflowEditOperationSchema,
		timestamp: z.number(),
		userId: z.string(),
		operationId: z.string(), // Unique ID for this operation
	})
	.strict();

export const workflowCursorMessageSchema = z
	.object({
		type: z.literal('workflowCursor'),
		workflowId: z.string().min(1),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.optional(),
		selectedNodeId: z.string().optional(),
		userId: z.string(),
	})
	.strict();

export const workflowMessageSchema = z.discriminatedUnion('type', [
	workflowOpenedMessageSchema,
	workflowClosedMessageSchema,
	workflowEditMessageSchema,
	workflowCursorMessageSchema,
]);

export type WorkflowOpenedMessage = z.infer<typeof workflowOpenedMessageSchema>;

export type WorkflowClosedMessage = z.infer<typeof workflowClosedMessageSchema>;

export type WorkflowEditMessage = z.infer<typeof workflowEditMessageSchema>;

export type WorkflowCursorMessage = z.infer<typeof workflowCursorMessageSchema>;

export type WorkflowEditOperation = z.infer<typeof workflowEditOperationSchema>;

export type WorkflowMessage = z.infer<typeof workflowMessageSchema>;

/**
 * Parses the given message and ensure it's of type WorkflowMessage
 */
export const parseWorkflowMessage = async (msg: unknown) => {
	return await workflowMessageSchema.parseAsync(msg);
};
