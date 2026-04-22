import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class RetrieveTagQueryDto extends Z.class({
	withUsageCount: booleanFromString.optional().default('false'),
}) {}
