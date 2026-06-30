import { z } from 'zod';

import { redactionFloorSchema } from '../../redaction-enforcement-floor';
import { Z } from '../../zod-class';

const redactionEnforcementFieldSchema = z.object({
	floor: redactionFloorSchema,
});

export class SecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean(),
	personalSpaceSharing: z.boolean(),
	publishedPersonalWorkflowsCount: z.number(),
	sharedPersonalWorkflowsCount: z.number(),
	sharedPersonalCredentialsCount: z.number(),
	managedByEnv: z.boolean(),
	redactionEnforcement: redactionEnforcementFieldSchema,
}) {}

export class UpdateSecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean().optional(),
	personalSpaceSharing: z.boolean().optional(),
	redactionEnforcement: redactionEnforcementFieldSchema.optional(),
}) {}
