import { z } from 'zod';

/**
 * Schema for `N8N_SECURITY_SENSITIVE_FIELD_RULES` (or its `_FILE` variant).
 *
 * Flat object keyed by node-type identifier. The `*` key applies to every
 * trigger type and is unioned with any type-specific entry. Each value is a
 * list of dot-paths into the trigger item's `.json` that must be stripped
 * before any node consumes the trigger output.
 *
 * @example
 * {
 *   "*": ["headers.authorization", "headers.cookie"],
 *   "n8n-nodes-base.formTrigger": ["body.password"]
 * }
 */
export const sensitiveFieldRulesSchema = z.record(z.string().min(1), z.array(z.string().min(1)));

export type SensitiveFieldRules = z.infer<typeof sensitiveFieldRulesSchema>;
