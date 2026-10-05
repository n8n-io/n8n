import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

export class PromotionChangesQueryDto extends Z.class({
	search: z.string().trim().optional(),
	sort: z.enum(['name', 'updatedAt', 'status']).default('name'),
	order: z.enum(['asc', 'desc']).default('asc'),
}) {}

export const promotableResourceStatusSchema = z.enum([
	'new',
	'modified',
	'renamed',
	'renamed-and-modified',
	'archived',
	'deleted',
]);

export type PromotableResourceStatus = z.infer<typeof promotableResourceStatusSchema>;

export const promotableResourceTypeSchema = z.enum(['workflow']);

export type PromotableResourceType = z.infer<typeof promotableResourceTypeSchema>;

export const promotableResourceSchema = z.object({
	id: n8nIdSchema,
	name: z.string(),
	type: promotableResourceTypeSchema,
	status: promotableResourceStatusSchema,
	version: z.number().int().nonnegative().nullable(),
	updatedAt: z.string().nullable(),
	updatedBy: z.string().nullable(),
	dependencyCount: z.number().int().nonnegative(),
});

export type PromotableResource = z.infer<typeof promotableResourceSchema>;

export const promotionChangesSchema = z.object({
	commitSha: z.string().nullable(),
	changes: promotableResourceSchema.array(),
});

export type PromotionChanges = z.infer<typeof promotionChangesSchema>;

export class PromotionChangesDto extends Z.class(promotionChangesSchema.shape) {}

export const promoteRequestSchema = z.object({
	workflowIds: z.array(n8nIdSchema).min(1),
	// Optional here, unlike the required message on the full-instance promote.
	commitMessage: z
		.string()
		.trim()
		.min(1)
		.max(1000)
		.describe('Message for the promotion commit. A default is used when omitted.')
		.optional(),
});

export type PromoteRequest = z.infer<typeof promoteRequestSchema>;

/** Request body for the project-scoped selective promote endpoint. */
export class PromoteSelectionRequestDto extends Z.class(promoteRequestSchema.shape, {
	strict: true,
}) {}
