import { Z } from '../../zod-class';
import { booleanFromString } from '../../schemas/boolean-from-string';

export class GetUserQueryDto extends Z.class({
	includeRole: booleanFromString.optional().default('false'),
}) {}
