import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { secretsProviderTypeSchema } from '../../schemas/secrets-provider.schema';
import { Z } from '../../zod-class';

export class UpdateSecretsProviderConnectionDto extends Z.class({
	type: secretsProviderTypeSchema.optional(),
	projectIds: z.array(z.string().min(1)).optional(),
	settings: (z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>).optional(),
}) {}
