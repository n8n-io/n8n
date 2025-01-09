import { Z } from 'zod-class';

import { booleanFromString } from '../../schemas/booleanFromString';

export class GetMyProjectsDto extends Z.class({
	includeScopes: booleanFromString.optional(),
}) {}
