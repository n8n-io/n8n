import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

// The pages live in docs/backend at the repository root. This site reads them in place.
// README.md becomes the home page. The Vale style packages under styles/ are not pages.
export const collections = {
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
				reading_time: z.string().optional(),
				last_reviewed: z.coerce.date().optional(),
				owner: z.string().optional(),
				generated: z.boolean().optional(),
			}),
		}),
	}),
};
