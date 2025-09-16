import type { INode, INodeIssues, IDataObject, INodeCredentials } from 'n8n-workflow';
import { z } from 'zod';

export const xyPositionSchema = z.tuple([z.number(), z.number()]) satisfies z.ZodType<
	INode['position']
>;

export type XYPosition = z.infer<typeof xyPositionSchema>;

export const dataObjectSchema = z.record(z.string(), z.any()) satisfies z.ZodType<IDataObject>;

export const nodeIssuesSchema = z.object({
	execution: z.boolean().optional(),
	parameters: z.record(z.string(), z.array(z.string())).optional(),
	credentials: z.record(z.string(), z.array(z.string())).optional(),
	typeUnknown: z.boolean().optional(),
}) satisfies z.ZodType<Partial<INodeIssues>>;

// Node credentials schema
export const nodeCredentialsSchema = z.record(
	z.string(),
	z.object({
		id: z.string().nullable(),
		name: z.string(),
	}),
) satisfies z.ZodType<INodeCredentials>;

export const nodeParametersSchema = z.record(z.string(), z.unknown());

export const nodeSchema = z.object({
	// Base INode properties
	id: z.string(),
	name: z.string(),
	type: z.string(),
	typeVersion: z.number(),
	position: xyPositionSchema,
	parameters: nodeParametersSchema.optional(),
	credentials: nodeCredentialsSchema.optional(),
	disabled: z.boolean().optional(),
	retryOnFail: z.boolean().optional(),
	maxTries: z.number().optional(),
	waitBetween: z.number().optional(),
	alwaysOutputData: z.boolean().optional(),
	executeOnce: z.boolean().optional(),
	continueOnFail: z.boolean().optional(),
	onError: z.enum(['stopWorkflow', 'continueRegularOutput', 'continueErrorOutput']).optional(),
	webhookId: z.string().optional(),
}) satisfies z.ZodType<INode>;

export const nodeUiSchema = nodeSchema.extend({
	color: z.string().optional(),
	notes: z.string().optional(),
	issues: nodeIssuesSchema.optional(),
	pinData: dataObjectSchema.optional(),
	draggable: z.boolean().optional(),
});

export type INodeUi = z.infer<typeof nodeUiSchema>;
