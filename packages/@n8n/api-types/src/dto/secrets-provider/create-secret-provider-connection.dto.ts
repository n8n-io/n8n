import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { secretsProviderTypeSchema } from '../../schemas/secrets-provider.schema';

export class CreateSecretProviderConnectionDto extends Z.class({
	providerKey: z.string().min(1).max(128),
	type: secretsProviderTypeSchema,
	projectId: z.string().min(1),
	settings: z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>,
}) {}
