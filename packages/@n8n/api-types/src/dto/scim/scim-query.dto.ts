import { z } from 'zod';
import { Z } from 'zod-class';

// SCIM 2.0 Query Parameters for list operations
const scimQuerySchema = {
	filter: z.string().optional(),
	sortBy: z.string().optional(),
	sortOrder: z.enum(['ascending', 'descending']).optional(),
	startIndex: z.coerce.number().int().min(1).default(1),
	count: z.coerce.number().int().min(0).max(1000).default(100),
	attributes: z.string().optional(),
	excludedAttributes: z.string().optional(),
};

export class ScimQueryDto extends Z.class(scimQuerySchema) {}
