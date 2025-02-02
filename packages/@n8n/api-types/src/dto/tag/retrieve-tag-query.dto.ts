import { Z } from 'zod-class';

import { booleanFromString } from '../../schemas/booleanFromString';

export class RetrieveTagQueryDto extends Z.class({
	withUsageCount: booleanFromString.optional().default('false'),
}) {}
