import { z } from 'zod';
import { Z } from 'zod-class';

export class CategoryAssignmentDto extends Z.class({
	nodeType: z.string().min(1).max(255),
}) {}

export class BulkCategoryAssignmentDto extends Z.class({
	nodeTypes: z.array(z.string().min(1).max(255)).min(1),
}) {}
