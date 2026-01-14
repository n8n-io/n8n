import { z } from 'zod';
import { Z } from 'zod-class';

// TODO: move this file to a more specific place
export class UpdateSecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean().optional(),
	personalSpaceSharing: z.boolean().optional(),
}) {}
