import { z } from 'zod';
import { Z } from 'zod-class';

import { booleanFromString } from '../../schemas/boolean-from-string';

export class ListSecretsCompletionsQueryDto extends Z.class({
	projectId: z.string().optional(),
	includeGlobal: booleanFromString.optional(),
}) {}
