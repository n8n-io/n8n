import { runtimeCredentialAllowedDomainsSchema } from '@n8n/api-types';
import { z } from 'zod';

/** `bearer` removes a `Bearer ` prefix and sets the OAuth2 access token. `field:<name>` copies the value to one field. */
export const credentialTransformSchema = z.union([
	z.literal('bearer'),
	z.string().regex(/^field:[A-Za-z0-9_]+$/),
]);

export type CredentialTransform = z.infer<typeof credentialTransformSchema>;

export const valueLookupPathSchema = z
	.object({
		nodeType: z.string().min(1),
		path: z.string().min(1),
		/** Credential type that receives the value, for example `gmailOAuth2Api`. */
		credentialType: z.string().min(1).optional(),
		/** Defaults to `bearer`. Only valid together with `credentialType`. */
		transform: credentialTransformSchema.optional(),
		/**
		 * Hosts that the secret can be sent to, comma separated. `*.example.com` matches subdomains
		 * only. Absent means no restriction. Only valid together with `credentialType`.
		 */
		allowedDomains: runtimeCredentialAllowedDomainsSchema.optional(),
	})
	.refine((rule) => rule.transform === undefined || rule.credentialType !== undefined, {
		message: 'transform requires credentialType',
	})
	.refine((rule) => rule.allowedDomains === undefined || rule.credentialType !== undefined, {
		message: 'allowedDomains requires credentialType',
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
 * backends. A rule with `credentialType` also feeds credentials of that type
 * that have `isRuntime` set, and leaves a marker in the trigger output.
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
