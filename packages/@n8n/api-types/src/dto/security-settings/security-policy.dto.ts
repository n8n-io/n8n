import '../../openapi-extend';

import { z } from 'zod';

import {
	securityPolicyFieldDocs,
	securityPolicyUpdateFieldDocs,
} from './security-policy-public.openapi';
import { redactionFloorSchema } from '../../redaction-enforcement-floor';
import { Z } from '../../zod-class';

const redactionEnforcementShape = {
	floor: redactionFloorSchema.openapi(securityPolicyFieldDocs.redactionEnforcementFloor),
};

const redactionEnforcementPublicSchema = z
	.object(redactionEnforcementShape)
	.openapi({ additionalProperties: false });

const redactionEnforcementUpdateSchema = z.object(redactionEnforcementShape).strict();

export const securityPolicyPublicSchema = z
	.object({
		personalSpacePublishing: z.boolean().openapi(securityPolicyFieldDocs.personalSpacePublishing),
		personalSpaceSharing: z.boolean().openapi(securityPolicyFieldDocs.personalSpaceSharing),
		publishedPersonalWorkflowsCount: z
			.number()
			.int()
			.openapi(securityPolicyFieldDocs.publishedPersonalWorkflowsCount),
		sharedPersonalWorkflowsCount: z
			.number()
			.int()
			.openapi(securityPolicyFieldDocs.sharedPersonalWorkflowsCount),
		sharedPersonalCredentialsCount: z
			.number()
			.int()
			.openapi(securityPolicyFieldDocs.sharedPersonalCredentialsCount),
		redactionEnforcement: redactionEnforcementPublicSchema,
	})
	.openapi({ additionalProperties: false });

export class SecurityPolicyPublicDto extends Z.class(securityPolicyPublicSchema.shape) {
	static schema = securityPolicyPublicSchema;
}

const usageCountUpdateSchema = z
	.number()
	.int()
	.optional()
	.openapi(securityPolicyUpdateFieldDocs.usageCount);

const updateSecurityPolicySchema = z
	.object({
		personalSpacePublishing: z
			.boolean()
			.openapi(securityPolicyUpdateFieldDocs.personalSpacePublishing),
		personalSpaceSharing: z.boolean().openapi(securityPolicyUpdateFieldDocs.personalSpaceSharing),
		redactionEnforcement: redactionEnforcementUpdateSchema,
		publishedPersonalWorkflowsCount: usageCountUpdateSchema,
		sharedPersonalWorkflowsCount: usageCountUpdateSchema,
		sharedPersonalCredentialsCount: usageCountUpdateSchema,
	})
	.strict()
	.openapi({
		description:
			'Full security policy. All writable fields must be provided; partial updates are not supported.',
	});

/**
 * Public API PUT body for the security policy group. Clients must send the full
 * writable configuration; partial updates are rejected. Mirrors the writable
 * subset of the internal security settings, validated with the same field
 * schemas so behaviour stays in sync.
 */
export class UpdateSecurityPolicyDto extends Z.class(updateSecurityPolicySchema.shape, {
	strict: true,
}) {
	static schema = updateSecurityPolicySchema;
}

export type SecurityPolicyResponse = SecurityPolicyPublicDto;
