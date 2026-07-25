import { z } from 'zod';

/**
 * A credential the resolver attached to a node without an explicit id in the
 * source. Either a stored credential (real `id`) or an n8n Connect–managed one
 * (`id: null` gated by `__aiGatewayManaged: true` so a bare null is never valid).
 *
 * Lives in its own leaf module (zod only) so both `resolve-credentials` and
 * `workflow-loop-state` can share it without forming an import cycle.
 */
export const resolvedCredentialSchema = z.union([
	z.object({
		/** Credential type key on the node, e.g. "openAiApi". */
		type: z.string(),
		id: z.string(),
		name: z.string(),
	}),
	z.object({
		type: z.string(),
		id: z.null(),
		name: z.string(),
		__aiGatewayManaged: z.literal(true),
	}),
]);

export type ResolvedCredential = z.infer<typeof resolvedCredentialSchema>;
