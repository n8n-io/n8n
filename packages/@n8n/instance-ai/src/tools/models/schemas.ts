import { z } from 'zod';

export const searchModelsInputSchema = z
	.object({
		provider: z.string().trim().min(1).max(100).describe('Provider ID, such as openai or google'),
		query: z
			.string()
			.trim()
			.max(100)
			.optional()
			.describe(
				'Optional case-insensitive substring filter on model IDs and names, applied before the limit. For OpenRouter, use claude or openai to select a model maker. Empty means no filter.',
			),
		limit: z.number().int().min(1).max(10).default(10).describe('Maximum results; defaults to 10'),
	})
	.strict();

export type SearchModelsInput = z.infer<typeof searchModelsInputSchema>;

export const searchModelsOutputSchema = z.object({
	status: z.enum(['ok', 'unknown_provider', 'no_matching_models', 'catalog_unavailable']),
	provider: z.string(),
	source: z.literal('https://models.dev/api.json'),
	fetchedAt: z.string().datetime().nullable(),
	freshness: z.enum(['fresh', 'stale', 'unavailable']),
	credentialAccess: z.literal('not_checked'),
	guidance: z.string(),
	hasMore: z.boolean(),
	models: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			releaseDate: z.string().date().nullable(),
			status: z.string().nullable(),
			toolCalling: z.boolean().nullable(),
			reasoning: z.boolean().nullable(),
			modalities: z.object({
				input: z.array(z.string()).nullable(),
				output: z.array(z.string()).nullable(),
			}),
			limits: z.object({
				context: z.number().nullable(),
				output: z.number().nullable(),
			}),
			pricing: z
				.object({
					currency: z.literal('USD'),
					unit: z.literal('per_million_tokens'),
					input: z.number(),
					output: z.number(),
					cacheRead: z.number().nullable(),
					cacheWrite: z.number().nullable(),
				})
				.nullable(),
		}),
	),
});

export type SearchModelsResult = z.infer<typeof searchModelsOutputSchema>;
