import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateChatSettingsDto extends Z.class({
	chatAccessEnabled: z.boolean(),
}) {}
