import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateBrandingDto extends Z.class({
	// `null` restores the n8n default.
	accentColor: z
		.string()
		.regex(/^#[0-9a-f]{6}$/i)
		.transform((value) => value.toLowerCase())
		.nullable(),
}) {}
