import { z } from 'zod';

import { Z } from '../../zod-class';

/** An identifier, so that credentials can write `$runtimeCredentials.<alias>`. */
export const runtimeCredentialAliasSchema = z
	.string()
	.max(64)
	.regex(
		/^[a-zA-Z_][a-zA-Z0-9_]*$/,
		'Use letters, digits and underscores, and start with a letter',
	);

export const runtimeCredentialRuleSchema = z.object({
	alias: runtimeCredentialAliasSchema,
	/** A trigger node type, or `*` for every trigger. */
	nodeType: z.string().min(1).max(256),
	/** Dot path into the trigger item JSON. `[*]` after a key iterates an array. */
	path: z.string().min(1).max(256),
	description: z.string().max(256).optional(),
});

export type RuntimeCredentialRule = z.infer<typeof runtimeCredentialRuleSchema>;

/** Rules from the environment variable are read-only in the UI. */
export type RuntimeCredentialRuleSource = 'env' | 'settings';

export type RuntimeCredentialRuleWithSource = Omit<RuntimeCredentialRule, 'alias'> & {
	/** Env rules keep any alias the operator chose, so it is not always an identifier. */
	alias: string;
	source: RuntimeCredentialRuleSource;
};

export type RuntimeCredentialRulesResponse = {
	rules: RuntimeCredentialRuleWithSource[];
};

export class UpdateRuntimeCredentialRulesDto extends Z.class({
	rules: z.array(runtimeCredentialRuleSchema).max(100),
}) {}
