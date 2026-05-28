import { z } from 'zod';

import { scopesSchema } from '../../schemas/scopes.schema';
import { xssCheck } from '../../utils/xss-check';
import { Z } from '../../zod-class';

export class UpdateApiKeyRequestDto extends Z.class({
	label: z.string().max(50).min(1).refine(xssCheck),
	scopes: scopesSchema,
}) {}
