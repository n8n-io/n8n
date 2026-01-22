import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { secretsProviderTypeSchema } from '../../schemas/secrets-provider.schema';

export class CreateSecretProviderConnectionDto extends Z.class({
	name: z.string().min(1).max(128),
	type: secretsProviderTypeSchema,
	displayName: z.string().min(1).max(128).optional(),
	isGlobal: z.boolean(),
	projectId: z.string().min(1),
	settings: z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>,
}) {}
