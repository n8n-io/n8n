import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExternalTaskDto extends Z.class({
	url: z.string().url().max(2048),
	apiKey: z.string().max(512).optional(),
	prompt: z.string().min(1).max(10_000),
	registrationId: z.string().max(36).optional(),
}) {}
