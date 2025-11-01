import xss from 'xss';
import { z } from 'zod';
import { Z } from 'zod-class';

import { scopesSchema } from '../../schemas/scopes.schema';

const xssCheck = (value: string) =>
	value ===
	xss(value, {
		whiteList: {},
	});

export class UpdateApiKeyRequestDto extends Z.class({
	label: z.string().max(50).min(1).refine(xssCheck),
	scopes: scopesSchema,
}) {}
