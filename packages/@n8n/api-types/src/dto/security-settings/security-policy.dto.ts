import { z } from 'zod';

import { redactionFloorSchema, type RedactionFloor } from '../../redaction-enforcement-floor';
import { Z } from '../../zod-class';

const redactionEnforcementFieldSchema = z.object({
	floor: redactionFloorSchema,
});

/**
 * Public API request body for updating the security policy group. Mirrors the
 * writable subset of the internal security settings, validated with the same
 * field schemas so behaviour stays in sync.
 */
export class UpdateSecurityPolicyDto extends Z.class({
	personalSpacePublishing: z.boolean().optional(),
	personalSpaceSharing: z.boolean().optional(),
	redactionEnforcement: redactionEnforcementFieldSchema.optional(),
}) {}

/**
 * Public API response shape for the security policy group.
 */
export interface SecurityPolicyResponse {
	personalSpacePublishing: boolean;
	personalSpaceSharing: boolean;
	publishedPersonalWorkflowsCount: number;
	sharedPersonalWorkflowsCount: number;
	sharedPersonalCredentialsCount: number;
	redactionEnforcement: { floor: RedactionFloor };
}
