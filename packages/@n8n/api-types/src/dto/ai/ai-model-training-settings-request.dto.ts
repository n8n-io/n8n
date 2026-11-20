import { z } from 'zod';

import { Z } from '../../zod-class';

export class AiModelTrainingSettingsRequestDto extends Z.class({
	allowModelTraining: z.boolean(),
}) {}
