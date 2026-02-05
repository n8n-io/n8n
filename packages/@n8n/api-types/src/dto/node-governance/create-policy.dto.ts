import { z } from 'zod';
import { Z } from 'zod-class';

const policyTypeSchema = z.enum(['allow', 'block']);
const policyScopeSchema = z.enum(['global', 'projects']);
const targetTypeSchema = z.enum(['node', 'category']);

export class CreatePolicyDto extends Z.class({
	policyType: policyTypeSchema,
	scope: policyScopeSchema,
	targetType: targetTypeSchema,
	targetValue: z.string().min(1).max(255),
	projectIds: z.array(z.string()).optional(),
}) {}
