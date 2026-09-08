import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';

export const promotableResourceStatusSchema = z.enum(['new', 'modified', 'archived', 'deleted']);

export type PromotableResourceStatus = z.infer<typeof promotableResourceStatusSchema>;

export const promotableResourceTypeSchema = z.enum(['workflow']);

export type PromotableResourceType = z.infer<typeof promotableResourceTypeSchema>;

export const promotableResourceSchema = z.object({
	id: n8nIdSchema,
	name: z.string(),
	type: promotableResourceTypeSchema,
	status: promotableResourceStatusSchema,
	version: z.number().int().nonnegative().nullable(),
	updatedAt: z.string(),
	updatedBy: z.string().nullable(),
	dependencyCount: z.number().int().nonnegative(),
});

export type PromotableResource = z.infer<typeof promotableResourceSchema>;

export const promoteRequestSchema = z.object({
	workflowIds: z.array(n8nIdSchema).min(1),
	createBranch: z.boolean(),
});

export type PromoteRequest = z.infer<typeof promoteRequestSchema>;
