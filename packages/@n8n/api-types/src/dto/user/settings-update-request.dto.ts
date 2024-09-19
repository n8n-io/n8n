import { z } from 'zod';
import { Z } from 'zod-class';

export class SettingsUpdateRequestDTO extends Z.class({
	userActivated: z.boolean().optional(),
	allowSSOManualLogin: z.boolean().optional(),
}) {}
