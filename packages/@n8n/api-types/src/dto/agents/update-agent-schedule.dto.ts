import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateAgentScheduleDto extends Z.class({
	cronExpression: z.string(),
	wakeUpPrompt: z.string().optional(),
}) {}
