import { Z } from 'zod-class';

import { booleanLiteral } from 'dto/common';

export class CredentialsGetOneRequestQuery extends Z.class({
	includeData: booleanLiteral.optional(),
}) {}
