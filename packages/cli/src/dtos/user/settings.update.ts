import { z } from 'zod';
import { Z } from 'zod-class';

export class SettingsUpdateDTO extends Z.class({
	userActivated: z.boolean().optional(),
	allowSSOManualLogin: z.boolean().optional(),
}) {}
