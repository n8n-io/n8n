import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateSecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean(),
}) {}
