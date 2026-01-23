import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { secretsProviderTypeSchema } from '../../schemas/secrets-provider.schema';

export class CreateSecretsProviderConnectionDto extends Z.class({
	providerKey: z.string().min(1).max(128),
	type: secretsProviderTypeSchema,
	projectIds: z.array(z.string().min(1)),
	settings: z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>,
}) {}
