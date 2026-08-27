import { z } from 'zod';

/**
 * One reason something was blocked by a policy check. Mirrors the shape produced by
 * `PolicyEnforcementService` on the backend (`@n8n/decorators`'s `PolicyViolation`) — kept as
 * its own schema here since `@n8n/api-types` is the FE/BE contract and doesn't depend on
 * backend-only packages.
 */
export const policyViolationSchema = z.object({
	kind: z.string(),
	checkId: z.string(),
	message: z.string(),
	subject: z.string().optional(),
	subjectType: z.string().optional(),
	scope: z.string().optional(),
	matchedRuleId: z.string().optional(),
});

export type PolicyViolation = z.infer<typeof policyViolationSchema>;
