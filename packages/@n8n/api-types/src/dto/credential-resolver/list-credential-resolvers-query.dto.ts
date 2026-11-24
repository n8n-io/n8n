import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class ListCredentialResolversQueryDto extends Z.class({
	includeSystem: booleanFromString.optional(),
}) {}
