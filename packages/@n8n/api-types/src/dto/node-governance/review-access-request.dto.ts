import { z } from 'zod';
import { Z } from 'zod-class';

const reviewActionSchema = z.enum(['approve', 'reject']);

export class ReviewAccessRequestDto extends Z.class({
	action: reviewActionSchema,
	comment: z.string().max(1000).optional(),
	policyId: z.string().optional(),
	// Keep createPolicy for backward compatibility, but it's deprecated
	createPolicy: z.boolean().optional(),
}) {}
