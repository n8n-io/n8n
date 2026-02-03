import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateCredentialDto extends Z.class({
	name: z.string().min(1).max(128).optional(),
	type: z.string().min(1).max(128).optional(),
	data: z.record(z.string(), z.any()).optional(),
	isGlobal: z.boolean().optional(),
	isResolvable: z.boolean().optional(),
}) {}
