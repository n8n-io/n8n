import { z } from 'zod';

export const valueLookupPathSchema = z.object({
	nodeType: z.string().min(1),
	path: z.string().min(1),
});

export type ValueLookupPath = z.infer<typeof valueLookupPathSchema>;

/**
 * Schema for `N8N_SECURITY_SENSITIVE_FIELD_RULES` (or its `_FILE` variant).
 *
 * Flat object keyed by a logical alias. Each rule pairs a node-type matcher
 * with a dot-path into the trigger item's `.json`. The `*` node-type
 * wildcard applies the rule to every trigger type. When a rule matches, the
 * value at `path` is removed from the trigger output and stored under the
 * alias on the secure-artifact context for later consumption by node
 * backends.
 *
 * @example
 * {
 *   "api_key": { "nodeType": "*", "path": "headers.authorization" },
 *   "form_password": {
 *     "nodeType": "n8n-nodes-base.formTrigger",
 *     "path": "body.password"
 *   }
 * }
 */
export const sensitiveFieldRulesSchema = z.record(z.string().min(1), valueLookupPathSchema);

export type SensitiveFieldRules = z.infer<typeof sensitiveFieldRulesSchema>;
