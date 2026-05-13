import { z } from 'zod';

export const redactionEnforcementSettingsSchema = z.object({
	enforced: z.boolean(),
	manual: z.boolean(),
	production: z.boolean(),
});

export type RedactionEnforcementSettings = z.infer<typeof redactionEnforcementSettingsSchema>;

export const REDACTION_ENFORCEMENT_DEFAULTS: RedactionEnforcementSettings = {
	enforced: false,
	manual: false,
	production: false,
};
