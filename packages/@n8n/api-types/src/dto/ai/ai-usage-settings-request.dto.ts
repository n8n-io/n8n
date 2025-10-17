import { z } from 'zod';
import { Z } from 'zod-class';

export class AiUsageSettingsRequestDto extends Z.class({
	allowSendingActualData: z.boolean(),
}) {}
