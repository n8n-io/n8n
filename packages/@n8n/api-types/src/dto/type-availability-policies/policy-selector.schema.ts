import { z } from 'zod';

import type { PolicySelector } from './policy-rule.types';

const nameSelectorSchema = z.object({ kind: z.literal('name'), value: z.string().min(1) });
const packageSelectorSchema = z.object({ kind: z.literal('package'), value: z.string().min(1) });

/** The selectors a node type policy accepts. `satisfies` keeps it honest against the type. */
export const nodeTypePolicySelectorSchema = z.discriminatedUnion('kind', [
	nameSelectorSchema,
	packageSelectorSchema,
]) satisfies z.ZodType<PolicySelector>;

/** The selectors a credential type policy accepts. Each kind owns its list. */
export const credentialTypePolicySelectorSchema = z.discriminatedUnion('kind', [
	nameSelectorSchema,
	packageSelectorSchema,
]) satisfies z.ZodType<PolicySelector>;
