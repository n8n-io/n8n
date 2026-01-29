import { z } from 'zod';
import { Z } from 'zod-class';

const policyTypeSchema = z.enum(['allow', 'block']);
const policyScopeSchema = z.enum(['global', 'projects']);
const targetTypeSchema = z.enum(['node', 'category']);

export class UpdatePolicyDto extends Z.class({
	policyType: policyTypeSchema.optional(),
	scope: policyScopeSchema.optional(),
	targetType: targetTypeSchema.optional(),
	targetValue: z.string().min(1).max(255).optional(),
	projectIds: z.array(z.string()).optional(),
}) {}
