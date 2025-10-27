import { Z } from 'zod-class';

import { booleanFromString } from '../../schemas/boolean-from-string';

export class RetrieveTagQueryDto extends Z.class({
	withUsageCount: booleanFromString.optional().default('false'),
}) {}
