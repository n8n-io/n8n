import { z } from 'zod';

import { Z } from '../../zod-class';

export class SecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean(),
	personalSpaceSharing: z.boolean(),
	publishedPersonalWorkflowsCount: z.number(),
	sharedPersonalWorkflowsCount: z.number(),
	sharedPersonalCredentialsCount: z.number(),
}) {}

export class UpdateSecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean().optional(),
	personalSpaceSharing: z.boolean().optional(),
}) {}
