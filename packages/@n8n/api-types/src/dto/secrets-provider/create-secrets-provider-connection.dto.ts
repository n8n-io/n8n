import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { secretsProviderTypeSchema } from '../../schemas/secrets-provider.schema';
import { Z } from '../../zod-class';

export class CreateSecretsProviderConnectionDto extends Z.class({
	providerKey: z
		.string()
		.min(1)
		.max(128)
		.regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/),
	type: secretsProviderTypeSchema,
	projectIds: z.array(z.string().min(1)),
	settings: z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>,
}) {}
