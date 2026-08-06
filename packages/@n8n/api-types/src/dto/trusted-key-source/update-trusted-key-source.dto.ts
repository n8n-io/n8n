import { trustedKeySourcePolicySchema } from '../../schemas/trusted-key-source.schema';
import { Z } from '../../zod-class';

/**
 * Replaces a source's admin policy wholesale — an override is cleared by
 * omitting it, since absent already means "use the derived value". Only the
 * policy is writable: the rest of a source is derived from its discovery
 * document or `N8N_TRUSTED_KEYS` and would be overwritten on the next refresh.
 */
export class UpdateTrustedKeySourceDto extends Z.class({
	policy: trustedKeySourcePolicySchema,
}) {}
