import { z } from 'zod';

import { Z } from '../zod-class';

export class SearchSkillCatalogQueryDto extends Z.class({
	query: z.string().trim().min(2).max(100),
}) {}

export const SKILL_CATALOG_CATEGORIES = [
	'development',
	'design',
	'documents',
	'data',
	'marketing',
	'research',
	'operations',
	'other',
] as const;
export type SkillCatalogCategory = (typeof SKILL_CATALOG_CATEGORIES)[number];
export type SkillCatalogView = 'popular' | 'trending';

export class BrowseSkillCatalogQueryDto extends Z.class({
	view: z.enum(['popular', 'trending']).default('popular'),
}) {}

export class GetSkillCatalogQueryDto extends Z.class({
	id: z
		.string()
		.max(512)
		.regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9_][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
}) {}

/** Catalog identity stays separate from the ID of an imported skill. */
export type SkillCatalogItem = {
	id: string;
	name: string;
	slug: string;
	source: string;
	installs?: number;
	githubUrl: string;
	catalogUrl: string;
	category?: SkillCatalogCategory;
	isOfficial?: boolean;
};

export type SkillCatalogResponse = {
	items: SkillCatalogItem[];
	fetchedAt: string;
	view?: SkillCatalogView;
};

export type SkillCatalogMetadata = {
	id: string;
	name: string;
	description: string;
	category: SkillCatalogCategory;
	instructions: string;
	files: Array<{ path: string; content: string; supported: boolean }>;
	license?: string;
	compatibility?: string;
	allowedTools?: string;
	hash?: string;
	fetchedAt: string;
};

export type SkillCatalogDetail = SkillCatalogMetadata & {
	repository?: { stars: number; topics: string[]; updatedAt: string; archived: boolean };
	audits?: Array<{ provider: string; status: string; summary: string; auditedAt: string }>;
};

export type SkillCatalogSummary = Pick<
	SkillCatalogMetadata,
	'id' | 'name' | 'description' | 'category'
>;
