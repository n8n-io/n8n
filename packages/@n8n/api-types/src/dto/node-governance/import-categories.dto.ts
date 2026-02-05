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
	.nullable()
	.optional();

const categorySchema = z.object({
	slug: slugSchema,
	displayName: z.string().min(1).max(255),
	description: z.string().max(1000).nullable().optional(),
	color: hexColorSchema,
	nodes: z.array(z.string().min(1).max(255)).default([]),
});

export class ImportCategoriesDto extends Z.class({
	version: z.string().min(1).max(10),
	exportedAt: z.string().optional(),
	categories: z.array(categorySchema).min(1, 'At least one category is required'),
}) {}
