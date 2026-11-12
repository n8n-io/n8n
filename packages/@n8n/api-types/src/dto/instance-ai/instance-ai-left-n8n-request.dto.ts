import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiLeftN8nRequestDto extends Z.class({
	threadId: z.string().trim().min(1).max(255),
}) {}
