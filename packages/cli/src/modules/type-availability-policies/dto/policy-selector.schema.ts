import { z } from 'zod';

/** Zod counterpart of `PolicySelector` in `../policy-rule.types.ts`. */
export const policySelectorSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('name'), value: z.string().min(1) }),
	z.object({ kind: z.literal('package'), value: z.string().min(1) }),
]);

export type PolicySelectorInput = z.infer<typeof policySelectorSchema>;
