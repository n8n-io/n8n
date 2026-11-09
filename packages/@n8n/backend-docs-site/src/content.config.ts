import { i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

// The pages live in docs/backend at the repository root. This site reads them in place.
// README.md becomes the home page. The Vale style packages under styles/ are not pages.
export const collections = {
	// Overrides Starlight UI strings, such as the search label.
	i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
	docs: defineCollection({
		loader: glob({
			base: '../../../docs/backend',
			pattern: ['**/*.md', '!styles/**'],
			generateId: ({ entry }) => entry.replace(/\.md$/, '').replace(/(^|\/)README$/, '$1index'),
		}),
		schema: docsSchema({
			extend: z.object({
				audience: z.string().optional(),
				tier: z.number().optional(),
				// An empty value is absent. Without this, it becomes the date 1970-01-01.
				last_reviewed: z.preprocess((value) => value ?? undefined, z.coerce.date().optional()),
				contact: z.string().optional(),
			}),
		}),
	}),
};
