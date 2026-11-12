import { z } from 'zod';

import { Z } from '../zod-class';

export class SearchSkillCatalogQueryDto extends Z.class({
	query: z.string().trim().min(2).max(100),
}) {}

/** Catalog identity stays separate from the ID of an imported skill. */
export type SkillCatalogItem = {
	id: string;
	name: string;
	slug: string;
	source: string;
	installs: number;
	githubUrl: string;
	catalogUrl: string;
};

export type SkillCatalogResponse = {
	items: SkillCatalogItem[];
	fetchedAt: string;
};
