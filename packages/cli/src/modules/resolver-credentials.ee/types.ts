import { z } from 'zod';

export const AvailableEngines = ['direct_map'] as const;

export type AvailableEngine = (typeof AvailableEngines)[number];

export const ResolverOptionSchema = z.object({
	engine: z.enum(AvailableEngines),
});

export const ResolverConfigSchema = z.object({
	is_resolveable: z.boolean(),
	resolver_options: ResolverOptionSchema,
});

export type ResolverConfig = z.infer<typeof ResolverConfigSchema>;
