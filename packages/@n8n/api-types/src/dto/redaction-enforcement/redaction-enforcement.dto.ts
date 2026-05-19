import { z } from 'zod';

import { Z } from '../../zod-class';

export const redactionScopeSchema = z.enum(['manual-only', 'non-manual', 'all']);

export type RedactionScope = z.infer<typeof redactionScopeSchema>;

export class RedactionEnforcementDto extends Z.class({
	redactionEnforced: z.boolean(),
	redactionScope: redactionScopeSchema,
}) {}

export class UpdateRedactionEnforcementDto extends Z.class({
	redactionEnforced: z.boolean().optional(),
	redactionScope: redactionScopeSchema.optional(),
}) {}
