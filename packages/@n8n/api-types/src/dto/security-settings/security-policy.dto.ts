import { z } from 'zod';

import { redactionFloorSchema, type RedactionFloor } from '../../redaction-enforcement-floor';
import { Z } from '../../zod-class';

const redactionEnforcementFieldSchema = z.object({
	floor: redactionFloorSchema,
});

/**
 * Public API PUT body for the security policy group. Clients must send the full
 * writable configuration; partial updates are rejected. Mirrors the writable
 * subset of the internal security settings, validated with the same field
 * schemas so behaviour stays in sync.
 */
export class UpdateSecurityPolicyDto extends Z.class({
	personalSpacePublishing: z.boolean(),
	personalSpaceSharing: z.boolean(),
	redactionEnforcement: redactionEnforcementFieldSchema,
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
