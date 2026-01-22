import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { secretsProviderTypeSchema } from '../../schemas/secrets-provider.schema';

export class UpdateSecretProviderConnectionDto extends Z.class({
	type: secretsProviderTypeSchema.optional(),
	displayName: z.string().min(1).max(128).optional(),
	isGlobal: z.boolean().optional(),
	settings: (z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>).optional(),
}) {}
