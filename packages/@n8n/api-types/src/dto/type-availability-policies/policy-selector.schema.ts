import { z } from 'zod';

import type { NodeTypePolicySelector, PolicySelector } from './policy-rule.types';

const nameSelectorSchema = z.object({ kind: z.literal('name'), value: z.string().min(1) });
const packageSelectorSchema = z.object({ kind: z.literal('package'), value: z.string().min(1) });
const extendsSelectorSchema = z
	.object({ kind: z.literal('extends'), value: z.string().min(1) })
	.describe('Matches the named credential type and every type that extends it');

/** The selectors a node type policy accepts. `satisfies` keeps it honest against the type. */
export const nodeTypePolicySelectorSchema = z.discriminatedUnion('kind', [
	nameSelectorSchema,
	packageSelectorSchema,
]) satisfies z.ZodType<NodeTypePolicySelector>;

/** The selectors a credential type policy accepts: the node type ones plus `extends`. */
export const credentialTypePolicySelectorSchema = z.discriminatedUnion('kind', [
	nameSelectorSchema,
	packageSelectorSchema,
	extendsSelectorSchema,
]) satisfies z.ZodType<PolicySelector>;
