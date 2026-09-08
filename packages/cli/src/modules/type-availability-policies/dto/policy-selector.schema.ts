import { z } from 'zod';

import type { PolicySelector } from '../policy-rule.types';

/**
 * Zod counterpart of `PolicySelector` in `../policy-rule.types.ts`. The `satisfies` check
 * keeps this schema honest against that type — it fails to compile if this schema ever
 * accepts a shape `PolicySelector` doesn't.
 */
export const policySelectorSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('name'), value: z.string().min(1) }),
	z.object({ kind: z.literal('package'), value: z.string().min(1) }),
]) satisfies z.ZodType<PolicySelector>;
