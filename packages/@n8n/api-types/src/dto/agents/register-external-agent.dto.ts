import { z } from 'zod';

import { Z } from '../../zod-class';

export class RegisterExternalAgentDto extends Z.class({
	url: z.string().url().max(2048),
	apiKey: z.string().min(1).max(512),
}) {}
