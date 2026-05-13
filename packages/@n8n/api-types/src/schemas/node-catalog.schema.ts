import { z } from 'zod';

export const NodeOperationInputSchema = z.object({
	type: z.literal('object'),
	properties: z.record(z.unknown()),
	required: z.array(z.string()).optional(),
});

export const NodeOperationSchema = z.object({
	id: z.string(),
	resource: z.string().optional(),
	operation: z.string().optional(),
	displayName: z.string(),
	description: z.string().optional(),
	inputSchema: NodeOperationInputSchema,
});

export const NodeSchema = z.object({
	nodeId: z.string(),
	displayName: z.string(),
	description: z.string(),
	credentials: z.array(z.object({ name: z.string() })),
	operations: z.array(NodeOperationSchema),
});

export type NodeOperationInput = z.infer<typeof NodeOperationInputSchema>;
export type NodeOperation = z.infer<typeof NodeOperationSchema>;
export type NodeSchemaShape = z.infer<typeof NodeSchema>;
