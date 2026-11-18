import { z } from 'zod';

import { Z } from '../../zod-class';

const hexColor = z
	.string()
	.regex(/^#[0-9a-f]{6}$/i)
	.transform((value) => value.toLowerCase());

export class UpdateBrandingDto extends Z.class({
	// `null` restores the n8n default.
	accentColor: hexColor.nullable(),
	// `null` or a missing value derives the dark mode accent from `accentColor`.
	accentColorDark: hexColor.nullable().optional(),
}) {}
