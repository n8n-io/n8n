import { z } from 'zod';
import { Z } from 'zod-class';

export class SecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean(),
}) {}

export class UpdateSecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean(),
}) {}
