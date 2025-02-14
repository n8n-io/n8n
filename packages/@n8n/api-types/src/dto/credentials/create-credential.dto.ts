import { z } from 'zod';
import { Z } from 'zod-class';

export class CreateCredentialDto extends Z.class({
	name: z.string().min(1).max(128),
	type: z.string().min(1).max(32),
	data: z.object({}),
	projectId: z.string().optional(),
}) {}
