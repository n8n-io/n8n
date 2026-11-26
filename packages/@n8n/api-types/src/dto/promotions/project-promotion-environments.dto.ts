import { z } from 'zod';

import { promotionProviderTypeSchema } from './promotion-provider.dto';

/** Every project reader sees this, so it holds no remote, branch, host or credentials. */
export const projectPromotionEnvironmentSchema = z.discriminatedUnion('state', [
	z
		.object({
			state: z.literal('default'),
			name: z.string(),
			providerType: promotionProviderTypeSchema,
		})
		.strict(),
	z.object({ state: z.literal('own') }).strict(),
	z.object({ state: z.literal('none') }).strict(),
]);
export type ProjectPromotionEnvironment = z.infer<typeof projectPromotionEnvironmentSchema>;

export const projectPromotionEnvironmentsResponseSchema = z.discriminatedUnion('enabled', [
	z.object({ enabled: z.literal(false) }).strict(),
	z
		.object({
			enabled: z.literal(true),
			promote: projectPromotionEnvironmentSchema,
			apply: projectPromotionEnvironmentSchema,
		})
		.strict(),
]);
export type ProjectPromotionEnvironmentsResponse = z.infer<
	typeof projectPromotionEnvironmentsResponseSchema
>;
