import { z } from 'zod';

import { Z } from '../../zod-class';

export const redactionScopeSchema = z.enum(['manual-only', 'non-manual', 'all']);

export type RedactionScope = z.infer<typeof redactionScopeSchema>;

export class SecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean(),
	personalSpaceSharing: z.boolean(),
	publishedPersonalWorkflowsCount: z.number(),
	sharedPersonalWorkflowsCount: z.number(),
	sharedPersonalCredentialsCount: z.number(),
	managedByEnv: z.boolean(),
	redactionEnforced: z.boolean(),
	redactionScope: redactionScopeSchema,
}) {}

export class UpdateSecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean().optional(),
	personalSpaceSharing: z.boolean().optional(),
	redactionEnforced: z.boolean().optional(),
	redactionScope: redactionScopeSchema.optional(),
}) {}
