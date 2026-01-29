import { z } from 'zod';
import { Z } from 'zod-class';

const slugSchema = z
	.string()
	.min(1)
	.max(100)
	.regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

const hexColorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
	.optional();

export class CreateCategoryDto extends Z.class({
	slug: slugSchema,
	displayName: z.string().min(1).max(255),
	description: z.string().max(1000).optional(),
	color: hexColorSchema,
}) {}
